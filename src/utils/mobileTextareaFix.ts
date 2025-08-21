// Mobile Textarea Focus Fix Utility
// Handles mobile-specific textarea focus issues

export const applyMobileTextareaFix = (textarea: HTMLTextAreaElement) => {
  if (typeof window === 'undefined' || window.innerWidth > 768) {
    return; // Only apply on mobile devices
  }

  let focusTimeout: number;
  let isMobileFocused = false;
  let userInitiatedBlur = false;

  const onDocTouchStart = (e: TouchEvent) => {
    const target = e.target as Node | null;
    userInitiatedBlur = !!(target && !textarea.contains(target));
  };
  const onDocMouseDown = (e: MouseEvent) => {
    const target = e.target as Node | null;
    userInitiatedBlur = !!(target && !textarea.contains(target));
  };

  const handleTouchStart = (_e: TouchEvent) => {
    // Clear any existing timeout
    if (focusTimeout) {
      clearTimeout(focusTimeout);
    }

    // Only set focus if we're not already focused or if focus was lost
    if (document.activeElement !== textarea) {
      // Set focus after a short delay to ensure touch is complete
      focusTimeout = setTimeout(() => {
        // Double-check that we still need to focus (might have been focused by another handler)
        if (document.activeElement !== textarea && textarea.isConnected && !textarea.hidden) {
          textarea.focus();
          isMobileFocused = true;

          // Ensure cursor is at the end
          const len = textarea.value.length;
          textarea.setSelectionRange(len, len);
        }
      }, 10); // Reduced from 50ms to 10ms for better responsiveness
    }
  };

  const handleFocus = () => {
    isMobileFocused = true;
    textarea.classList.add('mobile-textarea-focused');
  };

  const handleBlur = (e: FocusEvent) => {
    // Use a shorter delay and better logic to prevent premature blur on mobile
    setTimeout(() => {
      const activeElement = document.activeElement;
      if (activeElement !== textarea) {
        // Check if blur was due to scrolling or layout changes (common on mobile)
        const relatedTarget = e.relatedTarget as Node | null;
        const isScrollingBlur = !relatedTarget && !userInitiatedBlur;

        if (isScrollingBlur) {
          // For scrolling/layout-induced blur, try to restore focus immediately
          // but only if the textarea still exists and is visible
          if (textarea && textarea.isConnected && !textarea.hidden) {
            textarea.focus();
            const len = textarea.value.length;
            try { textarea.setSelectionRange(len, len); } catch {}
            isMobileFocused = true;
            textarea.classList.add('mobile-textarea-focused');
          }
        } else if (!userInitiatedBlur) {
          // Other programmatic blur - restore focus after a brief delay
          setTimeout(() => {
            if (textarea && textarea.isConnected && !textarea.hidden && document.activeElement !== textarea) {
              textarea.focus();
              const len = textarea.value.length;
              try { textarea.setSelectionRange(len, len); } catch {}
              isMobileFocused = true;
              textarea.classList.add('mobile-textarea-focused');
            }
          }, 50);
        } else {
          isMobileFocused = false;
          textarea.classList.remove('mobile-textarea-focused');
        }
      }
      userInitiatedBlur = false;
    }, 50); // Reduced from 300ms to 50ms
  };

  const handleInput = () => {
    // Keep focus during input, but be more conservative to avoid loops
    if (document.activeElement !== textarea && textarea.isConnected && !textarea.hidden) {
      // Only restore focus if we were previously focused and lost focus during input
      if (isMobileFocused) {
        textarea.focus();
        const len = textarea.value.length;
        try { textarea.setSelectionRange(len, len); } catch {}
      }
    }
  };

  // Prevent zoom on iOS by ensuring minimum font size
  const originalFontSize = getComputedStyle(textarea).fontSize;
  const fontSizeValue = parseFloat(originalFontSize);
  if (fontSizeValue < 16) {
    textarea.style.fontSize = '16px';
  }

  // Add event listeners
  document.addEventListener('touchstart', onDocTouchStart, { capture: true, passive: true });
  document.addEventListener('mousedown', onDocMouseDown, { capture: true });
  textarea.addEventListener('touchstart', handleTouchStart, { passive: false });
  textarea.addEventListener('focus', handleFocus);
  textarea.addEventListener('blur', handleBlur);
  textarea.addEventListener('input', handleInput);

  // Cleanup function
  const cleanup = () => {
    if (focusTimeout) {
      clearTimeout(focusTimeout);
    }
    document.removeEventListener('touchstart', onDocTouchStart, { capture: true } as any);
    document.removeEventListener('mousedown', onDocMouseDown, { capture: true } as any);
    textarea.removeEventListener('touchstart', handleTouchStart);
    textarea.removeEventListener('focus', handleFocus);
    textarea.removeEventListener('blur', handleBlur);
    textarea.removeEventListener('input', handleInput);
  };

  return cleanup;
};

// CSS to be added for mobile textarea focus
export const getMobileTextareaCSS = () => `
  @media (max-width: 768px) {
    textarea {
      font-size: 16px !important;
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
      -webkit-touch-callout: default !important;
      -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1) !important;
      -webkit-appearance: none !important;
      /* Prevent zoom on input focus */
      -webkit-text-size-adjust: 100% !important;
      /* Improve touch responsiveness */
      -webkit-tap-highlight-color: transparent !important;
    }

    textarea:focus {
      outline: none !important;
      border-color: #3b82f6 !important;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
      background-color: #ffffff !important;
      /* Prevent viewport changes on focus */
      -webkit-user-select: text !important;
      -webkit-appearance: none !important;
    }

    .mobile-textarea-focused {
      border-color: #3b82f6 !important;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
    }

    /* Prevent text selection issues on mobile */
    textarea {
      -webkit-user-select: text !important;
      -khtml-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
    }

    /* Ensure textarea is properly sized for mobile */
    .mobile-menu textarea,
    .sidebar textarea {
      min-height: 44px !important;
      padding: 12px !important;
      /* Better mobile touch targets */
      line-height: 1.4 !important;
    }

    /* Prevent mobile browser zoom on focus */
    textarea,
    input[type="text"],
    input[type="textarea"] {
      font-size: 16px !important;
    }

    /* Fix for iOS Safari focus issues */
    @supports (-webkit-touch-callout: none) {
      textarea:focus {
        -webkit-user-select: text !important;
        -webkit-appearance: none !important;
        /* Prevent zoom on focus */
        font-size: 16px !important;
      }
    }
  }
`;
