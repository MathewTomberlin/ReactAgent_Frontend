import React, { useEffect, useRef, useState } from 'react';

interface PromptInputMobileProps {
  label: string;
  value: string;
  placeholder?: string;
  className?: string;
  onCommit: (next: string) => void;
}

// Mobile-only single-line input that is uncontrolled while focused to prevent focus loss
export const PromptInputMobile: React.FC<PromptInputMobileProps> = React.memo(({ label, value, placeholder, className, onCommit }) => {
  const [localValue, setLocalValue] = useState<string>(value ?? '');
  const isFocusedRef = useRef<boolean>(false);

  // Sync external value only when not focused
  useEffect(() => {
    if (!isFocusedRef.current && localValue !== (value ?? '')) {
      setLocalValue(value ?? '');
    }
  }, [value, localValue]);

  return (
    <div>
      <label className="text-sm text-gray-700 cursor-pointer block mb-1">{label}</label>
      <input
        type="text"
        value={localValue}
        onFocus={() => { isFocusedRef.current = true; }}
        onBlur={(e) => { isFocusedRef.current = false; const next = e.target.value; setLocalValue(next); onCommit(next); }}
        onChange={(e) => { setLocalValue(e.target.value); }}
        placeholder={placeholder}
        className={className || 'w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'}
        autoComplete="off"
        inputMode="text"
      />
    </div>
  );
});

PromptInputMobile.displayName = 'PromptInputMobile';


