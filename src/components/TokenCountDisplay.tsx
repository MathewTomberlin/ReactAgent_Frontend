import React, { useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';

interface TokenCountDisplayProps {
  currentPrompt: string;
}

// Advanced token estimation function based on GPT tokenization patterns
const estimateTokens = (text: string): number => {
  if (!text || text.length === 0) return 0;
  
  // This is a more accurate estimation based on GPT tokenization research
  // GPT tokens are typically 0.75 words on average, with common words being 1 token
  // and rare words/special characters being multiple tokens
  
  let tokenCount = 0;
  let i = 0;
  
  while (i < text.length) {
    const char = text[i];
    
    if (/[a-zA-Z]/.test(char)) {
      // Handle words - most common case
      let wordLength = 0;
      let hasUpperCase = false;
      
      while (i < text.length && /[a-zA-Z]/.test(text[i])) {
        if (/[A-Z]/.test(text[i])) hasUpperCase = true;
        wordLength++;
        i++;
      }
      
      // Estimate tokens based on word characteristics
      if (wordLength <= 3) {
        tokenCount += 1; // Short words are usually 1 token
      } else if (wordLength <= 6) {
        tokenCount += hasUpperCase ? 1 : 1; // Common words with caps
      } else if (wordLength <= 10) {
        tokenCount += Math.ceil(wordLength / 4); // Medium words
      } else {
        tokenCount += Math.ceil(wordLength / 3); // Long words
      }
    } else if (/[0-9]/.test(char)) {
      // Handle numbers
      let numLength = 0;
      while (i < text.length && /[0-9]/.test(text[i])) {
        numLength++;
        i++;
      }
      tokenCount += Math.ceil(numLength / 3); // Numbers are typically 1 token per 3 digits
    } else if (/\s/.test(char)) {
      // Handle whitespace - usually 1 token per sequence
      tokenCount += 1;
      while (i < text.length && /\s/.test(text[i])) {
        i++;
      }
    } else if (/[.,!?;:]/.test(char)) {
      // Common punctuation - usually 1 token
      tokenCount += 1;
      i++;
    } else if (/['"`]/.test(char)) {
      // Quotes - usually 1 token
      tokenCount += 1;
      i++;
    } else if (/[()[\]{}]/.test(char)) {
      // Brackets - usually 1 token
      tokenCount += 1;
      i++;
    } else if (/[+\-*/=<>]/.test(char)) {
      // Math symbols - usually 1 token
      tokenCount += 1;
      i++;
    } else if (/[#$%&@]/.test(char)) {
      // Special symbols - usually 1 token
      tokenCount += 1;
      i++;
    } else {
      // Other characters (emojis, unicode, etc.) - can be multiple tokens
      const charCode = char.charCodeAt(0);
      if (charCode > 127) {
        // Non-ASCII characters (emojis, unicode) are often multiple tokens
        tokenCount += Math.ceil(char.length / 2);
      } else {
        tokenCount += 1;
      }
      i++;
    }
  }
  
  return Math.max(1, tokenCount);
};

export const TokenCountDisplay: React.FC<TokenCountDisplayProps> = ({ currentPrompt }) => {
  const { settings } = useSettings();

  // Default system prompt used by backend when none is provided
  const defaultSystemPrompt = "You are a helpful AI assistant. Provide clear, concise, and helpful responses. Keep your response under 150 words.";
  
  // Use custom system prompt if provided, otherwise use default
  const effectiveSystemPrompt = settings.systemPrompt && settings.systemPrompt.trim().length > 0 
    ? settings.systemPrompt.trim() 
    : defaultSystemPrompt;

  // Calculate token counts using improved estimation
  const tokenCounts = useMemo(() => {
    const systemTokens = estimateTokens(effectiveSystemPrompt);
    const characterTokens = settings.characterPrompt ? estimateTokens(settings.characterPrompt) : 0;
    const promptTokens = currentPrompt ? estimateTokens(currentPrompt) : 0;
    
    return { systemTokens, characterTokens, promptTokens };
  }, [effectiveSystemPrompt, settings.characterPrompt, currentPrompt]);

  // Only show if there are any prompts
  if (tokenCounts.systemTokens === 0 && tokenCounts.characterTokens === 0 && tokenCounts.promptTokens === 0) {
    return null;
  }

  return (
    <div className="text-xs text-gray-500 mb-2 px-1">
      <span className="font-medium">Tokens:</span>
      <span className="ml-2">
        System: {tokenCounts.systemTokens}
      </span>
      {tokenCounts.characterTokens > 0 && (
        <span className="ml-2">
          Character: {tokenCounts.characterTokens}
        </span>
      )}
      {tokenCounts.promptTokens > 0 && (
        <span className="ml-2">
          Prompt: {tokenCounts.promptTokens}
        </span>
      )}
    </div>
  );
};
