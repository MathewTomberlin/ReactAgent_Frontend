import { useRef, useEffect } from 'react';
import { applyMobileTextareaFix } from '../utils/mobileTextareaFix';

export const useMobileTextarea = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !isMobile) return;

    // Add a small delay to ensure the textarea is fully rendered
    const timeoutId = setTimeout(() => {
      // Apply mobile fix
      const cleanup = applyMobileTextareaFix(textarea);
      if (cleanup) {
        cleanupRef.current = cleanup;
      }
    }, 10);

    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [isMobile]);

  return textareaRef;
};
