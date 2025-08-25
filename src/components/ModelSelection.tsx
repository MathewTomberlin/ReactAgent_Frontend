import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ConditionalTooltip } from '../utils/uiUtils';
import { CollapsibleGroup } from './CollapsibleGroup';
import {
  getProviders,
  getProviderModels,
  setCurrentProvider,
  getCurrentProvider,
  saveProviderConfig,
  getModelConfig,
  validateApiKey,
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

export const ModelSelection: React.FC<ModelSelectionProps> = React.memo(({
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
  const loadingInProgress = useRef(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [supportedParameters, setSupportedParameters] = useState<any[]>([]);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [validatingApiKey, setValidatingApiKey] = useState(false);
  const [isLocalEnvironment, setIsLocalEnvironment] = useState(false);
  const [providerTypeFilter, setProviderTypeFilter] = useState<'remote' | 'local'>(() => {
    // Load saved filter type from localStorage, default to 'remote'
    return (localStorage.getItem('providerTypeFilter') as 'remote' | 'local') || 'remote';
  });
  const hasLoadedInitialConfig = useRef(false);

  // Save provider type filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('providerTypeFilter', providerTypeFilter);
  }, [providerTypeFilter]);

  // Load providers from API
  useEffect(() => {
    // Prevent multiple executions of this effect
    if (loadingInProgress.current) {
      return;
    }
    
    const loadProviders = async () => {
      // Prevent multiple simultaneous loading operations
      if (loadingInProgress.current) {
        return;
      }
      
      loadingInProgress.current = true;
      
      try {
        setLoading(true);
        const startTime = Date.now();
        
        const response = await getProviders();
        setProviders(response.availableProviders || []);
        setIsLocalEnvironment(response.isLocal || false);
        
        // If running in cloud, default to remote providers only
        if (!response.isLocal) {
          setProviderTypeFilter('remote');
        }
        
        // Ensure loading shows for at least 500ms so users can see the overlay
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 500 - elapsed);
        
        setTimeout(() => {
          setLoading(false);
          loadingInProgress.current = false;
        }, remaining);
        
      } catch (error) {
        console.error('Failed to load providers from API:', error);
        // Fallback to only the built-in provider
        const fallbackProviders: Provider[] = [
          { id: 'gemini', name: 'Google Gemini', type: 'remote', available: true },
        ];

        setProviders(fallbackProviders);
        setIsLocalEnvironment(false);
        setProviderTypeFilter('remote');
        
        // Ensure loading shows for at least 500ms even on error
        setTimeout(() => {
          setLoading(false);
          loadingInProgress.current = false;
        }, 500);
      }
    };

    loadProviders();
  }, []);

  // Filter providers based on selected type
  const filteredProviders = useMemo(() => {
    if (!isLocalEnvironment) {
      // In cloud environment, only show remote providers
      return providers.filter(p => p.type === 'remote');
    }
    
    // In local environment, filter based on selected type
    if (providerTypeFilter === 'local') {
      // For local, only show actual local providers (exclude Built-In)
      return providers.filter(p => p.type === 'local');
    } else {
      // For remote, show all remote providers (including Built-In)
      return providers.filter(p => p.type === 'remote');
    }
  }, [providers, providerTypeFilter, isLocalEnvironment]);

  // Calculate provider info - memoized to prevent recalculation on every render
  const providerInfo = useMemo(() => {
    const selectedProviderInfo = providers?.find(p => p.id === selectedProvider);
    // Built-In (gemini) is always treated as remote, not local
    const isLocalProvider = selectedProviderInfo?.type?.toLowerCase() === 'local';
    const needsApiKey: boolean = !!(selectedProvider && !isLocalProvider && selectedProvider !== 'gemini');
    
    return { selectedProviderInfo, isLocalProvider, needsApiKey };
  }, [providers, selectedProvider]);

  const { selectedProviderInfo, isLocalProvider, needsApiKey } = providerInfo;

  // Enhanced provider URL visibility logic
  const shouldShowProviderUrl = useMemo(() => {
    // Show provider URL if:
    // 1. We're in local filter mode (regardless of provider selection), OR
    // 2. We have a selected provider that is local
    const shouldShow = providerTypeFilter === 'local' || 
           (selectedProvider && isLocalProvider);
    
    return shouldShow;
  }, [selectedProvider, isLocalProvider, providerTypeFilter, providers]);

  // Enhanced model loading logic
  const shouldLoadModels = useMemo(() => {
    if (!selectedProvider) return false;
    
    // Load models if:
    // 1. It's a local provider (Ollama), OR
    // 2. It's Gemini (built-in), OR
    // 3. It's a remote provider with valid API key
    const shouldLoad = isLocalProvider ||
           selectedProvider === 'gemini' ||
           (needsApiKey && apiKey && apiKey.trim() !== '' && apiKeyValid === true);
    
    return shouldLoad;
  }, [selectedProvider, isLocalProvider, needsApiKey, apiKey, apiKeyValid]);

  // Handle provider type filter change
  const handleProviderTypeChange = (type: 'remote' | 'local') => {
    // Get available providers in the new filter type
    const availableProvidersInNewFilter = providers.filter(p => p.type === type && p.available);
    
    // Check if current provider is available in the new filter type
    if (selectedProvider) {
      const currentProvider = providers.find(p => p.id === selectedProvider);
      
      // Clear selection if current provider is not available in the new filter type
      if (!currentProvider || currentProvider.type !== type || !currentProvider.available) {
        // Clear API key and base URL when switching between remote and local
        if (currentProvider) {
          if (currentProvider.type === 'remote' && type === 'local') {
            onApiKeyChange('');
          } else if (currentProvider.type === 'local' && type === 'remote') {
            onBaseUrlChange('');
          }
        }
        
        // Clear current selections
        onProviderChange('');
        onModelChange('');
        
        // Auto-select a provider immediately after clearing
        if (availableProvidersInNewFilter.length > 0) {
          // Prioritize built-in provider when switching to remote mode
          let providerToSelect = availableProvidersInNewFilter[0];
          if (type === 'remote') {
            const builtInProvider = availableProvidersInNewFilter.find(p => p.id === 'gemini');
            if (builtInProvider) {
              providerToSelect = builtInProvider;
            }
          }
          
          // Use setTimeout to ensure the state updates happen in the correct order
          setTimeout(() => {
            onProviderChange(providerToSelect.id);
          }, 0);
        }
      }
    } else {
      // No provider currently selected, auto-select one
      if (availableProvidersInNewFilter.length > 0) {
        // Prioritize built-in provider when switching to remote mode
        let providerToSelect = availableProvidersInNewFilter[0];
        if (type === 'remote') {
          const builtInProvider = availableProvidersInNewFilter.find(p => p.id === 'gemini');
          if (builtInProvider) {
            providerToSelect = builtInProvider;
          }
        }
        
        onProviderChange(providerToSelect.id);
      }
    }
    
    // Update the filter type
    setProviderTypeFilter(type);
  };

  // API key validation cache to prevent repeated calls
  const apiKeyValidationCache = useRef<Map<string, { valid: boolean; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Clear cache when provider changes
  useEffect(() => {
    // Clear cache entries for the previous provider
    const cacheKeysToRemove: string[] = [];
    apiKeyValidationCache.current.forEach((_, key) => {
      if (!key.startsWith(selectedProvider + ':')) {
        cacheKeysToRemove.push(key);
      }
    });
    cacheKeysToRemove.forEach(key => apiKeyValidationCache.current.delete(key));
  }, [selectedProvider]);

  // Validate API key when it changes
  useEffect(() => {
    if (!selectedProvider || !needsApiKey || !apiKey || apiKey.trim() === '') {
      setApiKeyValid(null);
      return;
    }

    // Prevent multiple simultaneous validations
    if (validatingApiKey) {
      return;
    }

    // Check cache first
    const cacheKey = `${selectedProvider}:${apiKey}`;
    const cachedResult = apiKeyValidationCache.current.get(cacheKey);
    const now = Date.now();
    
    if (cachedResult && (now - cachedResult.timestamp) < CACHE_DURATION) {
      setApiKeyValid(cachedResult.valid);
      return;
    }

    const validateKey = async () => {
      setValidatingApiKey(true);
      try {
        const result = await validateApiKey(selectedProvider, apiKey);
        setApiKeyValid(result.valid);
        
        // Cache the result
        apiKeyValidationCache.current.set(cacheKey, { valid: result.valid, timestamp: now });
        
        if (result.valid) {
          // Save the API key configuration after successful validation
          try {
            await saveProviderConfig({
              providerId: selectedProvider,
              apiKey: apiKey,
            });
          } catch (error) {
            console.error('Failed to save API key after validation:', error);
          }
        } else {
          // Clear models if API key is invalid
          setModels([]);
          if (selectedModel) {
            onModelChange('');
          }
        }
      } catch (error) {
        console.error('Failed to validate API key:', error);
        setApiKeyValid(false);
        setModels([]);
        if (selectedModel) {
          onModelChange('');
        }
      } finally {
        setValidatingApiKey(false);
      }
    };

    // Debounce API key validation to avoid too many requests
    const timeoutId = setTimeout(validateKey, 1000);
    return () => clearTimeout(timeoutId);
  }, [selectedProvider, apiKey]); // Removed needsApiKey and validatingApiKey from dependencies

  // Update models when provider changes or API key is provided
  useEffect(() => {
    if (!shouldLoadModels) {
      setModels([]);
      if (selectedModel) {
        onModelChange('');
      }
      return;
    }

    const loadModels = async () => {
      try {
        setModelsLoading(true);
        const response = await getProviderModels(selectedProvider);
        setModels(response.models);

        // Auto-select first model if none selected or if switching providers
        if (response.models.length > 0) {
          // If no model is selected, or if the current model is not in the new list, select the first one
          const currentModelExists = selectedModel && response.models.some(m => m.id === selectedModel);
          if (!currentModelExists) {
            onModelChange(response.models[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load models:', error);
        setModels([]);
      } finally {
        setModelsLoading(false);
      }
    };

    loadModels();
  }, [shouldLoadModels, selectedProvider, selectedModel, onModelChange]);

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

  // Load current provider configuration on mount - only run once
  useEffect(() => {
    // Only run this effect once on mount
    if (hasLoadedInitialConfig.current) {
      return;
    }

    const loadCurrentConfig = async () => {
      try {
        const current = await getCurrentProvider();
        
        // Check if the saved provider is available in the current filter type
        const savedProvider = providers.find(p => p.id === current.providerId);
        const isSavedProviderInCurrentFilter = savedProvider && savedProvider.type === providerTypeFilter;
        
        if (!selectedProvider) {
          if (isSavedProviderInCurrentFilter) {
            // Use the saved provider if it's available in the current filter
            onProviderChange(current.providerId);
          } else {
            // Auto-select a provider from the current filter type
            const availableProvidersInFilter = providers.filter(p => p.type === providerTypeFilter && p.available);
            if (availableProvidersInFilter.length > 0) {
              // Prioritize built-in provider when switching to remote mode
              let providerToSelect = availableProvidersInFilter[0];
              if (providerTypeFilter === 'remote') {
                const builtInProvider = availableProvidersInFilter.find(p => p.id === 'gemini');
                if (builtInProvider) {
                  providerToSelect = builtInProvider;
                }
              }
              onProviderChange(providerToSelect.id);
            }
          }
        }
        
        if (!selectedModel) {
          onModelChange(current.modelId);
        }
        
        try {
          localStorage.setItem('currentProviderId', current.providerId || '');
          localStorage.setItem('currentModelId', current.modelId || '');
        } catch {}
      } catch (error) {
        // ignore
      }
    };

    // Only load config if we have providers and no current selection
    if (providers && providers.length > 0 && (!selectedProvider || !selectedModel)) {
      loadCurrentConfig();
      hasLoadedInitialConfig.current = true;
    }
  }, [providers, providerTypeFilter, onProviderChange, onModelChange]); // Added providerTypeFilter to dependencies



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
    if (!selectedProvider || !selectedModel) return;

    const scheduleSave = () => {
      // Avoid autosave while the user is actively focusing an input/textarea (prevents mobile blur)
      const active = typeof document !== 'undefined' ? document.activeElement as HTMLElement | null : null;
      const isFormField = !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
      if (isFormField) {
        // Try again later after the user leaves the field
        return;
      }
      void saveConfig();
    };

    const timeoutId = window.setTimeout(scheduleSave, 1000); // Debounce for 1 second
    return () => window.clearTimeout(timeoutId);
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
      {/* Provider Subgroup */}
      <CollapsibleGroup title="Provider" defaultExpanded={true} className="collapsible-group-nested">
        <div className={`space-y-4 relative transition-opacity duration-200 ${(loading || modelsLoading) ? 'pointer-events-none opacity-50' : ''}`}>
          {/* Loading Overlay */}
          {(loading || modelsLoading) && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-md">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">
                  {loading ? 'Loading providers...' : 'Loading models...'}
                </span>
              </div>
            </div>
          )}
          
          {/* Provider Type Toggle - Only show when running locally */}
          {isLocalEnvironment && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Provider Type</label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleProviderTypeChange('remote')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    providerTypeFilter === 'remote'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Remote
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderTypeChange('local')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    providerTypeFilter === 'local'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Local
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Currently showing {providerTypeFilter} providers
              </p>
            </div>
          )}

          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Provider</label>
            <ConditionalTooltip content={`Select the AI provider you want to use. ${isLocalEnvironment ? 'Use the buttons above to switch between Remote and Local providers.' : 'Only remote providers are available in cloud environments.'}`}>
              <select
                value={selectedProvider}
                onChange={(e) => onProviderChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {/* Only show Built-In for remote providers */}
                {providerTypeFilter === 'remote' && (
                  <option value="gemini">Built-In (Google Gemini)</option>
                )}
                {filteredProviders
                  .filter(p => p.id !== 'gemini' && p.available)
                  .map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                {filteredProviders.filter(p => p.id !== 'gemini' && !p.available).map(provider => (
                  <option key={provider.id} value={provider.id} disabled>
                    {provider.name} (Not Available)
                  </option>
                ))}
                {filteredProviders.filter(p => p.id !== 'gemini').length === 0 && (
                  <option value="">No {providerTypeFilter} providers available</option>
                )}
              </select>
            </ConditionalTooltip>
          </div>

                     {/* Provider URL - for local providers */}
           {shouldShowProviderUrl && (
             <div className="space-y-2">
               <label className="text-sm font-medium text-gray-700">Provider URL</label>
               <ConditionalTooltip content="The URL where your local LLM server is running.">
                 <input
                   type="text"
                   value={baseUrl || (selectedProvider === 'ollama' ? 'http://localhost:11434' : '')}
                   onChange={(e) => onBaseUrlChange(e.target.value)}
                   placeholder={selectedProvider === 'ollama' ? 'http://localhost:11434' : 
                              providerTypeFilter === 'local' ? 'http://localhost:port' : 'http://localhost:port'}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                 />
               </ConditionalTooltip>
               {selectedProvider === 'ollama' && (
                 <p className="text-xs text-gray-500">
                   Default Ollama installation runs on http://localhost:11434
                 </p>
               )}
               {providerTypeFilter === 'local' && !selectedProvider && (
                 <p className="text-xs text-gray-500">
                   Select a local provider above to configure its URL
                 </p>
               )}
             </div>
           )}

          {/* API Key Configuration - for remote providers */}
          {needsApiKey && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">API Key</label>
              <ConditionalTooltip content="Your API key for the selected provider. This will be stored securely and only used for your requests.">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  placeholder={`Enter ${selectedProviderInfo?.name} API key`}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    apiKeyValid === true ? 'border-green-500' : 
                    apiKeyValid === false ? 'border-red-500' : 
                    'border-gray-300'
                  }`}
                />
              </ConditionalTooltip>
              
              {/* API Key Validation Status */}
              {needsApiKey && apiKey && apiKey.trim() !== '' && (
                <div className="flex items-center space-x-2">
                  {validatingApiKey ? (
                    <div className="flex items-center space-x-2 text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                      <span className="text-xs">Validating API key...</span>
                    </div>
                  ) : apiKeyValid === true ? (
                    <div className="flex items-center space-x-2 text-green-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs">API key valid</span>
                    </div>
                  ) : apiKeyValid === false ? (
                    <div className="flex items-center space-x-2 text-red-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs">Invalid API key</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

                     {/* Model Selection */}
           {(selectedProvider || providerTypeFilter === 'local') && (
             <div className="space-y-2">
               <label className="text-sm font-medium text-gray-700">Model</label>
               <ConditionalTooltip content="Select the specific model to use from the selected provider.">
                 <select
                   value={selectedModel}
                   onChange={(e) => onModelChange(e.target.value)}
                   disabled={loading || !selectedProvider || (needsApiKey && (!apiKey || apiKey.trim() === ''))}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                 >
                   {!selectedProvider ? (
                     <option value="">Select a provider above to see models</option>
                   ) : loading ? (
                     <option value="">Loading models...</option>
                   ) : needsApiKey && (!apiKey || apiKey.trim() === '') ? (
                     <option value="">Enter API Key to select model</option>
                   ) : needsApiKey && apiKeyValid === false ? (
                     <option value="">Invalid API key - fix to see models</option>
                   ) : models.length === 0 ? (
                     <option value="">No models available</option>
                   ) : (
                     <>
                       <option value="">Select Model</option>
                       {models.map(model => (
                         <option key={model.id} value={model.id}>
                           {model.name}
                         </option>
                       ))}
                     </>
                   )}
                 </select>
               </ConditionalTooltip>
             </div>
           )}
        </div>
      </CollapsibleGroup>

      {/* Built-in provider notice */}
      {selectedProvider === 'gemini' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>Built-in Provider:</strong> Google Gemini is available without API key or additional configuration in limited rates.
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
});

ModelSelection.displayName = 'ModelSelection';
