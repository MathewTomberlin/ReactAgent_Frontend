import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';

interface ChatSettings {
  displayMessageModel: boolean;
  displayMessageTokens: boolean;
  displayTimestamp: boolean;
  displayCachedIndicator: boolean;
  disableLongMemoryRecall: boolean;
  disableAllMemoryRecall: boolean;
  systemPrompt: string;
  characterPrompt: string;
  unloadAfterCall: boolean;
}

interface SettingsContextType {
  settings: ChatSettings;
  updateSettings: (newSettings: Partial<ChatSettings>) => void;
  updateTextSettings: (newSettings: Partial<ChatSettings>) => void; // Debounced for text inputs
  updateTextSettingsImmediate: (newSettings: Partial<ChatSettings>) => void; // Immediate commit (e.g., onBlur)
  resetSettings: () => void;
  debugSettings: () => void;
}

const defaultSettings: ChatSettings = {
  displayMessageModel: true,
  displayMessageTokens: true,
  displayTimestamp: true,
  displayCachedIndicator: true,
  disableLongMemoryRecall: false,
  disableAllMemoryRecall: false,
  systemPrompt: '',
  characterPrompt: '',
  unloadAfterCall: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<ChatSettings>(defaultSettings);
  const [isInitialized, setIsInitialized] = useState(false);
  const debounceTimeoutRef = useRef<number | null>(null);
  const pendingTextUpdatesRef = useRef<Partial<ChatSettings>>({});

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
        setSettings(defaultSettings);
      }
    } else {
      console.log('No saved settings found, using defaults');
    }
    setIsInitialized(true);
  }, []);

  // Save settings to localStorage whenever they change (but only after initialization)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('chatSettings', JSON.stringify(settings));
    }
  }, [settings, isInitialized]);

  const updateSettings = (newSettings: Partial<ChatSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Debounced update for text inputs - simplified to reduce conflicts with component-level debouncing
  const updateTextSettings = useCallback((newSettings: Partial<ChatSettings>) => {
    // Merge with any pending updates
    pendingTextUpdatesRef.current = { ...pendingTextUpdatesRef.current, ...newSettings };

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout to apply updates - longer timeout to let component handle its own debouncing
    debounceTimeoutRef.current = setTimeout(() => {
      setSettings(prev => ({ ...prev, ...pendingTextUpdatesRef.current }));
      pendingTextUpdatesRef.current = {};
      debounceTimeoutRef.current = null;
    }, 600); // Increased to 600ms to avoid conflicts with PromptTextarea's 500ms debounce
  }, []);

  // Immediate update for text inputs, cancels any pending debounce and merges pending values
  const updateTextSettingsImmediate = useCallback((newSettings: Partial<ChatSettings>) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    const merged = { ...pendingTextUpdatesRef.current, ...newSettings };
    pendingTextUpdatesRef.current = {};
    setSettings(prev => ({ ...prev, ...merged }));
  }, []);

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const debugSettings = () => {
    console.log('Current settings:', settings);
    console.log('localStorage value:', localStorage.getItem('chatSettings'));
    console.log('Is initialized:', isInitialized);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, updateTextSettings, updateTextSettingsImmediate, resetSettings, debugSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
