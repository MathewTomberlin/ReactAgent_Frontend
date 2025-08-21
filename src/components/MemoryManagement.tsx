import React, { useState } from 'react';
import { exportSessionMemory, importSessionMemory, clearLongTermMemoryEndpoint, clearAllMemoryEndpoint, type SessionMemory } from '../api/FastAPIClient';
import { useSettings } from '../context/SettingsContext';
import { ConditionalTooltip } from '../utils/uiUtils';
import { CollapsibleGroup } from './CollapsibleGroup';

interface MemoryManagementProps {
  sessionId: string;
  onMemoryImport: (memoryToken?: string, memoryChunks?: string[]) => void;
}

export const MemoryManagement: React.FC<MemoryManagementProps> = React.memo(({
  sessionId,
  onMemoryImport,
}) => {
  const { settings, updateSettings } = useSettings();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearingLong, setIsClearingLong] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [exportMessage, setExportMessage] = useState<string>('');
  const [importMessage, setImportMessage] = useState<string>('');
  const [clearMessage, setClearMessage] = useState<string>('');

  const handleExport = async () => {
    if (!sessionId) {
      setExportMessage('No active session to export');
      return;
    }

    setIsExporting(true);
    setExportMessage('');

    try {
      // Get current memory tokens from localStorage
      const memKey = `mem:${sessionId}`;
      const raw = localStorage.getItem(memKey);
      let memory: { token?: string; chunks?: string[] } | undefined;
      if (raw) {
        try {
          memory = JSON.parse(raw);
        } catch (e) {
          // If parsing fails, continue without memory tokens
        }
      }

      const memoryData = await exportSessionMemory(sessionId, memory?.token, memory?.chunks);

      // Create and download the JSON file
      const blob = new Blob([JSON.stringify(memoryData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `session-memory-${sessionId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportMessage('✅ Memory exported successfully');
    } catch (error) {
      setExportMessage(`❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      setImportMessage('❌ Please select a JSON file');
      return;
    }

    setIsImporting(true);
    setImportMessage('');

    try {
      const fileContent = await file.text();
      const memoryData: SessionMemory = JSON.parse(fileContent);

      const result = await importSessionMemory(memoryData);

      // Update the memory in the app context
      onMemoryImport(result.memoryToken, result.memoryChunks);

      setImportMessage('✅ Memory imported successfully');
    } catch (error) {
      setImportMessage(`❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleClearLongTerm = async () => {
    if (!sessionId) {
      setClearMessage('No active session');
      return;
    }

    setIsClearingLong(true);
    setClearMessage('');

    try {
      // Get current memory tokens from localStorage
      const memKey = `mem:${sessionId}`;
      const raw = localStorage.getItem(memKey);
      let memory: { token?: string; chunks?: string[] } | undefined;
      if (raw) {
        try {
          memory = JSON.parse(raw);
        } catch (e) {
          // Continue without memory
        }
      }

      const result = await clearLongTermMemoryEndpoint(sessionId, memory?.token, memory?.chunks);
      onMemoryImport(result.memoryToken, result.memoryChunks);
      setClearMessage('✅ Long-term memory cleared');
    } catch (error) {
      setClearMessage(`❌ Failed to clear long-term memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsClearingLong(false);
    }
  };

  const handleClearAll = async () => {
    if (!sessionId) {
      setClearMessage('No active session');
      return;
    }

    setIsClearingAll(true);
    setClearMessage('');

    try {
      const result = await clearAllMemoryEndpoint(sessionId);
      onMemoryImport(result.memoryToken, result.memoryChunks);
      setClearMessage('✅ All memory cleared');
    } catch (error) {
      setClearMessage(`❌ Failed to clear all memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Settings */}
      <CollapsibleGroup title="Settings" defaultExpanded={false}>
        <div className="flex flex-col space-y-3">
          <ConditionalTooltip content="When enabled, the agent won't use extracted facts, preferences, or goals from memory, but will still use recent conversation turns for context.">
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="disableLongMemoryRecall"
                checked={settings.disableLongMemoryRecall}
                onChange={(e) => updateSettings({ disableLongMemoryRecall: e.target.checked })}
                className="w-4 h-4 mt-0.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="disableLongMemoryRecall" className="text-sm text-gray-700 cursor-pointer flex-1">
                Disable Long Recall
              </label>
            </div>
          </ConditionalTooltip>

          <ConditionalTooltip content="When enabled, the agent won't use any memory at all, including recent conversation turns. Each message will be processed independently.">
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="disableAllMemoryRecall"
                checked={settings.disableAllMemoryRecall}
                onChange={(e) => updateSettings({ disableAllMemoryRecall: e.target.checked })}
                className="w-4 h-4 mt-0.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="disableAllMemoryRecall" className="text-sm text-gray-700 cursor-pointer flex-1">
                Disable All Recall
              </label>
            </div>
          </ConditionalTooltip>
        </div>
      </CollapsibleGroup>

      {/* Transfer */}
      <CollapsibleGroup title="Transfer" defaultExpanded={false}>
        <div className="space-y-3">
          <div>
            <button
              onClick={handleExport}
              disabled={isExporting || !sessionId}
              className="w-full px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExporting ? 'Exporting...' : '📤 Export Memory'}
            </button>
            {exportMessage && (
              <p className="text-xs mt-1 text-gray-600 break-words">{exportMessage}</p>
            )}
          </div>

          <div>
            <label className="block w-full px-3 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 cursor-pointer transition-colors text-center">
              {isImporting ? 'Importing...' : '📥 Import Memory'}
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={isImporting}
                className="hidden"
              />
            </label>
            {importMessage && (
              <p className="text-xs mt-1 text-gray-600 break-words">{importMessage}</p>
            )}
          </div>
        </div>
      </CollapsibleGroup>

      {/* Clearing */}
      <CollapsibleGroup title="Clearing" defaultExpanded={false}>
        <div className="space-y-3">
          <ConditionalTooltip content="Clears extracted facts, preferences, and goals but keeps conversation history and summary for context.">
            <div>
              <button
                onClick={handleClearLongTerm}
                disabled={isClearingLong || !sessionId}
                className="w-full px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isClearingLong ? 'Clearing...' : '🧹 Clear Long Memory'}
              </button>
            </div>
          </ConditionalTooltip>

          <ConditionalTooltip content="Clears ALL memory including conversation history, facts, and summary. Starts completely fresh.">
            <div>
              <button
                onClick={handleClearAll}
                disabled={isClearingAll || !sessionId}
                className="w-full px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isClearingAll ? 'Clearing...' : '💥 Clear All Memory'}
              </button>
            </div>
          </ConditionalTooltip>

          {clearMessage && (
            <p className="text-xs mt-1 text-gray-600 break-words">{clearMessage}</p>
          )}
        </div>
      </CollapsibleGroup>


    </div>
  );
});

MemoryManagement.displayName = 'MemoryManagement';
