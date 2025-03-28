import React from 'react';

interface IconProps {
  width?: number;
  height?: number;
  className?: string;
}

const WhackAMoleIcon: React.FC<IconProps> = ({
  width = 140,
  height = 140,
  className = '',
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background */}
      <rect width="140" height="140" rx="10" fill="#1B5E20" />
      
      {/* Game Board */}
      <rect x="15" y="15" width="110" height="110" rx="8" fill="#388E3C" />
      
      {/* Mole holes */}
      <circle cx="40" cy="40" r="15" fill="#1B3A26" />
      <circle cx="70" cy="40" r="15" fill="#1B3A26" />
      <circle cx="100" cy="40" r="15" fill="#1B3A26" />
      
      <circle cx="40" cy="70" r="15" fill="#1B3A26" />
      <circle cx="70" cy="70" r="15" fill="#1B3A26" />
      <circle cx="100" cy="70" r="15" fill="#1B3A26" />
      
      <circle cx="40" cy="100" r="15" fill="#1B3A26" />
      <circle cx="70" cy="100" r="15" fill="#1B3A26" />
      <circle cx="100" cy="100" r="15" fill="#1B3A26" />
      
      {/* Mole in center hole */}
      <circle cx="70" cy="63" r="12" fill="#795548" /> {/* Mole head */}
      <circle cx="64" cy="60" r="2.5" fill="white" /> {/* Left eye */}
      <circle cx="76" cy="60" r="2.5" fill="white" /> {/* Right eye */}
      <circle cx="64" cy="60" r="1" fill="black" /> {/* Left pupil */}
      <circle cx="76" cy="60" r="1" fill="black" /> {/* Right pupil */}
      <circle cx="70" cy="64" r="1.5" fill="black" /> {/* Nose */}
      <path d="M65 68 H75 Q70 72 65 68 Z" fill="black" /> {/* Smile */}
      
      {/* Mallet */}
      <rect x="90" y="20" width="5" height="30" rx="2" transform="rotate(45 90 20)" fill="#D7CCC8" /> {/* Handle */}
      <rect x="110" y="10" width="15" height="12" rx="2" transform="rotate(45 110 10)" fill="#4E342E" /> {/* Hammer */}
    </svg>
  );
};

export default WhackAMoleIcon; 