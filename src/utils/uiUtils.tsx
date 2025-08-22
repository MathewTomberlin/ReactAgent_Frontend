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
 * Optimized to prevent unnecessary re-renders
 */
export const ConditionalTooltip: React.FC<{
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}> = React.memo(({ content, children, position }) => {
  const isMobileDevice = useIsMobile();
  return isMobileDevice ? <>{children}</> : <Tooltip content={content} position={position}>{children as React.ReactElement}</Tooltip>;
});

ConditionalTooltip.displayName = 'ConditionalTooltip';
