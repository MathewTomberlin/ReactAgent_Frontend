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
      setTimeout(() => {
        const activeElement = document.activeElement;
        if (!activeElement || (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA')) {
          setKeyboardVisible(false);
        }
      }, 100);
    }
  };

  // Add focus/blur event listeners
  document.addEventListener('focusin', handleInputFocus, true);
  document.addEventListener('focusout', handleInputBlur, true);

  return () => {
    document.removeEventListener('focusin', handleInputFocus, true);
    document.removeEventListener('focusout', handleInputBlur, true);
  };
};
