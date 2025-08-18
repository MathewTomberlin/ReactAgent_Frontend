import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { sendChatMessage, getCacheStats, checkIsAdmin, type ChatResponse, type ApiError } from '../api/FastAPIClient';

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
  isAdmin: boolean;
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
  isAdmin: false,
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
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('online');
  const [cacheStats, setCacheStats] = useState<{ hits: number; misses: number; hitRate: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');

  // Check admin status on mount
  useEffect(() => {
    const checkAdmin = async () => {
      const adminStatus = await checkIsAdmin();
      setIsAdmin(adminStatus);
    };
    checkAdmin();
  }, []);

  // Fetch cache statistics periodically
  useEffect(() => {
    const fetchCacheStats = async () => {
      try {
        const stats = await getCacheStats();
        if (stats) {
          setCacheStats({
            hits: stats.cache_hits || 0,
            misses: stats.cache_misses || 0,
            hitRate: stats.hit_rate_percent || 0
          });
        }
      } catch (error) {
        console.log('Cache stats not available (admin only)');
      }
    };

    // Fetch immediately and then every 30 seconds
    fetchCacheStats();
    const interval = setInterval(fetchCacheStats, 30000);

    return () => clearInterval(interval);
  }, []);

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
          finishReason: response.finishReason,
          usage: response.usage ? {
            promptTokens: response.usage.promptTokens,
            completionTokens: response.usage.completionTokens,
            totalTokens: response.usage.totalTokens
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
      isAdmin,
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