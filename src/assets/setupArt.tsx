// Small SVG icons for the "Nouvelle partie" opponent cards. No emoji, no
// external assets — inherits currentColor so the card's selected state tints it.

interface IconProps {
  size?: number;
  className?: string;
}

export function BotIcon({ size = 34, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="2.5" r="1.8" fill="currentColor" />
      <rect x="6" y="7" width="20" height="15" rx="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="14" r="2.1" fill="currentColor" />
      <circle cx="20" cy="14" r="2.1" fill="currentColor" />
      <path d="M12 18h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 12H3v5h3M26 12h3v5h-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 22v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function DuoIcon({ size = 34, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="11" cy="10" r="4.2" stroke="currentColor" strokeWidth="2" />
      <path d="M3.5 25c0-4.4 3.4-7.5 7.5-7.5s7.5 3.1 7.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22" cy="12" r="3.6" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <path d="M17.5 25c0-3.9 2.4-6.6 5.8-6.6 3.1 0 5.2 2.2 5.6 5.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
