import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { sendChatMessage, sendMessage, type ChatResponse, type ApiError } from '../api/FastAPIClient';

interface Message {
  sender: 'user' | 'agent';
  text: string;
  metadata?: {
    isCached?: boolean;
    model?: string;
    finishReason?: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    timestamp: Date;
  };
}

interface AppState {
  messages: Message[];
  isLoading: boolean;
  isRateLimited: boolean;
  rateLimitCooldown: number; // seconds remaining
  connectionStatus: 'online' | 'offline' | 'checking';
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
  } | null;
  addUserMessage: (message: string) => void;
  sendToAgent: (text: string) => void;
  clearMessages: () => void;
  retryLastMessage: () => void;
}

const AppContext = createContext<AppState>({
  messages: [],
  isLoading: false,
  isRateLimited: false,
  rateLimitCooldown: 0,
  connectionStatus: 'checking',
  cacheStats: null,
  addUserMessage: () => {},
  sendToAgent: () => {},
  clearMessages: () => {},
  retryLastMessage: () => {},
});

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [cacheStats, setCacheStats] = useState<{ hits: number; misses: number; hitRate: number } | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');

  // Rate limit countdown timer
  const startRateLimitCooldown = useCallback(() => {
    setIsRateLimited(true);
    setRateLimitCooldown(60); // 60 seconds
    
    const interval = setInterval(() => {
      setRateLimitCooldown(prev => {
        if (prev <= 1) {
          setIsRateLimited(false);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const addUserMessage = (text: string) => {
    const newMessage: Message = {
      sender: "user",
      text,
      metadata: {
        timestamp: new Date()
      }
    };
    setMessages(prev => [...prev, newMessage]);
    setLastUserMessage(text);
  };

  const sendToAgent = async (text: string) => {
    if (isRateLimited) {
      return; // Don't send if rate limited
    }

    addUserMessage(text);
    setIsLoading(true);
    
    try {
      // Use the new chat endpoint
      const response: ChatResponse = await sendChatMessage({ message: text });
      
      const agentMessage: Message = {
        sender: "agent",
        text: response.message,
        metadata: {
          model: response.model,
          finishReason: response.finish_reason,
          usage: response.usage ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens
          } : undefined,
          timestamp: new Date()
        }
      };
      
      setMessages(prev => [...prev, agentMessage]);
      setConnectionStatus('online');
      
    } catch (error: any) {
      const apiError = error as ApiError;
      
      if (apiError.isRateLimited) {
        startRateLimitCooldown();
        setMessages(prev => [...prev, {
          sender: "agent",
          text: "Rate limit exceeded. Please wait before sending another message.",
          metadata: {
            timestamp: new Date()
          }
        }]);
      } else if (apiError.isNetworkError) {
        setConnectionStatus('offline');
        setMessages(prev => [...prev, {
          sender: "agent",
          text: "Connection error. Please check your internet connection and try again.",
          metadata: {
            timestamp: new Date()
          }
        }]);
      } else {
        setMessages(prev => [...prev, {
          sender: "agent",
          text: apiError.message || "Sorry, I encountered an error. Please try again.",
          metadata: {
            timestamp: new Date()
          }
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setLastUserMessage('');
  };

  const retryLastMessage = () => {
    if (lastUserMessage && !isLoading && !isRateLimited) {
      // Remove the last user and agent messages
      setMessages(prev => prev.slice(0, -2));
      // Retry the last message
      sendToAgent(lastUserMessage);
    }
  };

  return (
    <AppContext.Provider value={{
      messages,
      isLoading,
      isRateLimited,
      rateLimitCooldown,
      connectionStatus,
      cacheStats,
      addUserMessage,
      sendToAgent,
      clearMessages,
      retryLastMessage
    }}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook for consuming the context
export const useAppContext = () => useContext(AppContext);