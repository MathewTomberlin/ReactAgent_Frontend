import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSettings } from './SettingsContext';
import type { ReactNode } from 'react';
import { sendChatMessage, getCacheStats, checkIsAdmin, streamChat, type ChatResponse, type ApiError, getOrCreateSession, getCurrentModelStatus, isProviderBusy as isProviderBusyApi, streamModelStatus, type ModelStatus } from '../api/FastAPIClient';

interface Message {
  sender: 'user' | 'agent';
  text: string;
  category?: 'Knowledge' | 'Request' | 'Chat';
  metadata?: {
    isCached?: boolean;
    isError?: boolean;
    isIndicator?: boolean;
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
  isModelBusy: boolean;
  modelBusyText?: string;
  connectionStatus: 'online' | 'offline' | 'checking';
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
  } | null;
  isAdmin: boolean;
  sessionId: string;
  // Model loading states
  modelStatus: ModelStatus | null;
  isModelLoading: boolean;
  isModelUnloading: boolean;
  isProviderBusy: boolean;
  importMemory: (memoryToken?: string, memoryChunks?: string[]) => void;
  addUserMessage: (message: string) => void;
  sendToAgent: (text: string, settings?: { disableLongMemoryRecall?: boolean; disableAllMemoryRecall?: boolean }) => void;
  clearMessages: () => void;
  retryLastMessage: (settings?: { disableLongMemoryRecall?: boolean; disableAllMemoryRecall?: boolean }) => void;
  refreshModelStatus: () => Promise<void>;
}

