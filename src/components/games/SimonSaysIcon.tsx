import React from 'react';

interface IconProps {
  width?: number;
  height?: number;
  className?: string;
}

const SimonSaysIcon: React.FC<IconProps> = ({ width = 48, height = 48, className = '' }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="4" y="4" width="19" height="19" rx="2" fill="#1b5e20" />
      <rect x="25" y="4" width="19" height="19" rx="2" fill="#b71c1c" />
      <rect x="4" y="25" width="19" height="19" rx="2" fill="#f9a825" />
      <rect x="25" y="25" width="19" height="19" rx="2" fill="#0d47a1" />
      <circle cx="24" cy="24" r="8" fill="#263238" />
      <circle cx="24" cy="24" r="6" fill="#424242" />
      <path d="M21 24H27" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 21V27" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

export default SimonSaysIcon; 