import React, { useEffect, useMemo, useRef, useState } from 'react';

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

  // Sync external value into local when not actively editing
  useEffect(() => {
    // Avoid overwriting user input if recently edited or currently focused
    const recentlyEdited = (Date.now() - lastUserEditTsRef.current) < 1000; // Increased to 1 second
    if (isFocusedRef.current || recentlyEdited) return;
    
    // Only sync if the external value is actually different and we're not in the middle of typing
    if (localValue !== (value ?? '')) {
      setLocalValue(value ?? '');
    }
  }, [value, localValue]);

  // Debounce upstream updates
  const scheduleUpdate = useMemo(() => (next: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      onChangeDebounced(next);
      debounceTimerRef.current = null;
    }, 300); // Increased from 180ms to 300ms for better fast typing support
  }, [onChangeDebounced]);

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
        onFocus={() => { isFocusedRef.current = true; }}
        onBlur={() => { isFocusedRef.current = false; onCommitImmediate ? onCommitImmediate(localValue) : scheduleUpdate(localValue); }}
        onChange={(e) => { const next = e.target.value; lastUserEditTsRef.current = Date.now(); setLocalValue(next); scheduleUpdate(next); }}
        placeholder={placeholder}
        className={className || 'w-full h-24 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'}
        rows={rows}
      />
    </div>
  );
});

PromptTextarea.displayName = 'PromptTextarea';


