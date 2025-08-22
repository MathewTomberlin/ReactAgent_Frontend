import React, { useCallback, useEffect, useRef, useState } from 'react';

interface PromptTextareaProps {
  label: string;
  value: string;
  onChangeDebounced: (next: string) => void;
  onCommitImmediate?: (next: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

// Memoized textarea that keeps local state during typing and debounces updates upstream
export const PromptTextarea: React.FC<PromptTextareaProps> = React.memo(({ label, value, onChangeDebounced, onCommitImmediate, placeholder, className = '', rows = 6 }) => {
  const [localValue, setLocalValue] = useState<string>(value ?? '');
  const debounceTimerRef = useRef<number | null>(null);
  const isFocusedRef = useRef<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastUserEditTsRef = useRef<number>(0);
  const cursorPositionRef = useRef<{ start: number; end: number } | null>(null);

  // Preserve cursor position during re-renders
  const preserveCursorPosition = useCallback(() => {
    if (textareaRef.current && isFocusedRef.current) {
      try {
        cursorPositionRef.current = {
          start: textareaRef.current.selectionStart || 0,
          end: textareaRef.current.selectionEnd || 0
        };
      } catch (e) {
        // Ignore errors
      }
    }
  }, []);

  const restoreCursorPosition = useCallback(() => {
    if (textareaRef.current && isFocusedRef.current && cursorPositionRef.current) {
      try {
        textareaRef.current.setSelectionRange(
          cursorPositionRef.current.start,
          cursorPositionRef.current.end
        );
      } catch (e) {
        // Ignore errors
      }
    }
  }, []);

  // Sync external value into local when not actively editing
  useEffect(() => {
    // Avoid overwriting user input if recently edited or currently focused
    const recentlyEdited = (Date.now() - lastUserEditTsRef.current) < 2000; // Increased to 2 seconds
    if (isFocusedRef.current || recentlyEdited) return;
    
    // Only sync if the external value is actually different
    const externalValue = value ?? '';
    if (localValue !== externalValue) {
      preserveCursorPosition();
      setLocalValue(externalValue);
      // Restore cursor position after state update
      setTimeout(restoreCursorPosition, 0);
    }
  }, [value, localValue, preserveCursorPosition, restoreCursorPosition]);

  // Debounce upstream updates - simplified to avoid timing conflicts
  const scheduleUpdate = useCallback((next: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      // Only update if the value is still current (user hasn't typed more)
      if (textareaRef.current && textareaRef.current.value === next) {
        onChangeDebounced(next);
      }
      debounceTimerRef.current = null;
    }, 500); // Increased to 500ms to reduce conflicts
  }, [onChangeDebounced]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    lastUserEditTsRef.current = Date.now();
    preserveCursorPosition();
    setLocalValue(next);
    scheduleUpdate(next);
  }, [preserveCursorPosition, scheduleUpdate]);

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false;
    cursorPositionRef.current = null;
    
    // Cancel any pending debounced updates and commit immediately
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    if (onCommitImmediate) {
      onCommitImmediate(localValue);
    } else {
      onChangeDebounced(localValue);
    }
  }, [localValue, onCommitImmediate, onChangeDebounced]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div>
      <label className="text-sm text-gray-700 cursor-pointer block mb-1">{label}</label>
      <textarea
        ref={textareaRef}
        value={localValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        placeholder={placeholder}
        className={className || 'w-full h-24 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'}
        rows={rows}
      />
    </div>
  );
});

PromptTextarea.displayName = 'PromptTextarea';


