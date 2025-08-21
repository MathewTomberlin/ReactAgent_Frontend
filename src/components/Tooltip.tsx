import React, { useState, useRef, useEffect, useMemo } from 'react';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = React.memo(({
  content,
  children,
  position = 'top',
  className = '',
}) => {
  // Memoize mobile check to prevent unnecessary re-renders
  const isMobileDevice = useMemo(() => {
    return typeof window !== 'undefined' && window.innerWidth <= 768;
  }, []);

  // On mobile, avoid wrapping elements to prevent focus issues
  if (isMobileDevice) {
    return <>{children}</>;
  }
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  const showTooltip = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsVisible(true);
  };

  const hideTooltip = () => {
    // Add a small delay to prevent flickering
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        const triggerRect = triggerRef.current?.getBoundingClientRect();
        const tooltipRect = tooltipRef.current?.getBoundingClientRect();

        if (!triggerRect || !tooltipRect) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let top: number;
        let left: number;

        // Get fresh tooltip dimensions
        const tooltipWidth = tooltipRect.width;
        const tooltipHeight = tooltipRect.height;

        switch (position) {
          case 'top':
            top = triggerRect.top - tooltipHeight - 8;
            left = triggerRect.left + (triggerRect.width - tooltipWidth) / 2;
            break;
          case 'bottom':
            top = triggerRect.bottom + 8;
            left = triggerRect.left + (triggerRect.width - tooltipWidth) / 2;
            break;
          case 'left':
            top = triggerRect.top + (triggerRect.height - tooltipHeight) / 2;
            left = triggerRect.left - tooltipWidth - 8;
            break;
          case 'right':
            top = triggerRect.top + (triggerRect.height - tooltipHeight) / 2;
            left = triggerRect.right + 8;
            break;
          default:
            top = triggerRect.top - tooltipHeight - 8;
            left = triggerRect.left + (triggerRect.width - tooltipWidth) / 2;
        }

        // Ensure tooltip stays within viewport with some padding
        const padding = 8;
        if (left < padding) left = padding;
        if (left + tooltipWidth > viewportWidth - padding) {
          left = viewportWidth - tooltipWidth - padding;
        }
        if (top < padding) top = padding;
        if (top + tooltipHeight > viewportHeight - padding) {
          top = viewportHeight - tooltipHeight - padding;
        }

        // Ensure tooltip stays within viewport
        const finalTop = Math.max(padding, top);
        const finalLeft = Math.max(padding, left);

        setTooltipPosition({ top: finalTop, left: finalLeft });
      });
    }
  }, [isVisible, position]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
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

  return (
    <div className={`relative inline-block ${className}`}>
      {triggerElement}
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg max-w-xs pointer-events-none"
          onMouseEnter={(e) => e.preventDefault()}
          onMouseLeave={(e) => e.preventDefault()}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            position: 'fixed',
            transform: 'none',
          }}
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
        </div>
      )}
    </div>
  );
});

Tooltip.displayName = 'Tooltip';
