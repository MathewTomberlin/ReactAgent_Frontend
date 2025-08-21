// Mobile viewport utility to handle keyboard visibility
export const initializeMobileViewport = () => {
  // Only run on mobile devices
  if (typeof window === 'undefined' || window.innerWidth > 768) {
    return;
  }

  // Track keyboard state
  let isKeyboardVisible = false;

  // Set keyboard visible state
  const setKeyboardVisible = (visible: boolean) => {
    if (visible !== isKeyboardVisible) {
      isKeyboardVisible = visible;

      if (visible) {
        // Add keyboard visible class
        document.body.classList.add('keyboard-visible');
        document.documentElement.classList.add('keyboard-visible');
      } else {
        // Remove keyboard visible class
        document.body.classList.remove('keyboard-visible');
        document.documentElement.classList.remove('keyboard-visible');
      }
    }
  };

  // Handle input focus (keyboard appears)
  const handleInputFocus = (event: FocusEvent) => {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      setKeyboardVisible(true);
    }
  };

  // Handle input blur (keyboard disappears)
  const handleInputBlur = (event: FocusEvent) => {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      // Use a longer delay to avoid conflicts with textarea focus restoration
      setTimeout(() => {
        const activeElement = document.activeElement;
        // Only hide keyboard if we're definitely not focused on any input/textarea
        // and the target is still not focused (meaning focus restoration didn't occur)
        if (!activeElement || (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA')) {
          // Double-check after another brief delay to account for focus restoration
          setTimeout(() => {
            const currentActive = document.activeElement;
            if (!currentActive || (currentActive.tagName !== 'INPUT' && currentActive.tagName !== 'TEXTAREA')) {
              setKeyboardVisible(false);
            }
          }, 50);
        }
      }, 150); // Increased from 100ms to 150ms to account for focus restoration
    }
  };

  // Add focus/blur event listeners (do not use passive=false that might block browser behavior)
  document.addEventListener('focusin', handleInputFocus, true);
  document.addEventListener('focusout', handleInputBlur, true);

  return () => {
    document.removeEventListener('focusin', handleInputFocus, true);
    document.removeEventListener('focusout', handleInputBlur, true);
  };
};
