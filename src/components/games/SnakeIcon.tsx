import React from 'react';

const SnakeIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
    >
      {/* Snake body segments */}
      <rect x="20" y="20" width="15" height="15" fill="#4CAF50" rx="2" />
      <rect x="35" y="20" width="15" height="15" fill="#4CAF50" rx="2" />
      <rect x="50" y="20" width="15" height="15" fill="#4CAF50" rx="2" />
      <rect x="50" y="35" width="15" height="15" fill="#4CAF50" rx="2" />
      <rect x="50" y="50" width="15" height="15" fill="#4CAF50" rx="2" />
      <rect x="35" y="50" width="15" height="15" fill="#4CAF50" rx="2" />
      <rect x="20" y="50" width="15" height="15" fill="#4CAF50" rx="2" />
      <rect x="20" y="65" width="15" height="15" fill="#4CAF50" rx="2" />
      <rect x="20" y="80" width="15" height="15" fill="#388E3C" rx="2" /> {/* Tail with darker color */}
      
      {/* Snake head */}
      <rect x="65" y="50" width="15" height="15" fill="#388E3C" rx="2" />
      
      {/* Snake eyes */}
      <circle cx="70" cy="54" r="2" fill="white" />
      <circle cx="76" cy="54" r="2" fill="white" />
      
      {/* Apple/food */}
      <circle cx="75" cy="25" r="8" fill="#F44336" />
      <rect x="74" y="17" width="2" height="5" fill="#795548" /> {/* Apple stem */}
    </svg>
  );
};

export default SnakeIcon; 