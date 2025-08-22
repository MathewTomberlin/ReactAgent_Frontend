import { useSettings } from '../context/SettingsContext';
import { Tooltip } from './Tooltip';
import { useIsMobile } from '../utils/uiUtils';

// Conditional Tooltip component that only shows on desktop
const ConditionalTooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const isMobileDevice = useIsMobile();
  return isMobileDevice ? <>{children}</> : <Tooltip content={content}>{children as React.ReactElement}</Tooltip>;
};

export const ChatSettings = () => {
  const { settings, updateSettings } = useSettings();

  const handleSettingChange = (setting: keyof typeof settings) => {
    updateSettings({ [setting]: !settings[setting] });
  };

  return (
    <div className="space-y-4">
      <Tooltip content="Optional system prompt to guide the assistant. If set, it replaces the default system message for all requests.">
        <div>
          <label className="text-sm text-gray-700 cursor-pointer block mb-1">
            System Prompt
          </label>
          <textarea
            value={settings.systemPrompt}
            onChange={(e) => updateSettings({ systemPrompt: e.target.value })}
            placeholder="Enter a custom system prompt..."
            className="w-full h-24 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-xs text-gray-500 mt-1">Leave empty to use the default system behavior.</div>
        </div>
      </Tooltip>

      <div className="flex flex-col space-y-3">
        <ConditionalTooltip content="Show which AI model (e.g., Gemini 1.5 Flash) was used to generate each response.">
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="displayMessageModel"
              checked={settings.displayMessageModel}
              onChange={() => handleSettingChange('displayMessageModel')}
              className="w-4 h-4 mt-0.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="displayMessageModel" className="text-sm text-gray-700 cursor-pointer flex-1">
              Display Message Model
            </label>
          </div>
        </ConditionalTooltip>

        <ConditionalTooltip content="Show the number of tokens used in each request and response. Helps understand API usage costs.">
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="displayMessageTokens"
              checked={settings.displayMessageTokens}
              onChange={() => handleSettingChange('displayMessageTokens')}
              className="w-4 h-4 mt-0.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="displayMessageTokens" className="text-sm text-gray-700 cursor-pointer flex-1">
              Display Message Tokens
            </label>
          </div>
        </ConditionalTooltip>

        <ConditionalTooltip content="Show timestamps on messages to track when responses were generated.">
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="displayTimestamp"
              checked={settings.displayTimestamp}
              onChange={() => handleSettingChange('displayTimestamp')}
              className="w-4 h-4 mt-0.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="displayTimestamp" className="text-sm text-gray-700 cursor-pointer flex-1">
              Display Timestamp
            </label>
          </div>
        </ConditionalTooltip>

        <ConditionalTooltip content="Show a lightning bolt icon on responses that were served from cache instead of generating a new response.">
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="displayCachedIndicator"
              checked={settings.displayCachedIndicator}
              onChange={() => handleSettingChange('displayCachedIndicator')}
              className="w-4 h-4 mt-0.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="displayCachedIndicator" className="text-sm text-gray-700 cursor-pointer flex-1">
              Display Cached Indicator
            </label>
          </div>
        </ConditionalTooltip>
      </div>
    </div>
  );
};
