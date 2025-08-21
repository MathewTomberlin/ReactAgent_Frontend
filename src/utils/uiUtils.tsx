import React, { useMemo } from 'react';
import { Tooltip } from '../components/Tooltip';

/**
 * Utility function to detect mobile devices
 * Memoized to prevent unnecessary recalculations
 */
export const isMobile = () => {
  return typeof window !== 'undefined' && window.innerWidth <= 768;
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
  const isMobileDevice = useMemo(() => isMobile(), []);
  return isMobileDevice ? <>{children}</> : <Tooltip content={content} position={position}>{children as React.ReactElement}</Tooltip>;
});

ConditionalTooltip.displayName = 'ConditionalTooltip';

/**
 * Memoized mobile check hook for components that need to check mobile state
 */
export const useIsMobile = () => {
  return useMemo(() => isMobile(), []);
};
