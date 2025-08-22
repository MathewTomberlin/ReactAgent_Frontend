import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = React.memo(({
  content,
  children,
  position = 'top',
}) => {
  // Mobile detection with window resize listener
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileDevice(typeof window !== 'undefined' && window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const showTimeoutRef = useRef<number | null>(null);

  const calculatePosition = () => {
    if (!triggerRef.current) return {};

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Use estimated dimensions for initial positioning
    const tooltipWidth = 200;
    const tooltipHeight = 60;
    const offset = 8;

    let top: number;
    let left: number;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipHeight - offset;
        left = triggerRect.left + (triggerRect.width - tooltipWidth) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = triggerRect.left + (triggerRect.width - tooltipWidth) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipHeight) / 2;
        left = triggerRect.left - tooltipWidth - offset;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipHeight) / 2;
        left = triggerRect.right + offset;
        break;
      default:
        top = triggerRect.top - tooltipHeight - offset;
        left = triggerRect.left + (triggerRect.width - tooltipWidth) / 2;
    }

    // Ensure tooltip stays within viewport
    const padding = 8;
    if (left < padding) left = padding;
    if (left + tooltipWidth > viewportWidth - padding) {
      left = viewportWidth - tooltipWidth - padding;
    }
    if (top < padding) top = padding;
    if (top + tooltipHeight > viewportHeight - padding) {
      top = viewportHeight - tooltipHeight - padding;
    }

    return {
      position: 'fixed' as const,
      top: `${Math.max(padding, top)}px`,
      left: `${Math.max(padding, left)}px`,
      zIndex: 9999,
      visibility: 'hidden' as const, // Hide initially to measure
    };
  };

  const updatePositionWithActualDimensions = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;
    const offset = 8;

    let top: number;
    let left: number;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipHeight - offset;
        left = triggerRect.left + (triggerRect.width - tooltipWidth) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = triggerRect.left + (triggerRect.width - tooltipWidth) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipHeight) / 2;
        left = triggerRect.left - tooltipWidth - offset;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipHeight) / 2;
        left = triggerRect.right + offset;
        break;
      default:
        top = triggerRect.top - tooltipHeight - offset;
        left = triggerRect.left + (triggerRect.width - tooltipWidth) / 2;
    }

    // Ensure tooltip stays within viewport
    const padding = 8;
    if (left < padding) left = padding;
    if (left + tooltipWidth > viewportWidth - padding) {
      left = viewportWidth - tooltipWidth - padding;
    }
    if (top < padding) top = padding;
    if (top + tooltipHeight > viewportHeight - padding) {
      top = viewportHeight - tooltipHeight - padding;
    }

    setTooltipStyle({
      position: 'fixed' as const,
      top: `${Math.max(padding, top)}px`,
      left: `${Math.max(padding, left)}px`,
      zIndex: 9999,
      visibility: 'visible' as const,
    });
  };

  const showTooltip = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    
    // Increased delay to 2 seconds as requested
    showTimeoutRef.current = setTimeout(() => {
      const initialPositionStyle = calculatePosition();
      setTooltipStyle(initialPositionStyle);
      setIsVisible(true);
      
      // Update position with actual dimensions after rendering
      requestAnimationFrame(() => {
        updatePositionWithActualDimensions();
      });
    }, 2000);
  };

  const hideTooltip = () => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  const handleTooltipMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    hideTooltip();
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
    };
  }, []);

  // Clone the child element to add event handlers and ref
  const triggerElement = React.cloneElement(children as React.ReactElement<any>, {
    ref: triggerRef,
    onMouseEnter: showTooltip,
    onMouseLeave: hideTooltip,
    onFocus: showTooltip,
    onBlur: hideTooltip,
  });

  // On mobile, avoid wrapping elements to prevent focus issues
  if (isMobileDevice) {
    return <>{children}</>;
  }

  return (
    <>
      {triggerElement}
      {isVisible && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          className="px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg max-w-xs"
          style={tooltipStyle}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          {content}
          <div
            className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2' :
              position === 'left' ? 'left-full top-1/2 -translate-x-1/2 -translate-y-1/2' :
              position === 'right' ? 'right-full top-1/2 translate-x-1/2 -translate-y-1/2' :
              'top-full left-1/2 -translate-x-1/2 -translate-y-1/2'
            }`}
          />
        </div>,
        document.body
      )}
    </>
  );
});

Tooltip.displayName = 'Tooltip';
