import React from 'react';

export default function TicTacToeIcon({ className = '', width = 40, height = 40 }: { className?: string; width?: number; height?: number }) {
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
      {/* Grid lines */}
      <line x1="8" y1="2" x2="8" y2="22" />
      <line x1="16" y1="2" x2="16" y2="22" />
      <line x1="2" y1="8" x2="22" y2="8" />
      <line x1="2" y1="16" x2="22" y2="16" />
      
      {/* X in top left */}
      <line x1="3" y1="3" x2="5" y2="5" strokeWidth="1.5" stroke="#FF6B81" />
      <line x1="5" y1="3" x2="3" y2="5" strokeWidth="1.5" stroke="#FF6B81" />
      
      {/* X in middle */}
      <line x1="11" y1="11" x2="13" y2="13" strokeWidth="1.5" stroke="#FF6B81" />
      <line x1="13" y1="11" x2="11" y2="13" strokeWidth="1.5" stroke="#FF6B81" />
      
      {/* O in bottom right */}
      <circle cx="19" cy="19" r="2" strokeWidth="1.5" stroke="#5C7CFA" />
      
      {/* O in top right */}
      <circle cx="19" cy="5" r="2" strokeWidth="1.5" stroke="#5C7CFA" />
    </svg>
  );
} 