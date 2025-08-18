import axios, { AxiosError } from "axios";

// Use environment variable or fallback to localhost for development
const BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:8080";

// TypeScript interfaces for the new API response format
export interface ChatResponse {
  message: string;
  model?: string;
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
}

export interface ApiError {
  message: string;
  status?: number;
  isRateLimited?: boolean;
  isNetworkError?: boolean;
}

// Enhanced API client with better error handling
export const sendChatMessage = async (request: MessageRequest): Promise<ChatResponse> => {
  try {
    const { data } = await axios.post<ChatResponse>(`${BASE_URL}/chat`, request);
    return data;
  } catch (error) {
    const axiosError = error as AxiosError;
    
    // Handle rate limiting
    if (axiosError.response?.status === 429) {
      const errorData = axiosError.response.data as any;
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
    const { data } = await axios.get(`${BASE_URL}/health`);
    return data.status === "UP";
  } catch (error) {
    console.error("Health check failed:", error);
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