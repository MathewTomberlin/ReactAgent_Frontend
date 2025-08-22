import React, { useState, useRef, useEffect } from 'react'
import { useAppContext } from './context/AppContext'
import { useSettings } from './context/SettingsContext'
import { CollapsibleGroup } from './components/CollapsibleGroup'
import { RagUploader } from './components/RagUploader'

import { MemoryManagement } from './components/MemoryManagement'
import { Tooltip } from './components/Tooltip'
import { ModelSelection } from './components/ModelSelection'
import { ChatSystemPrompts } from './components/ChatSystemPrompts'
import { initializeMobileViewport } from './utils/mobileViewport'
import { ConditionalTooltip } from './utils/uiUtils'
import { PromptTextarea } from './components/PromptTextarea'


import './App.css'

// Error boundary component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send error to a remote logging service or store locally
    localStorage.setItem('mobile-error', JSON.stringify({
      error: error.message,
      stack: error.stack,
      errorInfo,
      timestamp: new Date().toISOString()
    }));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 max-w-4xl mx-auto">
          <h2 className="text-red-600 font-bold text-xl mb-4">Something went wrong</h2>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <h3 className="text-gray-800 font-semibold mb-2">Error Details:</h3>
            <div className="bg-white border border-gray-300 rounded p-3 mb-3">
              <p className="text-red-600 font-medium">{this.state.error?.message}</p>
            </div>
            
            {this.state.error?.stack && (
              <div>
                <h4 className="text-gray-700 font-medium mb-2">Stack Trace:</h4>
                <div className="bg-gray-900 text-green-400 p-3 rounded border border-gray-600 max-h-96 overflow-y-auto font-mono text-xs">
                  <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-center space-x-4">
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Reload Page
            </button>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })} 
              className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const {
    messages,
    sendToAgent,
    isLoading,
    isRateLimited,
    rateLimitCooldown,
    isModelBusy,
    modelBusyText,
    connectionStatus,
    sessionId,
    importMemory,
    clearMessages,
    retryLastMessage,
    isModelLoading,
    isModelUnloading,
    isProviderBusy,
    isBuiltInProviderBusy
  } = useAppContext();
  
  const { settings, updateSettings, updateTextSettings, updateTextSettingsImmediate } = useSettings();



  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  // Keyboard visibility is inferred via CSS classes; no React state needed

  // Removed unused refs after PromptTextarea introduction

  // Model selection state - initialize from localStorage
  const [selectedProvider, setSelectedProvider] = useState(() => localStorage.getItem('currentProviderId') || 'gemini');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('currentModelId') || 'gemini-1.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434');
  const [modelConfig, setModelConfig] = useState<{ temperature: number; maxTokens: number; topP: number; [key: string]: any }>({ temperature: 0.7, maxTokens: 150, topP: 0.8 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    if (window.innerWidth > 768) {
      inputRef.current?.focus();
    } else {
      textareaRef.current?.focus();
    }
  }, []);

  // Initialize mobile viewport handling
  useEffect(() => {
    try {
      const cleanup = initializeMobileViewport();
      return cleanup;
    } catch (error) {
      console.warn('Error initializing mobile viewport:', error);
      return () => {};
    }
  }, []);



  // Sync provider/model selection with localStorage
  useEffect(() => {
    localStorage.setItem('currentProviderId', selectedProvider);
  }, [selectedProvider]);

  useEffect(() => {
    localStorage.setItem('currentModelId', selectedModel);
  }, [selectedModel]);

  // No-op: mobileViewport sets body/html classes to reflect keyboard visibility

  const isSubmittingRef = useRef<boolean>(false);
  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;
    if (input.trim() !== "" && !isRateLimited && !isLoading && !isModelLoading && !isModelUnloading && !isProviderBusy) {
      try {
        isSubmittingRef.current = true;
        await sendToAgent(input, settings);
        setInput('');
      } finally {
        // small delay to swallow double taps
        setTimeout(() => { isSubmittingRef.current = false; }, 150);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (isSubmittingRef.current) { e.preventDefault(); return; }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  // Lock body scroll when mobile menu is open to avoid background layout shifts affecting focus
  useEffect(() => {
    if (showMobileMenu) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [showMobileMenu]);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'checking': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'checking': return 'Checking...';
      default: return 'Unknown';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden md:relative">

      {/* Sidebar - Desktop */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} hidden md:block transition-all duration-300 ease-in-out bg-white border-r border-gray-200 overflow-hidden flex-shrink-0`}>
        <div className="h-full flex flex-col">
          {/* Header - Fixed */}
          <div className="flex-shrink-0 p-4 w-72">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
              <button
                onClick={toggleSidebar}
                className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
                title="Close sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 w-72 space-y-4">
              {/* Chat */}
              <CollapsibleGroup title="Chat" defaultExpanded={false} className="collapsible-group-top">
                <div className="space-y-4">
                  {/* System Sub-group */}
                  <CollapsibleGroup title="System" defaultExpanded={false} className="collapsible-group-nested">
                    <ChatSystemPrompts
                      systemPrompt={settings.systemPrompt}
                      characterPrompt={settings.characterPrompt || ''}
                      onDebouncedChange={(u) => updateTextSettings(u)}
                      onImmediateCommit={(u) => updateTextSettingsImmediate(u)}
                    />
                  </CollapsibleGroup>
                  {/* Controls Sub-group */}
                  <CollapsibleGroup title="Controls" defaultExpanded={false} className="collapsible-group-nested">
                    <div className="flex justify-center space-x-2">
                      <Tooltip content="Remove all messages from the chat and start with a clean conversation.">
                        <button
                          onClick={clearMessages}
                          className="px-3 py-2 text-sm bg-red-200 text-gray-700 rounded hover:bg-red-300 transition-colors"
                        >
                          Clear Chat
                        </button>
                      </Tooltip>
                      <Tooltip content="Regenerate the response for the last user message. Useful if the previous response wasn't satisfactory.">
                        <button
                          onClick={() => retryLastMessage(settings)}
                          disabled={!messages.length || isLoading || isRateLimited}
                          className="px-3 py-2 text-sm bg-blue-200 text-blue-700 rounded hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Retry Last Message
                        </button>
                      </Tooltip>
                    </div>
                  </CollapsibleGroup>

                  {/* Settings Sub-group */}
                  <CollapsibleGroup title="Settings" defaultExpanded={false} className="collapsible-group-nested">
                    <div className="flex flex-col space-y-3">
                      <Tooltip content="Show which AI model (e.g., Gemini 1.5 Flash) was used to generate each response.">
                        <div className="flex items-start space-x-2">
                          <input
                            type="checkbox"
                            id="displayMessageModel-desktop"
                            checked={settings.displayMessageModel}
                            onChange={() => updateSettings({ displayMessageModel: !settings.displayMessageModel })}
                            className="w-4 h-4 mt-0.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <label htmlFor="displayMessageModel-desktop" className="text-sm text-gray-700 cursor-pointer flex-1">
                            Display Message Model
                          </label>
                        </div>
                      </Tooltip>

                      <Tooltip content="Show the number of tokens used in each request and response. Helps understand API usage costs.">
                        <div className="flex items-start space-x-2">
                          <input
                            type="checkbox"
                            id="displayMessageTokens-desktop"
                            checked={settings.displayMessageTokens}
                            onChange={() => updateSettings({ displayMessageTokens: !settings.displayMessageTokens })}
                            className="w-4 h-4 mt-0.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <label htmlFor="displayMessageTokens-desktop" className="text-sm text-gray-700 cursor-pointer flex-1">
                            Display Message Tokens
                          </label>
                        </div>
                      </Tooltip>

                      <Tooltip content="Show timestamps on messages to track when responses were generated.">
                        <div className="flex items-start space-x-2">
                          <input
                            type="checkbox"
                            id="displayTimestamp-desktop"
                            checked={settings.displayTimestamp}
                            onChange={() => updateSettings({ displayTimestamp: !settings.displayTimestamp })}
                            className="w-4 h-4 mt-0.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <label htmlFor="displayTimestamp-desktop" className="text-sm text-gray-700 cursor-pointer flex-1">
                            Display Timestamp
                          </label>
                        </div>
                      </Tooltip>

                      <Tooltip content="Show a lightning bolt icon on responses that were served from cache instead of generating a new response.">
                        <div className="flex items-start space-x-2">
                          <input
                            type="checkbox"
                            id="displayCachedIndicator-desktop"
                            checked={settings.displayCachedIndicator}
                            onChange={() => updateSettings({ displayCachedIndicator: !settings.displayCachedIndicator })}
                            className="w-4 h-4 mt-0.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <label htmlFor="displayCachedIndicator-desktop" className="text-sm text-gray-700 cursor-pointer flex-1">
                            Display Cached Indicator
                          </label>
                        </div>
                      </Tooltip>
                    </div>
                  </CollapsibleGroup>
                </div>
              </CollapsibleGroup>

              {/* LLM Selection */}
              <CollapsibleGroup title="LLM" defaultExpanded={false} className="collapsible-group-top">
                <ModelSelection
                  selectedProvider={selectedProvider}
                  selectedModel={selectedModel}
                  apiKey={apiKey}
                  baseUrl={baseUrl}
                  modelConfig={modelConfig}
                  onProviderChange={setSelectedProvider}
                  onModelChange={setSelectedModel}
                  onApiKeyChange={setApiKey}
                  onBaseUrlChange={setBaseUrl}
                  onConfigChange={setModelConfig}
                />
                
                {/* Settings Sub-group - only show for Ollama */}
                {selectedProvider === 'ollama' && (
                  <CollapsibleGroup title="Settings" defaultExpanded={false} className="collapsible-group-nested">
                    <div className="flex flex-col space-y-3">
                      <Tooltip content="When enabled, the model will be unloaded from memory after each call to free up system resources. When disabled, the model stays loaded for faster subsequent calls.">
                        <div className="flex items-start space-x-2">
                          <input
                            type="checkbox"
                            id="unloadAfterCall"
                            checked={settings.unloadAfterCall}
                            onChange={() => updateSettings({ unloadAfterCall: !settings.unloadAfterCall })}
                            className="w-4 h-4 mt-0.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <label htmlFor="unloadAfterCall" className="text-sm text-gray-700 cursor-pointer flex-1">
                            Unload After Call
                          </label>
                        </div>
                      </Tooltip>
                    </div>
                  </CollapsibleGroup>
                )}
              </CollapsibleGroup>

              {/* Knowledge - PDF Upload */}
              <CollapsibleGroup title="Knowledge" defaultExpanded={false} className="collapsible-group-top">
                <RagUploader />
              </CollapsibleGroup>

              {/* Memory */}
              <CollapsibleGroup title="Memory" defaultExpanded={false} className="collapsible-group-top">
                <MemoryManagement
                  sessionId={sessionId}
                  onMemoryImport={importMemory}
                />
              </CollapsibleGroup>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 mobile-layout">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0 sticky z-20 top-0 mobile-header">
          <div className="flex items-center">
            {/* Desktop Sidebar Toggle */}
            <button
              onClick={toggleSidebar}
              className="hidden md:block mr-3 text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
              title="Open sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Mobile Menu Toggle */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden mr-3 text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
              title="Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <h1 className="text-xl font-semibold flex items-center">
              <span className="font-sans font-black text-slate-900 tracking-wider leading-none uppercase">AGENT</span>
              <span className="font-sans font-bold text-cyan-600 leading-none mx-1 italic transform -skew-x-6">AGENT</span>
              <span className="font-mono font-black text-white bg-gradient-to-r from-indigo-600 to-purple-600 px-2 py-1 rounded-md leading-none flex items-center justify-center shadow-lg border border-indigo-400 ml-1" style={{ minHeight: '1.5rem' }}>AI</span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Connection Status */}
            <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}></div>
            <span className="text-sm text-gray-500 hidden sm:inline">{getConnectionStatusText()}</span>

            {/* Memory Size Indicator (if available via metadata updates) */}
            {/* This assumes AppContext sets a memory size state and exposes it; for brevity, we can wire it here if needed */}
            
            {/* Rate Limit Indicator */}
            {isRateLimited && (
              <div className="flex items-center space-x-1 bg-red-100 px-2 py-1 rounded text-xs text-red-700">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{rateLimitCooldown}s</span>
              </div>
            )}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center space-x-1 bg-blue-100 px-2 py-1 rounded text-xs text-blue-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Typing...</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden fixed inset-0 z-50 bg-white mobile-menu flex flex-col overflow-y-auto transition-transform duration-300 ${showMobileMenu ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex items-center justify-between py-2 px-4 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-800">Settings</h3>
              <button
                onClick={toggleMobileMenu}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 pb-8 space-y-4">
                {/* Mobile-only prompts were here for isolation; now reverted to render within collapsible group */}
                {/* Chat */}
                <CollapsibleGroup title="Chat" defaultExpanded={false} className="collapsible-group-top">
                  <div className="space-y-4">
                    {/* System Sub-group */}
                    <CollapsibleGroup title="System" defaultExpanded={false} className="collapsible-group-nested">
                      <div className="flex flex-col space-y-3">
                        <ConditionalTooltip content="Global instructions that guide the assistant's behavior across all responses.">
                          <PromptTextarea
                            label="System Prompt"
                            value={settings.systemPrompt}
                            onChangeDebounced={(next) => updateTextSettings({ systemPrompt: next })}
                            placeholder="You are Agent Agent, a helpful AI assistant. Respond to the user's messages with useful advice."
                            className="w-full h-24 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </ConditionalTooltip>
                        <ConditionalTooltip content="A character or persona layer applied after the system prompt. Leave blank for none.">
                          <div>
                            <PromptTextarea
                              label="Character Prompt"
                              value={settings.characterPrompt || ''}
                              onChangeDebounced={(next) => updateTextSettings({ characterPrompt: next })}
                              placeholder="You are Agent Agent, a wise and intelligent software engineer and code reviewer."
                              className="w-full h-24 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                            <div className="text-xs text-gray-500 mt-1">If set, it is appended after the System Prompt.</div>
                          </div>
                        </ConditionalTooltip>
                      </div>
                    </CollapsibleGroup>
                    {/* Controls Sub-group */}
                    <CollapsibleGroup title="Controls" defaultExpanded={false} className="collapsible-group-nested">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={clearMessages}
                          className="px-3 py-2 text-sm bg-red-200 text-gray-700 rounded hover:bg-red-300 transition-colors"
                        >
                          Clear Chat
                        </button>
                        <button
                          onClick={() => retryLastMessage(settings)}
                          disabled={!messages.length || isLoading || isRateLimited}
                          className="px-3 py-2 text-sm bg-blue-200 text-blue-700 rounded hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Retry Last Message
                        </button>
                      </div>
                    </CollapsibleGroup>

                    {/* Settings Sub-group */}
                    <CollapsibleGroup title="Settings" defaultExpanded={false} className="collapsible-group-nested">
                      <div className="flex flex-col space-y-3">
                        <ConditionalTooltip content="Show which AI model (e.g., Gemini 1.5 Flash) was used to generate each response.">
                          <div className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              id="displayMessageModel-mobile"
                              checked={settings.displayMessageModel}
                              onChange={() => updateSettings({ displayMessageModel: !settings.displayMessageModel })}
                              className="w-4 h-4 mt-0.5 text-blue-700 bg-gray-100 border-gray-300 rounded focus:ring-blue-600 focus:ring-2"
                            />
                            <label htmlFor="displayMessageModel-mobile" className="text-sm text-gray-700 cursor-pointer flex-1">
                              Display Message Model
                            </label>
                          </div>
                        </ConditionalTooltip>

                        <ConditionalTooltip content="Show the number of tokens used in each request and response. Helps understand API usage costs.">
                          <div className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              id="displayMessageTokens-mobile"
                              checked={settings.displayMessageTokens}
                              onChange={() => updateSettings({ displayMessageTokens: !settings.displayMessageTokens })}
                              className="w-4 h-4 mt-0.5 text-blue-700 bg-gray-100 border-gray-300 rounded focus:ring-blue-600 focus:ring-2"
                            />
                            <label htmlFor="displayMessageTokens-mobile" className="text-sm text-gray-700 cursor-pointer flex-1">
                              Display Message Tokens
                            </label>
                          </div>
                        </ConditionalTooltip>

                        <ConditionalTooltip content="Show timestamps on messages to track when responses were generated.">
                          <div className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              id="displayTimestamp-mobile"
                              checked={settings.displayTimestamp}
                              onChange={() => updateSettings({ displayTimestamp: !settings.displayTimestamp })}
                              className="w-4 h-4 mt-0.5 text-blue-700 bg-gray-100 border-gray-300 rounded focus:ring-blue-600 focus:ring-2"
                            />
                            <label htmlFor="displayTimestamp-mobile" className="text-sm text-gray-700 cursor-pointer flex-1">
                              Display Timestamp
                            </label>
                          </div>
                        </ConditionalTooltip>

                        <ConditionalTooltip content="Show a lightning bolt icon on responses that were served from cache instead of generating a new response.">
                          <div className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              id="displayCachedIndicator-mobile"
                              checked={settings.displayCachedIndicator}
                              onChange={() => updateSettings({ displayCachedIndicator: !settings.displayCachedIndicator })}
                              className="w-4 h-4 mt-0.5 text-blue-700 bg-gray-100 border-gray-300 rounded focus:ring-blue-600 focus:ring-2"
                            />
                            <label htmlFor="displayCachedIndicator-mobile" className="text-sm text-gray-700 cursor-pointer flex-1">
                              Display Cached Indicator
                            </label>
                          </div>
                        </ConditionalTooltip>
                      </div>
                    </CollapsibleGroup>
                  </div>
                </CollapsibleGroup>

                {/* LLM Selection */}
                <CollapsibleGroup title="LLM" defaultExpanded={false} className="collapsible-group-top">
                  <ModelSelection
                    selectedProvider={selectedProvider}
                    selectedModel={selectedModel}
                    apiKey={apiKey}
                    baseUrl={baseUrl}
                    modelConfig={modelConfig}
                    onProviderChange={setSelectedProvider}
                    onModelChange={setSelectedModel}
                    onApiKeyChange={setApiKey}
                    onBaseUrlChange={setBaseUrl}
                    onConfigChange={setModelConfig}
                  />
                  
                  {/* Settings Sub-group - only show for Ollama */}
                  {selectedProvider === 'ollama' && (
                    <CollapsibleGroup title="Settings" defaultExpanded={false} className="collapsible-group-nested">
                      <div className="flex flex-col space-y-3">
                        <ConditionalTooltip content="When enabled, the model will be unloaded from memory after each call to free up system resources. When disabled, the model stays loaded for faster subsequent calls.">
                          <div className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              id="unloadAfterCall-mobile"
                              checked={settings.unloadAfterCall}
                              onChange={() => updateSettings({ unloadAfterCall: !settings.unloadAfterCall })}
                              className="w-4 h-4 mt-0.5 text-blue-700 bg-gray-100 border-gray-300 rounded focus:ring-blue-600 focus:ring-2"
                            />
                            <label htmlFor="unloadAfterCall-mobile" className="text-sm text-gray-700 cursor-pointer flex-1">
                              Unload After Call
                            </label>
                          </div>
                        </ConditionalTooltip>
                      </div>
                    </CollapsibleGroup>
                  )}
                </CollapsibleGroup>

                {/* Knowledge - PDF Upload (mobile) */}
                <CollapsibleGroup title="Knowledge" defaultExpanded={false} className="collapsible-group-top">
                  <RagUploader />
                </CollapsibleGroup>

                {/* Memory - Mobile */}
                <CollapsibleGroup title="Memory" defaultExpanded={false} className="collapsible-group-top">
                  <MemoryManagement
                    sessionId={sessionId}
                    onMemoryImport={importMemory}
                  />
                </CollapsibleGroup>
              </div>
            </div>
          </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 mobile-messages">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-lg font-medium">Start a conversation</p>
                <p className="text-sm">Send a message to begin chatting with Agent Agent.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Model Loading/Unloading Indicator */}
              {(isModelLoading || isModelUnloading || isProviderBusy) && (
                <div className="flex justify-center mb-4">
                  <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                    <span className="text-sm">
                      {isModelLoading ? `Loading model...` :
                       isModelUnloading ? `Unloading model...` :
                       `Model is busy...`}
                    </span>
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                      msg.sender === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : (msg.metadata?.isIndicator
                            ? 'bg-gray-50 text-gray-600 border border-dashed border-gray-300 italic rounded-bl-none'
                            : (msg.metadata?.isError ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'))
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {msg.sender === 'agent' && (msg as any).category && (
                        <span className={`${
                          (msg as any).category === 'Knowledge' ? 'bg-purple-100 text-purple-700' :
                          (msg as any).category === 'Request' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        } text-xs px-2 py-0.5 rounded-full`}>{(msg as any).category}</span>
                      )}
                      <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                    </div>
                    
                    {/* Message Metadata */}
                    {msg.metadata && !msg.metadata.isIndicator && (settings.displayTimestamp || settings.displayMessageModel || settings.displayMessageTokens || (settings.displayCachedIndicator && msg.metadata.isCached)) && (
                      <div className={`mt-2 text-xs ${msg.sender === 'user' ? 'text-blue-100' : (msg.metadata?.isError ? 'text-red-700' : 'text-gray-500')}`}>
                        <div className="flex items-center justify-between">
                          {settings.displayTimestamp && (
                            <span>{formatTimestamp(msg.metadata.timestamp)}</span>
                          )}
                          {settings.displayMessageModel && msg.metadata.model && (
                            <span className="ml-2 px-1 py-0.5 bg-gray-200 rounded text-gray-600">
                              {msg.metadata.model}
                            </span>
                          )}
                          {/* Provider errors are now separate messages; no inline badges */}
                          {settings.displayCachedIndicator && msg.metadata.isCached && msg.sender === 'agent' && (
                            <span className="ml-2 px-1 py-0.5 bg-green-100 text-green-700 rounded">Cached</span>
                          )}
                        </div>
                        {settings.displayMessageTokens && msg.sender === 'agent' && !(settings.displayCachedIndicator && msg.metadata.isCached) && (
                          msg.metadata.usage ? (
                            <div className="mt-1 text-xs opacity-75">
                              Input: {msg.metadata.usage.promptTokens} | Output: {msg.metadata.usage.completionTokens} | Total: {msg.metadata.usage.totalTokens}
                            </div>
                          ) : (
                            <div className="mt-1 text-xs opacity-75 text-gray-500">
                              No token data available
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 border border-gray-200 rounded-lg rounded-bl-none px-4 py-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm text-gray-500">Agent Agent is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Fixed at Bottom */}
        <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0 bottom-0 z-20 mobile-input">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              {/* Desktop Input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  (isRateLimited && selectedProvider === 'gemini') ? `Rate limited. Wait ${rateLimitCooldown}s...` :
                  (isModelBusy && selectedProvider === 'ollama') ? (modelBusyText || 'Model is busy...') :
                  (isBuiltInProviderBusy && selectedProvider === 'gemini') ? 'Built-In model is busy (global rate limit)...' :
                  isModelLoading ? 'Loading model...' :
                  isModelUnloading ? 'Unloading model...' :
                  isProviderBusy ? 'Model is busy...' :
                  "Type your message..."
                }
                className="hidden md:block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isModelBusy && selectedProvider === 'ollama' || isModelLoading || isModelUnloading || isProviderBusy || (isBuiltInProviderBusy && selectedProvider === 'gemini')}
              />
              
              {/* Mobile Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  (isRateLimited && selectedProvider === 'gemini') ? `Rate limited. Wait ${rateLimitCooldown}s...` :
                  (isModelBusy && selectedProvider === 'ollama') ? (modelBusyText || 'Model is busy...') :
                  (isBuiltInProviderBusy && selectedProvider === 'gemini') ? 'Built-In model is busy (global rate limit)...' :
                  isModelLoading ? 'Loading model...' :
                  isModelUnloading ? 'Unloading model...' :
                  isProviderBusy ? 'Model is busy...' :
                  "Type your message..."
                }
                className="md:hidden w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                rows={1}
                disabled={isModelBusy && selectedProvider === 'ollama' || isModelLoading || isModelUnloading || isProviderBusy || (isBuiltInProviderBusy && selectedProvider === 'gemini')}
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={isLoading || ((isRateLimited && selectedProvider === 'gemini')) || (isModelBusy && selectedProvider === 'ollama') || (isBuiltInProviderBusy && selectedProvider === 'gemini') || isModelLoading || isModelUnloading || isProviderBusy || input.trim() === ""}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0 min-w-[60px] active:scale-95"
              type="button"
              title="Send message"
            >
              {isLoading || ((isRateLimited && selectedProvider === 'gemini')) || (isModelBusy && selectedProvider === 'ollama') || (isBuiltInProviderBusy && selectedProvider === 'gemini') || isModelLoading || isModelUnloading || isProviderBusy || input.trim() === "" ? (
                // Caution triangle icon when disabled
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              ) : (
                // Right-facing arrow when active
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Rate Limit / Busy Warning */}
          {isRateLimited && selectedProvider === 'gemini' && (
            <div className="mt-2 text-xs text-red-600 text-center">
              Rate limit active. You can send 1 message per minute.
            </div>
          )}
          {isModelBusy && selectedProvider === 'ollama' && (
            <div className="mt-2 text-xs text-amber-600 text-center">
              {modelBusyText || 'Model is busy (loading/unloading). Please wait...'}
            </div>
          )}
          {isBuiltInProviderBusy && selectedProvider === 'gemini' && (
            <div className="mt-2 text-xs text-orange-600 text-center">
              Built-In model is busy due to global rate limit. Please try again shortly.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary
