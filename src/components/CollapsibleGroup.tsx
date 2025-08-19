import { useState } from 'react';
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

  return (
    <div className={`mb-4 ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-t hover:bg-gray-100 transition-colors"
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
      {isExpanded && (
        <div className="p-3 bg-white border border-gray-200 rounded-b">
          {children}
        </div>
      )}
    </div>
  );
};
