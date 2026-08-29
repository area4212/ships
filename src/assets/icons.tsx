// Original, hand-drawn vector icons (no third-party assets). Kept as React
// components so they inherit currentColor and scale cleanly at any size.

export function AnchorIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="5" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.2V20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 10H18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 14C4 18 8 20 12 20C16 20 20 18 20 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function TrophyIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 14v3M9 21h6M10 21c0-1.5.8-2 2-2s2 .5 2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FullscreenEnterIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 9V4H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 9V4H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15V20H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 15V20H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FullscreenExitIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 4V9H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 4V9H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 20V15H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 20V15H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SoundOnIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 9V15H8L13 19V5L8 9H4Z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M16.5 8.5C17.7 9.7 17.7 14.3 16.5 15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19 6C21.5 8.5 21.5 15.5 19 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SoundOffIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 9V15H8L13 19V5L8 9H4Z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M17 9.5L22 14.5M22 9.5L17 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ExplosionIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <polygon
        points="12,2 14.2,8.5 20.5,6.5 16.2,11.5 22,14 15.3,15 17.5,21 12,17 6.5,21 8.7,15 2,14 7.8,11.5 3.5,6.5 9.8,8.5"
        fill="#ff5a3c"
        stroke="#c0290f"
        strokeWidth="0.6"
      />
      <circle cx="12" cy="12" r="3.4" fill="#ffd23f" />
    </svg>
  );
}

export function SplashIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="3" fill="#7fd3ff" opacity="0.9" />
      <circle cx="12" cy="12" r="7" stroke="#7fd3ff" strokeWidth="1.4" fill="none" opacity="0.7" />
      <circle cx="12" cy="12" r="10.2" stroke="#7fd3ff" strokeWidth="1" fill="none" opacity="0.4" />
    </svg>
  );
}

// Filled, seamlessly-tileable wave shape. The path repeats every 25 units
// across a 200-wide viewBox (8 repeats); an animation sliding it by exactly
// 50% (= 4 periods) therefore loops with no visible seam.
export function OceanWaveFill({ className = "", color = "#0d3355" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 200 40" preserveAspectRatio="none" className={className}>
      <path
        d="M0,18 Q6.25,10 12.5,18 T25,18 T37.5,18 T50,18 T62.5,18 T75,18 T87.5,18 T100,18 T112.5,18 T125,18 T137.5,18 T150,18 T162.5,18 T175,18 T187.5,18 T200,18 V40 H0 Z"
        fill={color}
      />
    </svg>
  );
}

export function WaveDivider({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 20" preserveAspectRatio="none" className={className}>
      <path
        d="M0 10 Q 12.5 0 25 10 T 50 10 T 75 10 T 100 10 T 125 10 T 150 10 T 175 10 T 200 10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}
