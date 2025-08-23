import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  maxWidth?: number;
}

export const Tooltip: React.FC<TooltipProps> = React.memo(({
  content,
  children,
  position = 'top',
  delay = 300,
  maxWidth = 250,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [isPositioned, setIsPositioned] = useState(false);
  
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const positionTimeoutRef = useRef<number | null>(null);

  // Clear all timeouts
  const clearAllTimeouts = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (positionTimeoutRef.current) {
      clearTimeout(positionTimeoutRef.current);
      positionTimeoutRef.current = null;
    }
  }, []);

  // Calculate tooltip position
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;
    const offset = 12;
    const padding = 16;

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

    // Ensure tooltip stays within viewport bounds
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
      opacity: 1,
      transform: 'scale(1)',
      transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
    });
    
    setIsPositioned(true);
  }, [position]);

  // Show tooltip with delay
  const showTooltip = useCallback(() => {
    clearAllTimeouts();
    
    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      setIsPositioned(false);
      
      // Position tooltip after it's rendered
      positionTimeoutRef.current = setTimeout(() => {
        calculatePosition();
      }, 10);
    }, delay);
  }, [delay, calculatePosition, clearAllTimeouts]);

  // Hide tooltip
  const hideTooltip = useCallback(() => {
    clearAllTimeouts();
    
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsPositioned(false);
      setTooltipStyle(prev => ({
        ...prev,
        opacity: 0,
        transform: 'scale(0.95)',
      }));
    }, 150);
  }, [clearAllTimeouts]);

  // Handle mouse enter on trigger
  const handleTriggerMouseEnter = useCallback(() => {
    showTooltip();
  }, [showTooltip]);

  // Handle mouse leave on trigger
  const handleTriggerMouseLeave = useCallback(() => {
    hideTooltip();
  }, [hideTooltip]);

  // Handle mouse enter on tooltip (keep it visible)
  const handleTooltipMouseEnter = useCallback(() => {
    clearAllTimeouts();
  }, [clearAllTimeouts]);

  // Handle mouse leave on tooltip
  const handleTooltipMouseLeave = useCallback(() => {
    hideTooltip();
  }, [hideTooltip]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  // Clone the child element to add event handlers and ref
  const triggerElement = React.cloneElement(children as React.ReactElement<any>, {
    ref: triggerRef,
    onMouseEnter: handleTriggerMouseEnter,
    onMouseLeave: handleTriggerMouseLeave,
    onFocus: handleTriggerMouseEnter,
    onBlur: handleTriggerMouseLeave,
  });

  // Get arrow position class
  const getArrowPositionClass = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 -translate-x-1/2';
      case 'bottom':
        return 'bottom-full left-1/2 -translate-x-1/2';
      case 'left':
        return 'left-full top-1/2 -translate-y-1/2';
      case 'right':
        return 'right-full top-1/2 -translate-y-1/2';
      default:
        return 'top-full left-1/2 -translate-x-1/2';
    }
  };

  // Get arrow offset styles for proper spacing
  const getArrowOffsetStyles = () => {
    switch (position) {
      case 'top':
        return { marginTop: '-4px' };
      case 'bottom':
        return { marginBottom: '-4px' };
      case 'left':
        return { marginLeft: '-4px' };
      case 'right':
        return { marginRight: '-4px' };
      default:
        return { marginTop: '-4px' };
    }
  };

  return (
    <>
      {triggerElement}
      {isVisible && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          className="px-4 py-3 text-sm text-white bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-xs backdrop-blur-sm relative"
          style={{
            ...tooltipStyle,
            maxWidth: `${maxWidth}px`,
            opacity: isPositioned ? 1 : 0,
            transform: isPositioned ? 'scale(1)' : 'scale(0.95)',
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          {content}
          {/* Arrow */}
          <div
            className={`absolute w-3 h-3 bg-gray-800 border border-gray-700 transform rotate-45 ${getArrowPositionClass()}`}
            style={{
              borderStyle: 'solid',
              borderWidth: '1px',
              borderColor: 'transparent',
              borderTopColor: position === 'bottom' ? '#374151' : 'transparent',
              borderBottomColor: position === 'top' ? '#374151' : 'transparent',
              borderLeftColor: position === 'right' ? '#374151' : 'transparent',
              borderRightColor: position === 'left' ? '#374151' : 'transparent',
              ...getArrowOffsetStyles(),
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
});

Tooltip.displayName = 'Tooltip';
