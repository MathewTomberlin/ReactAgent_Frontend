const API_BASE = import.meta.env.VITE_API_BASE || '';

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
  const response = await fetch(`${API_BASE}/api/providers`);
  if (!response.ok) {
    throw new Error('Failed to fetch providers');
  }
  return response.json();
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
  modelId: string;
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
