import React, { useState, useEffect } from 'react';
import { Tooltip } from './Tooltip';
import { CollapsibleGroup } from './CollapsibleGroup';

// Utility function to detect mobile devices
const isMobile = () => {
  return window.innerWidth <= 768;
};

// Conditional Tooltip component that only shows on desktop
const ConditionalTooltip: React.FC<{ content: string | React.ReactNode; children: React.ReactNode; position?: "top" | "bottom" | "left" | "right" }> = ({ content, children, position }) => {
  return isMobile() ? <>{children}</> : <Tooltip content={content} position={position}>{children as React.ReactElement}</Tooltip>;
};
import {
  getProviders,
  getProviderModels,
  setCurrentProvider,
  getCurrentProvider,
  saveProviderConfig,
  getModelConfig,
  type Provider,
  type Model,
  type ModelConfig
} from '../api/ProviderClient';



interface ModelSelectionProps {
  selectedProvider: string;
  selectedModel: string;
  apiKey: string;
  baseUrl: string;
  modelConfig: ModelConfig;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onApiKeyChange: (apiKey: string) => void;
  onBaseUrlChange: (baseUrl: string) => void;
  onConfigChange: (config: ModelConfig) => void;
}

export const ModelSelection: React.FC<ModelSelectionProps> = ({
  selectedProvider,
  selectedModel,
  apiKey,
  baseUrl,
  modelConfig,
  onProviderChange,
  onModelChange,
  onApiKeyChange,
  onBaseUrlChange,
  onConfigChange,
}) => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [supportedParameters, setSupportedParameters] = useState<any[]>([]);

  // Load providers from API
  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoading(true);
        const response = await getProviders();
        setProviders(response.availableProviders || []);
      } catch (error) {
        console.error('Failed to load providers from API:', error);
        // Fallback to only the built-in provider
        const fallbackProviders: Provider[] = [
          { id: 'gemini', name: 'Google Gemini', type: 'remote', available: true },
        ];

        setProviders(fallbackProviders);
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, []);

  // Calculate provider info - moved before useEffect to avoid initialization issues
  const selectedProviderInfo = providers?.find(p => p.id === selectedProvider);
  const isLocalProvider = selectedProviderInfo?.type?.toLowerCase() === 'local';
  const needsApiKey: boolean = !!(selectedProvider && !isLocalProvider && selectedProvider !== 'gemini');

  // Update models when provider changes or API key is provided
  useEffect(() => {
    if (!selectedProvider) return;

    // Only load models if:
    // 1. It's a local provider (Ollama), OR
    // 2. It's Gemini (built-in), OR
    // 3. It's a remote provider with API key
    const shouldLoadModels = isLocalProvider ||
                            selectedProvider === 'gemini' ||
                            (needsApiKey && apiKey && apiKey.trim() !== '');

    if (!shouldLoadModels) {
      setModels([]);
      if (selectedModel) {
        onModelChange('');
      }
      return;
    }

    const loadModels = async () => {
      try {
        setLoading(true);
        const response = await getProviderModels(selectedProvider);
        setModels(response.models);

        // Auto-select first model if none selected
        if (!selectedModel && response.models.length > 0) {
          onModelChange(response.models[0].id);
        }
      } catch (error) {
        console.error('Failed to load models:', error);
        setModels([]);
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, [selectedProvider, apiKey, isLocalProvider, needsApiKey, selectedModel, onModelChange]);

  // Load model configuration when provider/model changes
  useEffect(() => {
    const loadModelConfig = async () => {
      if (!selectedProvider) {
        setSupportedParameters([]);
        return;
      }

      // If no model yet, but provider supports parameters, show sensible defaults so users can configure
      if (!selectedModel) {
        if (selectedProvider === 'openai') {
          setSupportedParameters([
            { key: 'temperature', name: 'temperature', type: 'FLOAT', defaultValue: 0.7, description: 'Controls randomness (0.0-1.0)', min: 0, max: 1, step: 0.1 },
            { key: 'max_tokens', name: 'max_tokens', type: 'INTEGER', defaultValue: 150, description: 'Maximum output tokens', min: 1, max: 200000, step: 1 },
            { key: 'top_p', name: 'top_p', type: 'FLOAT', defaultValue: 1.0, description: 'Nucleus sampling parameter', min: 0, max: 1, step: 0.1 }
          ]);
          return;
        } else if (selectedProvider === 'anthropic') {
          setSupportedParameters([
            { key: 'temperature', name: 'temperature', type: 'FLOAT', defaultValue: 0.7, description: 'Controls randomness (0.0-1.0)', min: 0, max: 1, step: 0.1 },
            { key: 'max_tokens', name: 'max_tokens', type: 'INTEGER', defaultValue: 150, description: 'Maximum output tokens', min: 1, max: 200000, step: 1 }
          ]);
          return;
        } else {
          setSupportedParameters([]);
          return;
        }
      }

      try {
        const configResponse = await getModelConfig(selectedProvider, selectedModel);
        // Convert the parameters map to an array for easier rendering
        let params = Object.entries(configResponse.parameters).map(([key, param]: [string, any]) => ({
          key,
          name: key,
          type: param.type,
          defaultValue: param.defaultValue,
          description: param.description,
          min: key.includes('temperature') || key.includes('topP') || key.includes('top_p') ? 0 :
               key.includes('max') || key.includes('num_') ? 1 : undefined,
          max: key.includes('temperature') || key.includes('topP') || key.includes('top_p') ? 1 :
               key.includes('max') || key.includes('num_') ? 200000 : undefined,
          step: key.includes('temperature') || key.includes('topP') || key.includes('top_p') ? 0.1 : 1
        }));

        // Fallbacks: if backend returns no parameters but provider is known to support them, provide sensible defaults
        if ((!params || params.length === 0) && (selectedProvider === 'openai')) {
          params = [
            { key: 'temperature', name: 'temperature', type: 'FLOAT', defaultValue: 0.7, description: 'Controls randomness (0.0-1.0)', min: 0, max: 1, step: 0.1 },
            { key: 'max_tokens', name: 'max_tokens', type: 'INTEGER', defaultValue: 150, description: 'Maximum output tokens', min: 1, max: 200000, step: 1 },
            { key: 'top_p', name: 'top_p', type: 'FLOAT', defaultValue: 1.0, description: 'Nucleus sampling parameter', min: 0, max: 1, step: 0.1 }
          ];
        }
        if ((!params || params.length === 0) && (selectedProvider === 'anthropic')) {
          params = [
            { key: 'temperature', name: 'temperature', type: 'FLOAT', defaultValue: 0.7, description: 'Controls randomness (0.0-1.0)', min: 0, max: 1, step: 0.1 },
            { key: 'max_tokens', name: 'max_tokens', type: 'INTEGER', defaultValue: 150, description: 'Maximum output tokens', min: 1, max: 200000, step: 1 }
          ];
        }

        setSupportedParameters(params);
      } catch (error) {
        console.error('Failed to load model config:', error);
        // Fallback defaults when backend config fetch fails but provider is known to support params
        if (selectedProvider === 'openai') {
          setSupportedParameters([
            { key: 'temperature', name: 'temperature', type: 'FLOAT', defaultValue: 0.7, description: 'Controls randomness (0.0-1.0)', min: 0, max: 1, step: 0.1 },
            { key: 'max_tokens', name: 'max_tokens', type: 'INTEGER', defaultValue: 150, description: 'Maximum output tokens', min: 1, max: 200000, step: 1 },
            { key: 'top_p', name: 'top_p', type: 'FLOAT', defaultValue: 1.0, description: 'Nucleus sampling parameter', min: 0, max: 1, step: 0.1 }
          ]);
        } else if (selectedProvider === 'anthropic') {
          setSupportedParameters([
            { key: 'temperature', name: 'temperature', type: 'FLOAT', defaultValue: 0.7, description: 'Controls randomness (0.0-1.0)', min: 0, max: 1, step: 0.1 },
            { key: 'max_tokens', name: 'max_tokens', type: 'INTEGER', defaultValue: 150, description: 'Maximum output tokens', min: 1, max: 200000, step: 1 }
          ]);
        } else {
          setSupportedParameters([]);
        }
      }
    };

    loadModelConfig();
  }, [selectedProvider, selectedModel]);

  // Load current provider configuration on mount
  useEffect(() => {
    const loadCurrentConfig = async () => {
      try {
        const current = await getCurrentProvider();
        onProviderChange(current.providerId);
        onModelChange(current.modelId);
        try {
          localStorage.setItem('currentProviderId', current.providerId || '');
          localStorage.setItem('currentModelId', current.modelId || '');
        } catch {}
      } catch (error) {
        // ignore
      }
    };

    if (providers && providers.length > 0) {
      loadCurrentConfig();
    }
  }, [providers, onProviderChange, onModelChange]);

  // Save configuration when it changes
  const saveConfig = async () => {
    if (!selectedProvider) return;

    try {
      await saveProviderConfig({
        providerId: selectedProvider,
        modelId: selectedModel || undefined,
        apiKey: apiKey || undefined,
        baseUrl: baseUrl || undefined,
        parameters: modelConfig,
      });
      if (selectedModel) {
        await setCurrentProvider(selectedProvider, selectedModel);
        // Persist selection locally so other parts of the app can read without extra API calls
        try {
          localStorage.setItem('currentProviderId', selectedProvider);
          localStorage.setItem('currentModelId', selectedModel);
        } catch {}
      }
    } catch (error) {
      console.error('Failed to save provider config:', error);
    }
  };

  // Auto-save when configuration changes
  useEffect(() => {
    if (selectedProvider && selectedModel) {
      const timeoutId = setTimeout(saveConfig, 1000); // Debounce for 1 second
      return () => clearTimeout(timeoutId);
    }
  }, [selectedProvider, selectedModel, apiKey, baseUrl, modelConfig]);

  // Immediately set current provider/model on selection change to avoid race with debounced save
  useEffect(() => {
    if (!selectedProvider || !selectedModel) return;
    // Persist locally so other parts of the app can read instantly
    try {
      localStorage.setItem('currentProviderId', selectedProvider);
      localStorage.setItem('currentModelId', selectedModel);
    } catch {}
    // Fire-and-forget backend update; do not debounce to avoid rate-limit UI race
    setCurrentProvider(selectedProvider, selectedModel).catch(() => {});
  }, [selectedProvider, selectedModel]);

  return (
    <div className="space-y-4">
      {/* Provider Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Provider</label>
        <ConditionalTooltip content="Select the AI provider you want to use. Local providers are only available when running locally.">
          <select
            value={selectedProvider}
            onChange={(e) => onProviderChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="gemini">Built-In (Google Gemini)</option>
            {providers?.filter(p => p.id !== 'gemini' && p.available).map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            )) || []}
            {providers?.filter(p => p.id !== 'gemini' && !p.available).map(provider => (
              <option key={provider.id} value={provider.id} disabled>
                {provider.name} (Not Available)
              </option>
            )) || []}
          </select>
        </ConditionalTooltip>
      </div>

      {/* Model Selection */}
      {selectedProvider && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Model</label>
          <ConditionalTooltip content="Select the specific model to use from the selected provider.">
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              disabled={loading || (needsApiKey && (!apiKey || apiKey.trim() === ''))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              {loading ? (
                <option value="">Loading models...</option>
              ) : needsApiKey && (!apiKey || apiKey.trim() === '') ? (
                <option value="">Enter API Key to select model</option>
              ) : models.length === 0 ? (
                <option value="">No models available</option>
              ) : (
                <>
                  <option value="">Select Model</option>
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </>
              )}
            </select>
          </ConditionalTooltip>
        </div>
      )}

      {/* Configuration */}
      {needsApiKey && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">API Key</label>
          <ConditionalTooltip content="Your API key for the selected provider. This will be stored securely and only used for your requests.">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder={`Enter ${selectedProviderInfo?.name} API key`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </ConditionalTooltip>
        </div>
      )}

      {/* Local Provider Configuration */}
      {selectedProvider && isLocalProvider && selectedProvider !== 'gemini' && (
        <div className="space-y-2">
          {isLocalProvider ? (
            <>
              <label className="text-sm font-medium text-gray-700">Provider URL</label>
              <ConditionalTooltip content="The URL where your local LLM server is running.">
                <input
                  type="text"
                  value={baseUrl || (selectedProvider === 'ollama' ? 'http://localhost:11434' : '')}
                  onChange={(e) => onBaseUrlChange(e.target.value)}
                  placeholder={selectedProvider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:port'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </ConditionalTooltip>
              {selectedProvider === 'ollama' && (
                <p className="text-xs text-gray-500">
                  Default Ollama installation runs on http://localhost:11434
                </p>
              )}
            </>
          ) : (
            <>
              <label className="text-sm font-medium text-gray-700">API Key</label>
              <ConditionalTooltip content="Your API key for the selected provider. This will be stored securely and only used for your requests.">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  placeholder={`Enter ${selectedProviderInfo?.name} API key`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </ConditionalTooltip>
            </>
          )}
        </div>
      )}

      {/* Built-in provider notice */}
      {selectedProvider === 'gemini' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>Built-in Provider:</strong> Google Gemini is available without additional configuration.
            It uses your project's Vertex AI configuration.
          </p>
        </div>
      )}

      {/* Model Parameters */}
      {supportedParameters.length > 0 && (
        <div className="space-y-2">
          <CollapsibleGroup title="Parameters" defaultExpanded={false}>
            <div className="flex flex-col space-y-4">
              {supportedParameters.map((param) => {
                // Get the current value from modelConfig
                const currentValue = modelConfig[param.key as keyof typeof modelConfig] || param.defaultValue;

                // Format parameter name for display
                const displayName = param.key
                  .replace(/([A-Z])/g, ' $1') // Add spaces before capitals
                  .replace(/^./, (str: string) => str.toUpperCase()) // Capitalize first letter
                  .replace(/maxOutputTokens/, 'Max Tokens')
                  .replace(/max_tokens/, 'Max Tokens')
                  .replace(/num_predict/, 'Max Tokens')
                  .replace(/top_p/, 'Top P')
                  .replace(/topP/, 'Top P')
                  .replace(/top_k/, 'Top K')
                  .replace(/num_ctx/, 'Context Window');

                return (
                  <ConditionalTooltip key={param.key} content={param.description}>
                    <div className="flex flex-col space-y-1">
                      <label className="text-sm font-medium text-gray-700">{displayName}</label>
                      <input
                        type="number"
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        value={currentValue}
                        onChange={(e) => {
                          const newValue = param.type === 'FLOAT' ?
                            parseFloat(e.target.value) : parseInt(e.target.value);
                          onConfigChange({ ...modelConfig, [param.key]: newValue });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </ConditionalTooltip>
                );
              })}
            </div>
          </CollapsibleGroup>
        </div>
      )}
    </div>
  );
};
