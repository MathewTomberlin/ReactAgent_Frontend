import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useSettings } from './SettingsContext';
import { sendChatMessage, checkIsAdmin, streamChat, type ChatResponse, type ApiError, getOrCreateSession, getCurrentModelStatus, isProviderBusy as isProviderBusyApi, isBuiltInProviderBusy as isBuiltInProviderBusyApi, streamModelStatus, type ModelStatus } from '../api/FastAPIClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    cached?: boolean;
    model?: string;
    provider?: string;
    temperature?: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    isIndicator?: boolean;
    isError?: boolean;
    finishReason?: string;
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
  isAdmin: boolean;
  sessionId: string;
  // Model loading states
  modelStatus: ModelStatus | null;
  isModelLoading: boolean;
  isModelUnloading: boolean;
  isProviderBusy: boolean;
  isBuiltInProviderBusy: boolean; // New state for Built-In provider global rate limiting
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
  isAdmin: false,
  sessionId: '',
  modelStatus: null,
  isModelLoading: false,
  isModelUnloading: false,
  isProviderBusy: false,
  isBuiltInProviderBusy: false,
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  // Model loading states
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelUnloading, setIsModelUnloading] = useState(false);
  const [isProviderBusy, setIsProviderBusy] = useState(false);
  const [isBuiltInProviderBusy, setIsBuiltInProviderBusy] = useState(false); // New state for Built-In provider global rate limiting

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

  // Check Built-In provider busy status periodically
  useEffect(() => {
    const checkBuiltInProviderStatus = async () => {
      try {
        const providerId = localStorage.getItem('currentProviderId') || 'gemini';
        if (providerId === 'gemini') {
          const builtInStatus = await isBuiltInProviderBusyApi();
          setIsBuiltInProviderBusy(builtInStatus.is_busy);
        } else {
          setIsBuiltInProviderBusy(false);
        }
      } catch (error) {
        console.error('Failed to check Built-In provider status:', error);
        setIsBuiltInProviderBusy(false);
      }
    };

    // Check immediately and then every 30 seconds (reduced from 10 seconds for more responsive updates)
    checkBuiltInProviderStatus();
    const interval = setInterval(checkBuiltInProviderStatus, 30000);

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
        setIsBuiltInProviderBusy(false); // Not applicable for Ollama
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
        
        // Check if Built-In provider is busy due to global rate limiting
        if (providerId === 'gemini') {
          try {
            const builtInStatus = await isBuiltInProviderBusyApi();
            setIsBuiltInProviderBusy(builtInStatus.is_busy);
          } catch (error) {
            console.error('Failed to check Built-In provider busy status:', error);
            setIsBuiltInProviderBusy(false);
          }
        } else {
          setIsBuiltInProviderBusy(false);
        }
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
      setIsBuiltInProviderBusy(false);
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

      // Poll every 15 seconds for non-Ollama providers, 10 seconds for Ollama (reduced from 10/5 seconds)
      const providerId = localStorage.getItem('currentProviderId');
      const pollInterval = providerId === 'ollama' ? 10000 : 15000;

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
      id: Date.now().toString(), // Simple ID
      role: "user",
      content: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    setLastUserMessage(text);
  };

  const sendingRef = useRef<boolean>(false);
  const activeRequestRef = useRef<string | null>(null); // Track active request by message content
  
  const sendToAgent = async (text: string, options?: { disableLongMemoryRecall?: boolean; disableAllMemoryRecall?: boolean }) => {
    if (sendingRef.current) {
      return; // guard against double send due to rapid events
    }
    
    // Check if this exact message is already being processed
    if (activeRequestRef.current === text) {
      console.log('Request already in progress for this message, skipping duplicate');
      return;
    }
    
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
    sendingRef.current = true;
    activeRequestRef.current = text; // Track this request

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
        systemPrompt: ((): string | undefined => {
          const sys = (settings.systemPrompt && settings.systemPrompt.trim().length > 0) ? settings.systemPrompt.trim() : '';
          const ch = (settings.characterPrompt && settings.characterPrompt.trim().length > 0) ? settings.characterPrompt.trim() : '';
          if (sys && ch) return `${sys}\n\n${ch}`;
          if (sys) return sys;
          if (ch) return ch; // if only character prompt is set, still pass as system to keep ordering first
          return undefined;
        })(),
        unloadAfterCall: settings.unloadAfterCall
      }, (evt) => {
        if (evt.type === 'agent') {
          const statusText = evt.data?.message || 'Processing...';
          if (!indicatorShown && indicatorTimer === undefined) {
            indicatorTimer = window.setTimeout(() => {
              setMessages(prev => {
                const withoutTrailingStatus = prev.filter(m => !(m.role === 'assistant' && m.content.startsWith('Agent ')));
                return [...withoutTrailingStatus, { id: Date.now().toString(), role: 'assistant', content: `Agent ${statusText.toLowerCase()}`, timestamp: new Date(), metadata: { isIndicator: true } }];
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
              if (last.role === 'assistant' && last.content.startsWith('Agent ') && last.metadata?.isIndicator) {
                const updated = [...prev];
                updated[updated.length - 1] = { ...last, content: `Agent ${statusText.toLowerCase()}` } as any;
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
            id: Date.now().toString(), // Simple ID
            role: "assistant",
            content: resp.message,
            timestamp: new Date(),
            metadata: {
              cached: resp.cached === true,
              model: resp.model,
              finishReason: resp.finishReason,
              promptTokens: resp.usage?.promptTokens,
              completionTokens: resp.usage?.completionTokens,
              totalTokens: resp.usage?.totalTokens,
            }
          };
          if (indicatorTimer !== undefined) {
            clearTimeout(indicatorTimer);
            indicatorTimer = undefined;
          }
          const replaceFinal = () => setMessages(prev => {
            if (prev.length && prev[prev.length - 1].role === 'assistant' && prev[prev.length - 1].content.startsWith('Agent ') && prev[prev.length - 1].metadata?.isIndicator) {
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
          sendingRef.current = false;
          activeRequestRef.current = null; // Clear active request
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
          const isConnectionError = evt.data && evt.data.isConnectionError;
          
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
              id: Date.now().toString(), // Simple ID
              role: "assistant",
              content: 'Rate limit exceeded. Please wait before sending another message.',
              timestamp: new Date(),
              metadata: { isError: true }
            };
            setMessages(prev => prev.length ? [...prev.slice(0, -1), rateMsg] : [rateMsg]);
            setConnectionStatus('online');
          } else if (isConnectionError) {
            // Connection error - don't show as chat message, just update connection status
            setConnectionStatus('offline');
            console.log('SSE connection error detected, connection status set to offline');
          } else {
            // Print provider/OpenAI/Anthropic error message as its own chat message
            const errorMsg: Message = {
              id: Date.now().toString(), // Simple ID
              role: "assistant",
              content: msg,
              timestamp: new Date(),
              metadata: { isError: true }
            };
            setMessages(prev => prev.length ? [...prev.slice(0, -1), errorMsg] : [errorMsg]);
          }
          setIsLoading(false);
          sendingRef.current = false;
          activeRequestRef.current = null; // Clear active request
        }
      });

      // Get provider-specific timeout
      const getTimeoutForProvider = (providerId: string) => {
        switch (providerId.toLowerCase()) {
          case 'ollama': return 30000; // 30 seconds for local models (loading/unloading)
          case 'gemini': return 15000; // 15 seconds for remote providers
          default: return 20000; // 20 seconds default
        }
      };
      
      const providerId = localStorage.getItem('currentProviderId') || 'gemini';
      const timeoutMs = getTimeoutForProvider(providerId);
      
      // Safety timeout in case stream stalls - but only if no response received
      setTimeout(async () => {
        if (!done && activeRequestRef.current === text) { // Only proceed if this is still the active request
          try {
            console.log(`SSE stream timed out after ${timeoutMs}ms, falling back to REST request`);
            const response: ChatResponse = await sendChatMessage({
              message: text,
              sessionId,
              memoryToken: memory?.token,
              memoryChunks: memory?.chunks,
              disableLongMemoryRecall: options?.disableLongMemoryRecall,
              disableAllMemoryRecall: options?.disableAllMemoryRecall,
              systemPrompt: ((): string | undefined => {
                const sys = (settings.systemPrompt && settings.systemPrompt.trim().length > 0) ? settings.systemPrompt.trim() : '';
                const ch = (settings.characterPrompt && settings.characterPrompt.trim().length > 0) ? settings.characterPrompt.trim() : '';
                if (sys && ch) return `${sys}\n\n${ch}`;
                if (sys) return sys;
                if (ch) return ch;
                return undefined;
              })()
            });
            const agentMessage: Message = {
              id: Date.now().toString(), // Simple ID
              role: "assistant",
              content: response.message,
              timestamp: new Date(),
              metadata: {
                cached: response.cached === true,
                model: response.model,
                finishReason: response.finishReason,
                promptTokens: response.usage?.promptTokens,
                completionTokens: response.usage?.completionTokens,
                totalTokens: response.usage?.totalTokens,
              }
            };
            setMessages(prev => prev.length && prev[prev.length - 1].content.startsWith('Agent ') ? [...prev.slice(0, -1), agentMessage] : [...prev, agentMessage]);
            setConnectionStatus('online');
            setBusy(false); // Clear busy on successful response
            setIsLoading(false);
            activeRequestRef.current = null; // Clear active request
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
      }, timeoutMs);

    } catch (error: any) {
      const apiError = error as ApiError;
      
      if (apiError.isRateLimited) {
        try {
          const prov = localStorage.getItem('currentProviderId');
          if (prov && prov.toLowerCase() === 'ollama') {
            setBusy(true, 'Model is busy (loading/unloading). Please wait...');
            setIsLoading(false);
            activeRequestRef.current = null; // Clear active request
            return;
          }
        } catch {}
        startRateLimitCooldown();
        setMessages(prev => [...prev, {
          id: Date.now().toString(), // Simple ID
          role: "assistant",
          content: "Rate limit exceeded. Please wait before sending another message.",
          timestamp: new Date(),
          metadata: { isError: true }
        }]);
      } else if (apiError.isNetworkError) {
        setConnectionStatus('offline');
        setMessages(prev => [...prev, {
          id: Date.now().toString(), // Simple ID
          role: "assistant",
          content: "Connection error. Please check your internet connection and try again.",
          timestamp: new Date(),
          metadata: { isError: true }
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(), // Simple ID
          role: "assistant",
          content: apiError.message || "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
          metadata: { isError: true }
        }]);
      }
      setIsLoading(false);
      sendingRef.current = false;
      activeRequestRef.current = null; // Clear active request
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
      isAdmin,
      sessionId,
      modelStatus,
      isModelLoading,
      isModelUnloading,
      isProviderBusy,
      isBuiltInProviderBusy,
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