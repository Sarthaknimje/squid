import React from 'react';

export default function DotsAndBoxesIcon({ className = '', width = 40, height = 40 }: { className?: string; width?: number; height?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={width}
      height={height}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Grid of dots */}
      <circle cx="4" cy="4" r="1.5" fill="currentColor" />
      <circle cx="12" cy="4" r="1.5" fill="currentColor" />
      <circle cx="20" cy="4" r="1.5" fill="currentColor" />
      
      <circle cx="4" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="20" cy="12" r="1.5" fill="currentColor" />
      
      <circle cx="4" cy="20" r="1.5" fill="currentColor" />
      <circle cx="12" cy="20" r="1.5" fill="currentColor" />
      <circle cx="20" cy="20" r="1.5" fill="currentColor" />
      
      {/* Connected lines forming boxes */}
      <line x1="4" y1="4" x2="12" y2="4" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="4" x2="20" y2="4" stroke="currentColor" strokeWidth="1.5" />
      <line x1="4" y1="12" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" />
      
      <line x1="4" y1="4" x2="4" y2="12" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="4" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" />
      <line x1="20" y1="4" x2="20" y2="12" stroke="currentColor" strokeWidth="1.5" />
      
      {/* Filled box (player 1) */}
      <rect x="4.75" y="4.75" width="6.5" height="6.5" fill="#FF6B81" fillOpacity="0.6" />
      
      {/* Filled box (player 2) */}
      <rect x="12.75" y="12.75" width="6.5" height="6.5" fill="#5C7CFA" fillOpacity="0.6" />
    </svg>
  );
} 