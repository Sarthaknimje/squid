import React from 'react';

export default function HangmanIcon({ className = '', width = 40, height = 40 }: { className?: string; width?: number; height?: number }) {
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
      {/* Gallows */}
      <line x1="3" y1="22" x2="21" y2="22" />
      <line x1="7" y1="22" x2="7" y2="2" />
      <line x1="7" y1="2" x2="16" y2="2" />
      <line x1="16" y1="2" x2="16" y2="4" />
      
      {/* Hanged figure */}
      <circle cx="16" cy="6" r="2" />
      <line x1="16" y1="8" x2="16" y2="14" />
      <line x1="16" y1="11" x2="13" y2="9" />
      <line x1="16" y1="11" x2="19" y2="9" />
      <line x1="16" y1="14" x2="13" y2="18" />
      <line x1="16" y1="14" x2="19" y2="18" />
      
      {/* Word guessing representation */}
      <line x1="5" y1="19" x2="7" y2="19" />
      <line x1="9" y1="19" x2="11" y2="19" />
      <line x1="13" y1="19" x2="15" y2="19" />
      <line x1="17" y1="19" x2="19" y2="19" />
    </svg>
  );
} 