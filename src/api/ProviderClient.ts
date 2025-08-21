// Function to get the correct API base URL (same logic as FastAPIClient.ts)
const getApiBaseUrl = (): string => {
  // If environment variable is set, check if it's valid for current context
  if (import.meta.env.VITE_API_BASE) {
    const envUrl = import.meta.env.VITE_API_BASE;
    console.log('🔗 ProviderClient API Base URL: Environment variable set to:', envUrl);

    // If we're accessing from a different hostname than localhost/127.0.0.1,
    // and the env URL contains localhost, we need to make it dynamic
    if ((window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') &&
        (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      console.log('🔗 ProviderClient API Base URL: Detected network access with localhost in env, using dynamic IP');
      const dynamicUrl = `http://${window.location.hostname}:8080`;
      console.log('🔗 ProviderClient API Base URL: Dynamic URL:', dynamicUrl);
      return dynamicUrl;
    }

    // Otherwise, use the environment variable as-is
    return envUrl;
  }

  // If running on localhost (development), use localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔗 ProviderClient API Base URL: Using localhost (development mode)');
    return "http://localhost:8080";
  }

  // If accessed from mobile/other device, use the same hostname as the frontend
  // but with port 8080 for the backend
  const apiUrl = `http://${window.location.hostname}:8080`;
  console.log('🔗 ProviderClient API Base URL:', apiUrl, '(network mode from hostname:', window.location.hostname + ')');
  return apiUrl;
};

const API_BASE = getApiBaseUrl();

export interface Provider {
  id: string;
  name: string;
  type: 'remote' | 'local';
  available: boolean;
}

export interface Model {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  supportsStreaming: boolean;
}

export interface ModelConfig {
  temperature: number;
  maxTokens: number;
  topP: number;
  [key: string]: any;
}

export interface ProviderConfig {
  providerId: string;
  providerName: string;
  providerType: string;
  modelId?: string;
  apiKey?: string;
  baseUrl?: string;
}

/**
 * Get all available providers
 */
export async function getProviders(): Promise<{
  providers: Provider[];
  allProviders: Provider[];
  availableProviders: Provider[];
  environment: string;
  isLocal: boolean;
  hostname: string;
  userHome: string;
  javaVendor: string;
}> {
  // Debug: Log the API_BASE and constructed URL
  console.log('🔗 ProviderClient API_BASE:', API_BASE);
  const apiUrl = `${API_BASE}/api/providers`;
  console.log('🔗 ProviderClient: Calling providers endpoint at:', apiUrl);

  const response = await fetch(apiUrl);
  if (!response.ok) {
    console.error('❌ ProviderClient: Failed to fetch providers. Status:', response.status, 'StatusText:', response.statusText);
    console.error('❌ ProviderClient: Response URL:', response.url);
    throw new Error(`Failed to fetch providers: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('✅ ProviderClient: Successfully fetched providers:', data);
  return data;
}

/**
 * Get models for a specific provider
 */
export async function getProviderModels(providerId: string): Promise<{
  models: Model[];
}> {
  const response = await fetch(`${API_BASE}/api/providers/${providerId}/models`);
  if (!response.ok) {
    throw new Error('Failed to fetch provider models');
  }
  return response.json();
}

/**
 * Get configuration parameters for a model
 */
export async function getModelConfig(providerId: string, modelId: string): Promise<{
  parameters: ModelConfig;
}> {
  const response = await fetch(`${API_BASE}/api/providers/${providerId}/models/${modelId}/config`);
  if (!response.ok) {
    throw new Error('Failed to fetch model config');
  }
  return response.json();
}

/**
 * Save provider configuration
 */
export async function saveProviderConfig(config: {
  providerId: string;
  modelId?: string;
  apiKey?: string;
  baseUrl?: string;
  parameters?: ModelConfig;
}): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/api/providers/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    throw new Error('Failed to save provider config');
  }
  return response.json();
}

/**
 * Get current provider configuration
 */
export async function getProviderConfig(providerId: string): Promise<ProviderConfig> {
  const response = await fetch(`${API_BASE}/api/providers/config?providerId=${providerId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch provider config');
  }
  return response.json();
}

/**
 * Set current provider and model for chat
 */
export async function setCurrentProvider(providerId: string, modelId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/api/provider/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ providerId, modelId }),
  });
  if (!response.ok) {
    throw new Error('Failed to set current provider');
  }
  return response.json();
}

/**
 * Get current provider and model
 */
export async function getCurrentProvider(): Promise<{ providerId: string; modelId: string }> {
  const response = await fetch(`${API_BASE}/api/provider/config`);
  if (!response.ok) {
    throw new Error('Failed to get current provider');
  }
  return response.json();
}
