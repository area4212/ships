// Detailed side-view warship for the main menu. Hand-built from primitive
// shapes in a stylised naval style (grey steel, cyan-lit bridge, radar mast).
export function ShipSilhouette({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 160" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ssHull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9fb4c6" />
          <stop offset="55%" stopColor="#5c7488" />
          <stop offset="100%" stopColor="#33465a" />
        </linearGradient>
        <linearGradient id="ssSuper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c3d2df" />
          <stop offset="100%" stopColor="#4a6072" />
        </linearGradient>
        <linearGradient id="ssWater" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c5f8a" />
          <stop offset="100%" stopColor="#0a2c47" />
        </linearGradient>
      </defs>

      {/* --- hull --- */}
      <path
        d="M18 96 L300 96 L322 104 L318 116 Q314 126 300 126 L58 126 Q34 126 26 112 Z"
        fill="url(#ssHull)"
        stroke="#0a1622"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* deck line + hull number */}
      <line x1="30" y1="100" x2="308" y2="100" stroke="#dbe7f2" strokeWidth="1.4" opacity="0.35" />
      <text x="70" y="118" fill="#dbe7f2" opacity="0.55" fontSize="12" fontFamily="Arial, sans-serif" fontWeight="700">
        D-07
      </text>

      {/* --- main gun turrets --- */}
      <g stroke="#0a1622" strokeWidth="2.5">
        <rect x="60" y="82" width="34" height="16" rx="5" fill="#5f7c93" />
        <rect x="90" y="86" width="30" height="6" rx="3" fill="#2b3d4d" />
        <rect x="214" y="82" width="30" height="15" rx="5" fill="#5f7c93" />
        <rect x="190" y="86" width="28" height="6" rx="3" fill="#2b3d4d" />
      </g>

      {/* --- superstructure tiers --- */}
      <g stroke="#0a1622" strokeWidth="2.5">
        <rect x="120" y="66" width="70" height="20" rx="3" fill="url(#ssSuper)" />
        <rect x="128" y="50" width="44" height="18" rx="3" fill="url(#ssSuper)" />
        <rect x="134" y="36" width="26" height="16" rx="3" fill="#41586c" />
      </g>
      {/* bridge windows */}
      <g fill="#7fd3ff" opacity="0.85">
        <rect x="132" y="55" width="7" height="8" />
        <rect x="143" y="55" width="7" height="8" />
        <rect x="154" y="55" width="7" height="8" />
        <rect x="138" y="40" width="6" height="7" />
        <rect x="148" y="40" width="6" height="7" />
      </g>

      {/* --- funnel --- */}
      <path d="M196 66 l6 -22 h16 l6 22 Z" fill="#2b3d4d" stroke="#0a1622" strokeWidth="2.5" />

      {/* --- radar mast --- */}
      <line x1="147" y1="36" x2="147" y2="8" stroke="#0e1c28" strokeWidth="3" strokeLinecap="round" />
      <line x1="136" y1="16" x2="158" y2="16" stroke="#0e1c28" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M141 10 a7 7 0 0 1 12 0 Z" fill="#c3d2df" stroke="#0e1c28" strokeWidth="1.6" />
      <circle cx="147" cy="6" r="2.6" fill="#c0392b" />

      {/* aft mast + antenna */}
      <line x1="205" y1="44" x2="205" y2="24" stroke="#0e1c28" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="205" cy="23" r="3" fill="#7fd3ff" opacity="0.8" />

      {/* --- bow wave --- */}
      <path d="M300 122 q22 -6 40 2 q-20 2 -40 -2 Z" fill="#eaf6ff" opacity="0.7" />
      <path
        d="M0 126 Q40 118 82 126 T164 126 T246 126 T340 126 V160 H0 Z"
        fill="url(#ssWater)"
        opacity="0.9"
      />
      <path
        d="M0 136 Q46 130 92 136 T184 136 T276 136 T340 136 V160 H0 Z"
        fill="#0a2c47"
        opacity="0.92"
      />
    </svg>
  );
}
