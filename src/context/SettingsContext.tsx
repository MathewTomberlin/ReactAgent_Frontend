import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface ChatSettings {
  displayMessageModel: boolean;
  displayMessageTokens: boolean;
  displayTimestamp: boolean;
}

interface SettingsContextType {
  settings: ChatSettings;
  updateSettings: (newSettings: Partial<ChatSettings>) => void;
  resetSettings: () => void;
  debugSettings: () => void;
}

const defaultSettings: ChatSettings = {
  displayMessageModel: true,
  displayMessageTokens: true,
  displayTimestamp: true,
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

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
        console.log('Loaded settings from localStorage:', parsed);
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
      console.log('Saved settings to localStorage:', settings);
    }
  }, [settings, isInitialized]);

  const updateSettings = (newSettings: Partial<ChatSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const debugSettings = () => {
    console.log('Current settings:', settings);
    console.log('localStorage value:', localStorage.getItem('chatSettings'));
    console.log('Is initialized:', isInitialized);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, debugSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
