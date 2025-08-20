import { useSettings } from '../context/SettingsContext';
import { Tooltip } from './Tooltip';

export const ChatSettings = () => {
  const { settings, updateSettings } = useSettings();

  const handleSettingChange = (setting: keyof typeof settings) => {
    updateSettings({ [setting]: !settings[setting] });
  };

  return (
    <div className="space-y-3">
      <Tooltip content="Show which AI model (e.g., Gemini 1.5 Flash) was used to generate each response.">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700 cursor-pointer">
            Display Message Model
          </label>
          <input
            type="checkbox"
            checked={settings.displayMessageModel}
            onChange={() => handleSettingChange('displayMessageModel')}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ml-2"
          />
        </div>
      </Tooltip>

      <Tooltip content="Show the number of tokens used in each request and response. Helps understand API usage costs.">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700 cursor-pointer">
            Display Message Tokens
          </label>
          <input
            type="checkbox"
            checked={settings.displayMessageTokens}
            onChange={() => handleSettingChange('displayMessageTokens')}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ml-2"
          />
        </div>
      </Tooltip>

      <Tooltip content="Show timestamps on messages to track when responses were generated.">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700 cursor-pointer">
            Display Timestamp
          </label>
          <input
            type="checkbox"
            checked={settings.displayTimestamp}
            onChange={() => handleSettingChange('displayTimestamp')}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ml-2"
          />
        </div>
      </Tooltip>

      <Tooltip content="Show a lightning bolt icon on responses that were served from cache instead of generating a new response.">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700 cursor-pointer">
            Display Cached Indicator
          </label>
          <input
            type="checkbox"
            checked={settings.displayCachedIndicator}
            onChange={() => handleSettingChange('displayCachedIndicator')}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ml-2"
          />
        </div>
      </Tooltip>
    </div>
  );
};
