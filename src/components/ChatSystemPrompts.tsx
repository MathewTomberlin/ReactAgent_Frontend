import React from 'react';
import { Tooltip } from './Tooltip';
import { PromptTextarea } from './PromptTextarea';
import { PromptInputMobile } from './PromptInputMobile';
import { useIsMobile } from '../utils/uiUtils';

interface ChatSystemPromptsProps {
  systemPrompt: string;
  characterPrompt: string;
  onDebouncedChange: (update: { systemPrompt?: string; characterPrompt?: string }) => void;
  onImmediateCommit: (update: { systemPrompt?: string; characterPrompt?: string }) => void;
}

export const ChatSystemPrompts: React.FC<ChatSystemPromptsProps> = React.memo(({ systemPrompt, characterPrompt, onDebouncedChange, onImmediateCommit }) => {
  const mobile = useIsMobile();

  return (
    <div className="flex flex-col space-y-3">
      <Tooltip content="Global instructions that guide the assistant's behavior across all responses.">
        {mobile ? (
          <PromptInputMobile
            label="System Prompt"
            value={systemPrompt}
            onCommit={(next) => onImmediateCommit({ systemPrompt: next })}
            placeholder="You are Agent Agent, a helpful AI assistant. Respond to the user's messages with useful advice."
            className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        ) : (
          <PromptTextarea
            label="System Prompt"
            value={systemPrompt}
            onChangeDebounced={(next) => onDebouncedChange({ systemPrompt: next })}
            onCommitImmediate={(next) => onImmediateCommit({ systemPrompt: next })}
            placeholder="You are Agent Agent, a helpful AI assistant. Respond to the user's messages with useful advice."
            className="w-full h-24 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        )}
      </Tooltip>
      <Tooltip content="A character or persona layer applied after the system prompt. Leave blank for none.">
        <div>
          {mobile ? (
            <PromptInputMobile
              label="Character Prompt"
              value={characterPrompt || ''}
              onCommit={(next) => onImmediateCommit({ characterPrompt: next })}
              placeholder="You are Agent Agent, a wise and intelligent software engineer and code reviewer."
              className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          ) : (
            <PromptTextarea
              label="Character Prompt"
              value={characterPrompt || ''}
              onChangeDebounced={(next) => onDebouncedChange({ characterPrompt: next })}
              onCommitImmediate={(next) => onImmediateCommit({ characterPrompt: next })}
              placeholder="You are Agent Agent, a wise and intelligent software engineer and code reviewer."
              className="w-full h-24 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          )}
          <div className="text-xs text-gray-500 mt-1">If set, it is appended after the System Prompt.</div>
        </div>
      </Tooltip>
    </div>
  );
});

ChatSystemPrompts.displayName = 'ChatSystemPrompts';


