import React from 'react';

export function AppLogo({ size = 26, className = 'app-logo-icon' }) {
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
        {/* Apple-inspired subtle deep slate / blue gradient */}
        <linearGradient id="snAppleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3478F6" />
          <stop offset="100%" stopColor="#1E54B7" />
        </linearGradient>
        <filter id="snLogoShadow" x="-10%" y="-10%" width="120%" height="125%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Squircle base */}
      <rect width="32" height="32" rx="7.5" fill="url(#snAppleGrad)" filter="url(#snLogoShadow)" />

      {/* Subtle top edge specular highlight */}
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="6.75" fill="none" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.28" />

      {/* Crisp minimal note card */}
      <rect x="6.5" y="6.5" width="19" height="19" rx="3.5" fill="#FFFFFF" />

      {/* Soft note lines */}
      <line x1="10" y1="11.5" x2="18" y2="11.5" stroke="#3478F6" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="15" x2="22" y2="15" stroke="#777773" strokeWidth="1.25" strokeLinecap="round" strokeOpacity="0.7" />
      <line x1="10" y1="18.5" x2="19" y2="18.5" stroke="#777773" strokeWidth="1.25" strokeLinecap="round" strokeOpacity="0.7" />

      {/* Minimal precision stylus tip */}
      <circle cx="21" cy="21.5" r="1.5" fill="#3478F6" />
    </svg>
  );
}
