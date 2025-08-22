// Mobile viewport utility to handle keyboard visibility
export const initializeMobileViewport = () => {
  // Only run on mobile devices
  if (typeof window === 'undefined' || window.innerWidth > 768) {
    return () => {}; // Return empty cleanup function
  }

  // Enable Virtual Keyboard API with viewport resizing behavior
  if ('virtualKeyboard' in navigator) {
    (navigator as any).virtualKeyboard.overlaysContent = false;
    console.log('Virtual Keyboard API enabled with overlaysContent = false');
  }

  // Track keyboard state and height
  let isKeyboardVisible = false;
  let keyboardHeight = 0;

  // Set keyboard visible state with dynamic height adjustment
  const setKeyboardVisible = (visible: boolean, height: number = 0) => {
    if (visible !== isKeyboardVisible || keyboardHeight !== height) {
      isKeyboardVisible = visible;
      keyboardHeight = height;
      console.log('Keyboard visibility changed:', visible, 'Height:', height);

      if (visible) {
        document.body.classList.add('keyboard-visible');
        document.documentElement.classList.add('keyboard-visible');
        // Set custom CSS property for dynamic height adjustment
        document.documentElement.style.setProperty('--keyboard-height', `${height}px`);
      } else {
        document.body.classList.remove('keyboard-visible');
        document.documentElement.classList.remove('keyboard-visible');
        document.documentElement.style.removeProperty('--keyboard-height');
      }
    }
  };

  // Use Visual Viewport API for accurate keyboard detection
  if (window.visualViewport) {
    const handleVisualViewportChange = () => {
      const currentHeight = window.visualViewport!.height;
      const heightDifference = window.innerHeight - currentHeight;
      const keyboardDetected = heightDifference > 150; // Keyboard is typically >150px
      
      console.log('Visual viewport change:', {
        windowHeight: window.innerHeight,
        currentHeight,
        heightDifference,
        keyboardDetected
      });
      
      if (keyboardDetected) {
        setKeyboardVisible(true, heightDifference);
      } else {
        setKeyboardVisible(false, 0);
      }
    };

    // Initial check
    handleVisualViewportChange();
    
    window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleVisualViewportChange);
      // Clean up any classes that might have been added
      document.body.classList.remove('keyboard-visible');
      document.documentElement.classList.remove('keyboard-visible');
      document.documentElement.style.removeProperty('--keyboard-height');
    };
  }

  // Fallback to focus events for older browsers
  const handleInputFocus = (event: FocusEvent) => {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      setKeyboardVisible(true, 250); // Default keyboard height
    }
  };

  const handleInputBlur = (event: FocusEvent) => {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      setTimeout(() => {
        const activeElement = document.activeElement;
        if (!activeElement || (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA')) {
          setKeyboardVisible(false, 0);
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
    // Clean up any classes that might have been added
    document.body.classList.remove('keyboard-visible');
    document.documentElement.classList.remove('keyboard-visible');
  };
};