const AppContext = createContext<AppState>({
  messages: [],
  isLoading: false,
  isRateLimited: false,
  rateLimitCooldown: 0,
  isModelBusy: false,
  modelBusyText: undefined,
  connectionStatus: 'checking',
  cacheStats: null,
  isAdmin: false,
  sessionId: '',
  modelStatus: null,
  isModelLoading: false,
  isModelUnloading: false,
  isProviderBusy: false,
  importMemory: () => {},
  addUserMessage: () => {},
  sendToAgent: () => {},
  clearMessages: () => {},
  retryLastMessage: () => {},
  refreshModelStatus: async () => {},
});

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { settings } = useSettings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [isModelBusy, setIsModelBusy] = useState(false);
  const [modelBusyText, setModelBusyText] = useState<string | undefined>(undefined);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('online');
  const [cacheStats, setCacheStats] = useState<{ hits: number; misses: number; hitRate: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  // Model loading states
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelUnloading, setIsModelUnloading] = useState(false);
  const [isProviderBusy, setIsProviderBusy] = useState(false);

  // Check admin status on mount
  useEffect(() => {
    // ensure we have a session early to scope memory storage
    (async () => {
      try { const s = await getOrCreateSession(); setSessionId(s.sessionId); } catch {}
    })();
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

  // Helper to set busy state with optional auto-clear
  const setBusy = useCallback((busy: boolean, text?: string) => {
    setIsModelBusy(busy);
    setModelBusyText(text);
    if (busy) {
      // Auto-clear after a short period, unless cleared earlier by a response
      const t = setTimeout(() => {
        setIsModelBusy(false);
        setModelBusyText(undefined);
      }, 3000);
      return () => clearTimeout(t);
    }
    return () => {};
  }, []);

  // Refresh model status from backend
  const refreshModelStatus = useCallback(async () => {
    try {
      const providerId = localStorage.getItem('currentProviderId') || 'gemini';

      if (providerId === 'ollama') {
        const status = await getCurrentModelStatus();
        setModelStatus(status);
        setIsModelLoading(status.state === 'LOADING');
        setIsModelUnloading(status.state === 'UNLOADING');

        // Check if Ollama provider is busy
        const busy = await isProviderBusyApi(providerId);
        setIsProviderBusy(busy);
      } else {
        // For non-Ollama providers, set default state
        setModelStatus({
          providerId,
          modelId: localStorage.getItem('currentModelId') || 'gemini-1.5-flash',
          state: 'IDLE',
          message: 'Model is ready',
          timestamp: Date.now()
        });
        setIsModelLoading(false);
        setIsModelUnloading(false);
        setIsProviderBusy(false);
      }
    } catch (error) {
      console.error('Failed to refresh model status:', error);
      // Set default idle state on error
      const providerId = localStorage.getItem('currentProviderId') || 'gemini';
      setModelStatus({
        providerId,
        modelId: localStorage.getItem('currentModelId') || 'gemini-1.5-flash',
        state: 'IDLE',
        message: 'Model is ready',
        timestamp: Date.now()
      });
      setIsModelLoading(false);
      setIsModelUnloading(false);
      setIsProviderBusy(false);
    }
  }, []);

  // Stream model status using SSE - replaces polling
  useEffect(() => {
    let closeStream: (() => void) | null = null;

    const setupStreaming = () => {
      // Close existing stream
      if (closeStream) {
        closeStream();
        closeStream = null;
      }

      const providerId = localStorage.getItem('currentProviderId');
      const modelId = localStorage.getItem('currentModelId') || 'gemini-1.5-flash';

      if (!providerId) {
        return;
      }

      let finalModelId = modelId;
      // For Ollama, use a default model if none is set
      if (providerId === 'ollama' && (!modelId || modelId.startsWith('gemini'))) {
        finalModelId = 'llama2'; // Default Ollama model
      }

      // For Ollama, use SSE streaming for real-time updates
      if (providerId === 'ollama') {
        closeStream = streamModelStatus(providerId, finalModelId,
          (status) => {
            setModelStatus(status);
            setIsModelLoading(status.state === 'LOADING');
            setIsModelUnloading(status.state === 'UNLOADING');
          },
          (error) => {
            console.error('Model status stream error:', error);
            // Fallback to polling if SSE fails
            setTimeout(setupPollingFallback, 5000);
          }
        );
      } else {
        // For non-Ollama providers, use simple polling with longer intervals
        setupPollingFallback();
      }
    };

    const setupPollingFallback = () => {
      // Close SSE stream if active
      if (closeStream) {
        closeStream();
        closeStream = null;
      }

      const pollStatus = async () => {
        const providerId = localStorage.getItem('currentProviderId');
        if (!providerId) return;

        try {
          // For non-Ollama providers, just update with idle state to avoid API calls
          if (providerId !== 'ollama') {
            setModelStatus({
              providerId,
              modelId: localStorage.getItem('currentModelId') || 'gemini-1.5-flash',
              state: 'IDLE',
              message: 'Model is ready',
              timestamp: Date.now()
            });
            setIsModelLoading(false);
            setIsModelUnloading(false);
            setIsProviderBusy(false);
            return;
          }

          // For Ollama, use the optimized refreshModelStatus that makes fewer calls
          await refreshModelStatus();
        } catch (error) {
          console.error('Polling fallback error:', error);
        }
      };

      pollStatus(); // Initial check

      // Poll every 10 seconds for non-Ollama providers, 5 seconds for Ollama
      const providerId = localStorage.getItem('currentProviderId');
      const pollInterval = providerId === 'ollama' ? 5000 : 10000;

      const interval = setInterval(pollStatus, pollInterval);

      // Store cleanup function
      closeStream = () => clearInterval(interval);
    };

    setupStreaming();

    // Listen for provider changes to restart streaming
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentProviderId' || e.key === 'currentModelId') {
        setupStreaming();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (closeStream) {
        closeStream();
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshModelStatus]);

  // Rate limit countdown timer
  const startRateLimitCooldown = useCallback(() => {
    // If using a local provider (Ollama), do not apply frontend cooldown
    try {
      const prov = localStorage.getItem('currentProviderId');
      if (prov && prov.toLowerCase() === 'ollama') {
        setIsRateLimited(false);
        setRateLimitCooldown(0);
        return;
      }
    } catch {}

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

  const sendToAgent = async (text: string, options?: { disableLongMemoryRecall?: boolean; disableAllMemoryRecall?: boolean }) => {
    // Prevent sending if model is currently loading/unloading
    if (isModelLoading || isModelUnloading || isProviderBusy) {
      console.log('Cannot send message: Model is currently loading/unloading');
      return;
    }

    // Allow sending even if rate limited when local provider is selected
    if (isRateLimited) {
      try {
        const prov = localStorage.getItem('currentProviderId');
        if (!prov || prov.toLowerCase() !== 'ollama') {
          return; // Don't send if rate limited for remote providers
        }
      } catch {
        return;
      }
    }

    addUserMessage(text);
    setIsLoading(true);

    try {
      // Prefer SSE for realtime agent status; fallback to REST on error
      let done = false;
      let indicatorTimer: number | undefined;
      let indicatorShown = false;
      let indicatorShownAt = 0;

      // load memory for this session (unless all memory is disabled)
      const memKey = `mem:${sessionId}`;
      const raw = localStorage.getItem(memKey);
      let memory: { token?: string; chunks?: string[] } | undefined;
      if (raw && !(options?.disableAllMemoryRecall)) {
        try {
          memory = JSON.parse(raw);
        } catch {}
      }

      const close = streamChat({
        message: text,
        memoryToken: memory?.token,
        disableLongMemoryRecall: options?.disableLongMemoryRecall,
        disableAllMemoryRecall: options?.disableAllMemoryRecall,
        systemPrompt: (settings.systemPrompt && settings.systemPrompt.trim().length > 0) ? settings.systemPrompt : undefined
      }, (evt) => {
        if (evt.type === 'agent') {
          const statusText = evt.data?.message || 'Processing...';
          if (!indicatorShown && indicatorTimer === undefined) {
            indicatorTimer = window.setTimeout(() => {
              setMessages(prev => {
                const withoutTrailingStatus = prev.filter(m => !(m.sender === 'agent' && m.text.startsWith('Agent ')));
                return [...withoutTrailingStatus, { sender: 'agent', text: `Agent ${statusText.toLowerCase()}`, metadata: { timestamp: new Date(), isIndicator: true } }];
              });
              indicatorShown = true;
              indicatorShownAt = Date.now();
              indicatorTimer = undefined;
            }, 300);
          } else if (indicatorShown) {
            // Update existing indicator text
            setMessages(prev => {
              if (!prev.length) return prev;
              const last = prev[prev.length - 1];
              if (last.sender === 'agent' && last.text.startsWith('Agent ') && last.metadata?.isIndicator) {
                const updated = [...prev];
                updated[updated.length - 1] = { ...last, text: `Agent ${statusText.toLowerCase()}` } as any;
                return updated;
              }
              return prev;
            });
          }
        } else if (evt.type === 'answer') {
          done = true;
          // Clear busy on successful answer
          setBusy(false);
          const resp = evt.data as ChatResponse;
          const agentMessage: Message = {
            sender: 'agent',
            text: resp.message,
            category: resp.category,
            metadata: {
              isCached: resp.cached === true,
              model: resp.model,
              finishReason: resp.finishReason,
              usage: resp.usage ? {
                promptTokens: resp.usage.promptTokens,
                completionTokens: resp.usage.completionTokens,
                totalTokens: resp.usage.totalTokens
              } : undefined,
              timestamp: new Date()
            }
          };
          if (indicatorTimer !== undefined) {
            clearTimeout(indicatorTimer);
            indicatorTimer = undefined;
          }
          const replaceFinal = () => setMessages(prev => {
            if (prev.length && prev[prev.length - 1].sender === 'agent' && prev[prev.length - 1].text.startsWith('Agent ') && prev[prev.length - 1].metadata?.isIndicator) {
              return [...prev.slice(0, -1), agentMessage];
            }
            return [...prev, agentMessage];
          });
          const elapsed = indicatorShown ? (Date.now() - indicatorShownAt) : 0;
          const minVisible = 450;
          if (indicatorShown && elapsed < minVisible) {
            setTimeout(replaceFinal, minVisible - elapsed);
          } else {
            replaceFinal();
          }
          setConnectionStatus('online');
          setIsLoading(false);
          if (!resp.cached) {
            startRateLimitCooldown();
          }
          // capture memory token if present
          const meta = (resp as any).metadata || {};
          if (meta.memoryToken || meta.memoryChunks) {
            const m = { token: meta.memoryToken, chunks: meta.memoryChunks };
            localStorage.setItem(memKey, JSON.stringify(m));
          }
        } else if (evt.type === 'error') {
          // Mark done; handle rate limit or generic error; do not fallback
          done = true;
          const msg: string = (evt.data && evt.data.message) ? String(evt.data.message) : 'Error occurred';
          if (indicatorTimer !== undefined) {
            clearTimeout(indicatorTimer);
            indicatorTimer = undefined;
          }
          const prov = ((): string | null => { try { return localStorage.getItem('currentProviderId'); } catch { return null; }})();
          if (msg.toLowerCase().includes('rate limit') && prov && prov.toLowerCase() === 'ollama') {
            setBusy(true, 'Model is busy (loading/unloading). Please wait...');
            setConnectionStatus('online');
          } else if (msg.toLowerCase().includes('rate limit')) {
            startRateLimitCooldown();
            const rateMsg: Message = {
              sender: 'agent',
              text: 'Rate limit exceeded. Please wait before sending another message.',
              metadata: { timestamp: new Date(), isError: true }
            };
            setMessages(prev => prev.length ? [...prev.slice(0, -1), rateMsg] : [rateMsg]);
            setConnectionStatus('online');
          } else {
            // Print provider/OpenAI/Anthropic error message as its own chat message
            const errorMsg: Message = {
              sender: 'agent',
              text: msg,
              metadata: { timestamp: new Date(), isError: true }
            };
            setMessages(prev => prev.length ? [...prev.slice(0, -1), errorMsg] : [errorMsg]);
          }
          setIsLoading(false);
        }
      });

      // Safety timeout in case stream stalls
      setTimeout(async () => {
        if (!done) {
          try {
            const response: ChatResponse = await sendChatMessage({
              message: text,
              sessionId,
              memoryToken: memory?.token,
              memoryChunks: memory?.chunks,
              disableLongMemoryRecall: options?.disableLongMemoryRecall,
              disableAllMemoryRecall: options?.disableAllMemoryRecall,
              systemPrompt: (settings.systemPrompt && settings.systemPrompt.trim().length > 0) ? settings.systemPrompt : undefined
            });
            const agentMessage: Message = {
              sender: 'agent',
              text: response.message,
              category: response.category,
              metadata: {
                isCached: response.cached === true,
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
            setMessages(prev => prev.length && prev[prev.length - 1].text.startsWith('Agent ') ? [...prev.slice(0, -1), agentMessage] : [...prev, agentMessage]);
            setConnectionStatus('online');
            setBusy(false); // Clear busy on successful response
            setIsLoading(false);
            try {
              const prov = localStorage.getItem('currentProviderId');
              if (!response.cached && (!prov || prov.toLowerCase() !== 'ollama')) {
                startRateLimitCooldown();
              }
            } catch {}
            const meta = (response as any).metadata || {};
            if (meta.memoryToken || meta.memoryChunks) {
              const m = { token: meta.memoryToken, chunks: meta.memoryChunks };
              localStorage.setItem(memKey, JSON.stringify(m));
            }
          } catch (e) {
            // handled by outer catch
          } finally {
            close();
          }
        }
      }, 8000);

    } catch (error: any) {
      const apiError = error as ApiError;
      
      if (apiError.isRateLimited) {
        try {
          const prov = localStorage.getItem('currentProviderId');
          if (prov && prov.toLowerCase() === 'ollama') {
            setBusy(true, 'Model is busy (loading/unloading). Please wait...');
            setIsLoading(false);
            return;
          }
        } catch {}
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
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setLastUserMessage('');
  };

  const retryLastMessage = (settings?: { disableLongMemoryRecall?: boolean; disableAllMemoryRecall?: boolean }) => {
    if (lastUserMessage && !isLoading && !isRateLimited) {
      // Remove the last user and agent messages
      setMessages(prev => prev.slice(0, -2));
      // Retry the last message
      sendToAgent(lastUserMessage, settings);
    }
  };

  const importMemory = (memoryToken?: string, memoryChunks?: string[]) => {
    const memKey = `mem:${sessionId}`;
    if (memoryToken || memoryChunks) {
      const memoryData = { token: memoryToken, chunks: memoryChunks };
      localStorage.setItem(memKey, JSON.stringify(memoryData));
    } else {
      localStorage.removeItem(memKey);
    }
  };

  return (
    <AppContext.Provider     value={{
      messages,
      isLoading,
      isRateLimited,
      rateLimitCooldown,
      isModelBusy,
      modelBusyText,
      connectionStatus,
      cacheStats,
      isAdmin,
      sessionId,
      modelStatus,
      isModelLoading,
      isModelUnloading,
      isProviderBusy,
      importMemory,
      addUserMessage,
      sendToAgent,
      clearMessages,
      retryLastMessage,
      refreshModelStatus
    }}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook for consuming the context
export const useAppContext = () => useContext(AppContext);