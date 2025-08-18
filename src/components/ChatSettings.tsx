import { useSettings } from '../context/SettingsContext';

export const ChatSettings = () => {
  const { settings, updateSettings } = useSettings();

  const handleSettingChange = (setting: keyof typeof settings) => {
    updateSettings({ [setting]: !settings[setting] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-700 cursor-pointer">
          Display Message Model
        </label>
        <input
          type="checkbox"
          checked={settings.displayMessageModel}
          onChange={() => handleSettingChange('displayMessageModel')}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
        />
      </div>
      
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-700 cursor-pointer">
          Display Message Tokens
        </label>
        <input
          type="checkbox"
          checked={settings.displayMessageTokens}
          onChange={() => handleSettingChange('displayMessageTokens')}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
        />
      </div>
      
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-700 cursor-pointer">
          Display Timestamp
        </label>
        <input
          type="checkbox"
          checked={settings.displayTimestamp}
          onChange={() => handleSettingChange('displayTimestamp')}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
        />
      </div>
    </div>
  );
};
