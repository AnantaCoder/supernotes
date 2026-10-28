import React from 'react';

export function AppLogo({ size = 30, className = 'app-logo-icon' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ verticalAlign: 'middle', flexShrink: 0 }}
      aria-label="SuperNotes Logo"
    >
      <defs>
        <linearGradient id="snOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF8800" />
          <stop offset="50%" stopColor="#FF6200" />
          <stop offset="100%" stopColor="#E64000" />
        </linearGradient>
        <filter id="snLogoShadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#C23600" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Orange Squircle Background */}
      <rect width="32" height="32" rx="8" fill="url(#snOrangeGrad)" filter="url(#snLogoShadow)" />
      
      {/* Subtle glossy border highlight */}
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="7.25" fill="none" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.3" />

      {/* Notepad Page */}
      <rect x="6.5" y="6" width="19" height="20" rx="3.5" fill="#FFFFFF" />

      {/* Notepad Top Header Band */}
      <path d="M6.5 9.5C6.5 7.567 8.067 6 10 6h12c1.933 0 3.5 1.567 3.5 3.5v1.5H6.5V9.5z" fill="#FFE2CC" />
      
      {/* Spine Ring Pins */}
      <circle cx="10.5" cy="8.2" r="1.1" fill="#FF6A00" />
      <circle cx="16" cy="8.2" r="1.1" fill="#FF6A00" />
      <circle cx="21.5" cy="8.2" r="1.1" fill="#FF6A00" />

      {/* Note Ruled Lines */}
      <path d="M10 14h7M10 17.5h11M10 21h6" stroke="#FF6200" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.85" />

      {/* Precision 45-degree Angled Pencil Drawing on Note */}
      <g transform="matrix(0.7071 0.7071 -0.7071 0.7071 21.5 5)">
        {/* Eraser */}
        <path d="M0.5 -3.5h2.5c0.4 0 0.8 0.4 0.8 0.8V-2H0.5v-1.5z" fill="#FF4D4D" />
        {/* Ferrule band */}
        <rect x="0.5" y="-2" width="2.5" height="2" fill="#D8D8D8" />
        {/* Pencil shaft */}
        <rect x="0.5" y="0" width="2.5" height="9.5" fill="#FF6E00" />
        <rect x="0.5" y="0" width="0.8" height="9.5" fill="#FFA34D" />
        {/* Wood tip */}
        <path d="M0.5 9.5L1.75 12.8L3 9.5Z" fill="#FFE5CC" />
        {/* Graphite lead */}
        <path d="M1.2 11.4L1.75 12.8L2.3 11.4Z" fill="#2E2E2E" />
      </g>
    </svg>
  );
}
