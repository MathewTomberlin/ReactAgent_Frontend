import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface CollapsibleGroupProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export const CollapsibleGroup = ({
  title,
  children,
  defaultExpanded = true,
  className = ""
}: CollapsibleGroupProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  // Prevent focus stealing when clicking header by avoiding immediate reflow
  const toggle = () => {
    // Defer state change to end of event loop to avoid interfering with focused inputs
    setTimeout(() => setIsExpanded(prev => !prev), 0);
  };

  const contentBgClass = useMemo(() => (
    className.includes('collapsible-group-top') ? 'bg-gray-100' :
    className.includes('collapsible-group-nested') ? 'bg-gray-200' : 'bg-gray-100'
  ), [className]);

  const headerBgClass = useMemo(() => (
    className.includes('collapsible-group-top') ? 'bg-gray-200' :
    className.includes('collapsible-group-nested') ? 'bg-gray-300' : 'bg-gray-200'
  ), [className]);

  return (
    <div className={`mb-4 ${className}`}>
      <button
        onClick={toggle}
        className={`w-full flex items-center justify-between p-2 text-sm font-medium text-gray-700 rounded-t hover:bg-gray-300 transition-colors ${headerBgClass}`}
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`p-3 border border-gray-200 rounded-b ${contentBgClass}`}
        style={{ display: isExpanded ? 'block' : 'none', contain: 'content' }}
        aria-hidden={!isExpanded}
      >
        {children}
      </div>
    </div>
  );
};
