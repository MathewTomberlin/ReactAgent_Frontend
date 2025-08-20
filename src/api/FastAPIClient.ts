import axios, { AxiosError } from "axios";

// Function to get the correct API base URL
const getApiBaseUrl = (): string => {
  // If environment variable is set, use it
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  
  // If running on localhost (development), use localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return "http://localhost:8080";
  }
  
  // If accessed from mobile/other device, use the same hostname as the frontend
  // but with port 8080 for the backend
  return `http://${window.location.hostname}:8080`;
};

const BASE_URL = getApiBaseUrl();
const getClientId = (): string => {
  const key = 'reactagent_client_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, id);
  }
  return id;
};

// Debug logging for API URL detection
console.log('Frontend URL:', window.location.href);
console.log('Frontend hostname:', window.location.hostname);
console.log('API Base URL:', BASE_URL);

// TypeScript interfaces for the new API response format
export interface ChatResponse {
  message: string;
  model?: string;
  category?: 'Knowledge' | 'Request' | 'Chat';
  cached?: boolean;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface MessageRequest {
  message: string;
  model?: string;
  temperature?: number;
  session_id?: string;
  sessionId?: string;
  memoryToken?: string;
  memoryChunks?: string[];
  disableLongMemoryRecall?: boolean;
  disableAllMemoryRecall?: boolean;
}

export interface ApiError {
  message: string;
  status?: number;
  isRateLimited?: boolean;
  isNetworkError?: boolean;
}

// Model status interfaces
export interface ModelStatus {
  providerId: string;
  modelId: string;
  state: 'IDLE' | 'LOADING' | 'UNLOADING' | 'LOADED' | 'ERROR';
  message: string;
  timestamp: number;
}

// Enhanced API client with better error handling
export const sendChatMessage = async (request: MessageRequest): Promise<ChatResponse> => {
  try {
    console.log('Sending chat message to:', `${BASE_URL}/chat`);
    const { data } = await axios.post<ChatResponse>(`${BASE_URL}/chat`, request, { headers: { 'X-Client-Id': getClientId(), ...(request.memoryToken ? { 'X-Memory-Token': request.memoryToken } : {}) } });
    return data;
  } catch (error) {
    const axiosError = error as AxiosError;
    
    // Handle rate limiting
    if (axiosError.response?.status === 429) {
      const errorData = axiosError.response.data as any;
      try {
        const prov = localStorage.getItem('currentProviderId');
        if (prov && prov.toLowerCase() === 'ollama') {
          // For local providers, do not propagate rate limit as an error; treat as a normal response
          return {
            message: (errorData?.message as string) || 'Model busy, please try again.',
            cached: false,
          } as ChatResponse;
        }
      } catch {}
      throw {
        message: errorData?.message || "Rate limit exceeded. Please wait before sending another message.",
        status: 429,
        isRateLimited: true
      } as ApiError;
    }
    
    // Handle network errors
    if (!axiosError.response) {
      throw {
        message: "Network error. Please check your connection and try again.",
        isNetworkError: true
      } as ApiError;
    }
    
    // Handle other API errors
    const errorData = axiosError.response.data as any;
    throw {
      message: errorData?.message || "An unexpected error occurred. Please try again.",
      status: axiosError.response.status
    } as ApiError;
  }
};

// Session API
export interface SessionResponse {
  sessionId: string;
}

export const getOrCreateSession = async (): Promise<SessionResponse> => {
  const { data } = await axios.get(`${BASE_URL}/session`, { headers: { 'X-Client-Id': getClientId() } });
  // data contains fields including sessionId
  return { sessionId: (data as any).sessionId } as SessionResponse;
};

export const exportSession = async (sessionId: string, memory?: { token?: string; chunks?: string[] }) => {
  const params = new URLSearchParams({ sessionId });
  if (memory?.token) params.set('memoryToken', memory.token);
  if (memory?.chunks) params.set('memoryChunks', JSON.stringify(memory.chunks));
  const { data } = await axios.get(`${BASE_URL}/sessions/export?${params.toString()}`);
  return data;
};

export const importSession = async (memJson: any) => {
  const { data } = await axios.post(`${BASE_URL}/sessions/import`, memJson);
  return data as { sessionId: string; memoryToken?: string; memoryChunks?: string[]; memoryMeta?: any };
};

// SSE stream helper for realtime agent stages
export const streamChat = (
  params: {
    message: string;
    model?: string;
    temperature?: number;
    memoryToken?: string;
    disableLongMemoryRecall?: boolean;
    disableAllMemoryRecall?: boolean;
  },
  onEvent: (evt: { type: 'agent' | 'answer' | 'error'; data: any }) => void
) => {
  const url = new URL(`${BASE_URL}/chat/stream`);
  url.searchParams.set('message', params.message);
  if (params.model) url.searchParams.set('model', params.model);
  if (typeof params.temperature === 'number') url.searchParams.set('temperature', String(params.temperature));
  if (params.memoryToken) url.searchParams.set('memoryToken', params.memoryToken);
  if (params.disableLongMemoryRecall) url.searchParams.set('disableLongMemoryRecall', 'true');
  if (params.disableAllMemoryRecall) url.searchParams.set('disableAllMemoryRecall', 'true');

  url.searchParams.set('clientId', getClientId());
  const es = new EventSource(url.toString());
  es.addEventListener('agent', (e) => {
    try { onEvent({ type: 'agent', data: JSON.parse((e as MessageEvent).data) }); } catch {}
  });
  es.addEventListener('answer', (e) => {
    try { onEvent({ type: 'answer', data: JSON.parse((e as MessageEvent).data) }); } catch {}
    es.close();
  });
  // Provider error: render as a separate message but do not close the stream yet
  es.addEventListener('provider-error', (e) => {
    try { onEvent({ type: 'error', data: JSON.parse((e as MessageEvent).data) }); } catch {}
  });
  // Fatal stream error
  es.addEventListener('error', (e) => {
    try { onEvent({ type: 'error', data: JSON.parse((e as MessageEvent).data) }); } catch {}
    es.close();
  });
  es.onerror = () => { es.close(); };
  return () => es.close();
};

// Legacy method for backward compatibility (deprecated)
export const sendMessage = async (message: string) => {
  try {
    const response = await sendChatMessage({ message });
    return { reply: response.message };
  } catch (error: any) {
    console.error("API Error:", error);
    return { reply: error.message || "Error: Could not connect to API" };
  }
};

// Health check endpoint
export const checkHealth = async (): Promise<boolean> => {
  try {
    console.log('Checking health at:', `${BASE_URL}/health`);
    const { data } = await axios.get(`${BASE_URL}/health`);
    console.log('Health check response:', data);
    return data.status === "UP";
  } catch (error) {
    console.error("Health check failed:", error);
    console.error("Failed URL:", `${BASE_URL}/health`);
    return false;
  }
};

// Cache statistics endpoint (admin only)
export const getCacheStats = async (): Promise<any> => {
  try {
    const { data } = await axios.get(`${BASE_URL}/admin/cache/stats`, {
      auth: {
        username: 'admin',
        password: 'admin'
      }
    });
    return data;
  } catch (error) {
    console.error("Failed to get cache stats:", error);
    return null;
  }
};

// Check if user is admin (simple implementation)
export const checkIsAdmin = async (): Promise<boolean> => {
  try {
    await axios.get(`${BASE_URL}/admin/cache/stats`, {
      auth: {
        username: 'admin',
        password: 'admin'
      }
    });
    return true;
  } catch (error) {
    return false;
  }
};

// Session Memory interface
export interface SessionMemory {
  sessionId?: string;
  turns?: Array<{
    ts: string;
    role: string;
    content: string;
  }>;
  items?: Array<{
    id: string;
    kind: string;
    text: string;
    importance: number;
    createdAt: string;
    lastAccessedAt: string;
  }>;
  summary?: string;
  meta?: {
    version: string;
    turnCount: number;
    tokenBytes: number;
    createdAt?: string;
    updatedAt?: string;
  };
}

// Export session memory as JSON
export const exportSessionMemory = async (
  sessionId: string,
  memoryToken?: string,
  memoryChunks?: string[]
): Promise<SessionMemory> => {
  try {
    const params: any = { sessionId };
    if (memoryToken) {
      params.memoryToken = memoryToken;
    } else if (memoryChunks && memoryChunks.length > 0) {
      params.memoryChunks = JSON.stringify(memoryChunks);
    }

    const response = await axios.get<SessionMemory>(`${BASE_URL}/sessions/export`, {
      params,
      headers: {
        'X-Client-Id': getClientId(),
      },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    throw new Error(`Failed to export memory: ${axiosError.response?.data || axiosError.message}`);
  }
};

// Import session memory from JSON
export const importSessionMemory = async (memoryData: SessionMemory): Promise<{
  sessionId: string;
  memoryToken?: string;
  memoryChunks?: string[];
  memoryMeta: {
    sizeBytes: number;
    chunkCount: number;
    version: string;
  };
}> => {
  try {
    const response = await axios.post(`${BASE_URL}/sessions/import`, memoryData, {
      headers: {
        'X-Client-Id': getClientId(),
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    throw new Error(`Failed to import memory: ${axiosError.response?.data || axiosError.message}`);
  }
};

// Clear long-term memory (keeps conversation turns and summary)
export const clearLongTermMemory = async (sessionId: string): Promise<{
  sessionId: string;
  memoryToken?: string;
  memoryChunks?: string[];
  memoryMeta: {
    sizeBytes: number;
    chunkCount: number;
    version: string;
  };
}> => {
  try {
    // Get current memory to preserve turns and summary
    const memKey = `mem:${sessionId}`;
    const raw = localStorage.getItem(memKey);
    let memory: { token?: string; chunks?: string[] } | undefined;
    if (raw) {
      try {
        memory = JSON.parse(raw);
      } catch (e) {
        // Continue without memory
      }
    }

    let currentMemory: SessionMemory = {};
    if (memory?.token || memory?.chunks) {
      const exported = await exportSessionMemory(sessionId, memory.token, memory.chunks);
      currentMemory = exported;
    }

    // Clear items (long-term memory) but keep turns and summary
    currentMemory.items = [];
    if (currentMemory.meta) {
      currentMemory.meta.turnCount = currentMemory.turns?.length || 0;
    } else {
      currentMemory.meta = {
        version: 'mem/v1',
        turnCount: currentMemory.turns?.length || 0,
        tokenBytes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    const result = await importSessionMemory(currentMemory);
    return result;
  } catch (error) {
    const axiosError = error as AxiosError;
    throw new Error(`Failed to clear long-term memory: ${axiosError.response?.data || axiosError.message}`);
  }
};

// Clear all memory (including conversation turns)
export const clearAllMemory = async (sessionId: string): Promise<{
  sessionId: string;
  memoryToken?: string;
  memoryChunks?: string[];
  memoryMeta: {
    sizeBytes: number;
    chunkCount: number;
    version: string;
  };
}> => {
  try {
    // Create empty memory
    const emptyMemory: SessionMemory = {
      sessionId,
      turns: [],
      items: [],
      summary: '',
      meta: {
        version: 'mem/v1',
        turnCount: 0,
        tokenBytes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    const result = await importSessionMemory(emptyMemory);
    return result;
  } catch (error) {
    const axiosError = error as AxiosError;
    throw new Error(`Failed to clear all memory: ${axiosError.response?.data || axiosError.message}`);
  }
};

// Clear long-term memory (preserves conversation turns and summary)
export const clearLongTermMemoryEndpoint = async (
  sessionId: string,
  memoryToken?: string,
  memoryChunks?: string[]
): Promise<{
  sessionId: string;
  memoryToken?: string;
  memoryChunks?: string[];
  memoryMeta: {
    sizeBytes: number;
    chunkCount: number;
    version: string;
  };
}> => {
  try {
    const response = await axios.post(`${BASE_URL}/sessions/clear-long-memory`, {
      sessionId,
      memoryToken,
      memoryChunks: memoryChunks ? JSON.stringify(memoryChunks) : undefined
    }, {
      headers: {
        'X-Client-Id': getClientId(),
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    throw new Error(`Failed to clear long-term memory: ${axiosError.response?.data || axiosError.message}`);
  }
};

// Clear all memory (creates completely fresh memory)
export const clearAllMemoryEndpoint = async (
  sessionId: string,
  memoryToken?: string,
  memoryChunks?: string[]
): Promise<{
  sessionId: string;
  memoryToken?: string;
  memoryChunks?: string[];
  memoryMeta: {
    sizeBytes: number;
    chunkCount: number;
    version: string;
  };
}> => {
  try {
    const response = await axios.post(`${BASE_URL}/sessions/clear-all-memory`, {
      sessionId,
      memoryToken,
      memoryChunks: memoryChunks ? JSON.stringify(memoryChunks) : undefined
    }, {
      headers: {
        'X-Client-Id': getClientId(),
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    throw new Error(`Failed to clear all memory: ${axiosError.response?.data || axiosError.message}`);
  }
};

// Model status API functions
export const getModelStatus = async (providerId: string, modelId: string): Promise<ModelStatus> => {
  try {
    const response = await axios.get<ModelStatus>(`${BASE_URL}/api/model-status/provider/${providerId}/model/${modelId}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    throw new Error(`Failed to get model status: ${axiosError.response?.data || axiosError.message}`);
  }
};

export const isProviderBusy = async (providerId: string): Promise<boolean> => {
  try {
    const response = await axios.get<boolean>(`${BASE_URL}/api/model-status/provider/${providerId}/busy`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    throw new Error(`Failed to check provider busy status: ${axiosError.response?.data || axiosError.message}`);
  }
};

export const getCurrentModelStatus = async (): Promise<ModelStatus> => {
  try {
    const providerId = localStorage.getItem('currentProviderId') || 'gemini';
    let modelId = localStorage.getItem('currentModelId') || 'gemini-1.5-flash';

    // For Ollama, use a default model if none is set
    if (providerId === 'ollama' && (!modelId || modelId.startsWith('gemini'))) {
      modelId = 'llama2'; // Default Ollama model
    }

    const response = await axios.get<ModelStatus>(`${BASE_URL}/api/model-status/current?providerId=${providerId}&modelId=${modelId}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    // For non-Ollama providers, return a default idle state
    const providerId = localStorage.getItem('currentProviderId') || 'gemini';
    if (providerId !== 'ollama') {
      return {
        providerId,
        modelId: localStorage.getItem('currentModelId') || 'gemini-1.5-flash',
        state: 'IDLE',
        message: 'Model is ready',
        timestamp: Date.now()
      };
    }
    throw new Error(`Failed to get current model status: ${axiosError.response?.data || axiosError.message}`);
  }
};