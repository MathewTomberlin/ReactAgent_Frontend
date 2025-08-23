import React, { useState, useEffect } from 'react';
import { Tooltip } from '../components/Tooltip';

/**
 * Utility function to detect mobile devices
 * Memoized to prevent unnecessary recalculations
 */
export const isMobile = () => {
  return typeof window !== 'undefined' && window.innerWidth <= 768;
};

/**
 * Hook to detect mobile devices with responsive updates
 */
export const useIsMobile = () => {
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
  
  return isMobileDevice;
};

/**
 * Conditional Tooltip component that only shows on desktop
 * Optimized to prevent unnecessary re-renders and works with new Tooltip implementation
 */
export const ConditionalTooltip: React.FC<{
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  maxWidth?: number;
}> = React.memo(({ content, children, position, delay, maxWidth }) => {
  const isMobileDevice = useIsMobile();
  
  // On mobile, just render children without tooltip wrapper
  if (isMobileDevice) {
    return <>{children}</>;
  }
  
  // On desktop, render with tooltip
  return (
    <Tooltip 
      content={content} 
      position={position} 
      delay={delay}
      maxWidth={maxWidth}
    >
      {children as React.ReactElement}
    </Tooltip>
  );
});

ConditionalTooltip.displayName = 'ConditionalTooltip';
