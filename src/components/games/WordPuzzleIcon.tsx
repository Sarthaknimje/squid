import React from 'react';

const WordPuzzleIcon = ({ className = "w-6 h-6" }: { className?: string }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <rect x="7" y="7" width="3" height="3" fill="currentColor" />
      <rect x="14" y="7" width="3" height="3" fill="currentColor" />
      <rect x="7" y="14" width="3" height="3" />
      <rect x="14" y="14" width="3" height="3" fill="currentColor" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
};

export default WordPuzzleIcon; 