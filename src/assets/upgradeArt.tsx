// Hand-drawn vector icons for the Arsenal upgrades. No third-party assets:
// each is an original chunky "game-icon" style SVG (dark metal body, coloured
// glow) echoing the six upgrade themes — reactor, generator, targeting rig,
// mine field, scout wing, shipyard. viewBox is 0 0 64 64 throughout.

import React from "react";
import type { UpgradeId } from "../game/progression";

interface IconProps {
  size?: number;
  className?: string;
}

const OUTLINE = "#10151c";

function Frame({ size = 48, className = "", children, id }: IconProps & { children: React.ReactNode; id: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-hidden="true"
      data-icon={id}
    >
      {children}
    </svg>
  );
}

/* 1. Reacteur ameliore — glowing orange core + lightning bolt */
export function ReactorArt(props: IconProps) {
  return (
    <Frame {...props} id="reactor">
      <defs>
        <linearGradient id="rx-core" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd06a" />
          <stop offset="0.55" stopColor="#ff8a1e" />
          <stop offset="1" stopColor="#c94b06" />
        </linearGradient>
        <radialGradient id="rx-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffb347" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="52" rx="24" ry="8" fill="url(#rx-glow)" />
      {/* base ring */}
      <ellipse cx="32" cy="49" rx="21" ry="7.5" fill="#3c4a59" stroke={OUTLINE} strokeWidth="1.5" />
      <ellipse cx="32" cy="47" rx="21" ry="7.5" fill="#55667a" stroke={OUTLINE} strokeWidth="1.5" />
      {/* side pipes */}
      <path d="M14 44 Q8 34 14 24" stroke="#3c4a59" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M50 44 Q56 34 50 24" stroke="#3c4a59" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      {/* glass core */}
      <rect x="18" y="16" width="28" height="30" rx="4" fill="url(#rx-core)" stroke={OUTLINE} strokeWidth="1.6" />
      <rect x="18" y="16" width="9" height="30" rx="4" fill="#fff" opacity="0.16" />
      {/* metal cap */}
      <rect x="15" y="8" width="34" height="10" rx="3" fill="#55667a" stroke={OUTLINE} strokeWidth="1.6" />
      <rect x="27" y="3" width="10" height="6" rx="2" fill="#6b7d92" stroke={OUTLINE} strokeWidth="1.4" />
      {/* lightning bolt */}
      <path d="M34 20 L24 34 H31 L29 44 L41 28 H33 Z" fill="#fff3c4" stroke="#b5500a" strokeWidth="1.2" strokeLinejoin="round" />
      {/* status lamps */}
      <circle cx="22" cy="47" r="1.6" fill="#ffcf5c" />
      <circle cx="42" cy="47" r="1.6" fill="#ffcf5c" />
    </Frame>
  );
}

/* 2. Generateur auxiliaire — green energy cell block */
export function GeneratorArt(props: IconProps) {
  return (
    <Frame {...props} id="generator">
      <defs>
        <linearGradient id="gn-core" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7dffa8" />
          <stop offset="1" stopColor="#12a94f" />
        </linearGradient>
        <radialGradient id="gn-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#3dff8c" stopOpacity="0.8" />
          <stop offset="1" stopColor="#3dff8c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="53" rx="25" ry="8" fill="url(#gn-glow)" />
      {/* base */}
      <path d="M8 46 L32 54 L56 46 L56 41 L32 49 L8 41 Z" fill="#3c4a59" stroke={OUTLINE} strokeWidth="1.5" strokeLinejoin="round" />
      {/* main body */}
      <rect x="10" y="18" width="18" height="26" rx="3" fill="#55667a" stroke={OUTLINE} strokeWidth="1.6" />
      <path d="M12 20 L18 15 H28" stroke={OUTLINE} strokeWidth="1.4" fill="none" opacity="0.5" />
      {/* green coil chamber */}
      <rect x="28" y="16" width="26" height="28" rx="3" fill="#2c3946" stroke={OUTLINE} strokeWidth="1.6" />
      <rect x="31" y="19" width="20" height="22" rx="2" fill="url(#gn-core)" stroke="#0c7a37" strokeWidth="1" />
      {[24, 30, 36].map((y) => (
        <line key={y} x1="31" y1={y} x2="51" y2={y} stroke="#0c7a37" strokeWidth="2" />
      ))}
      {/* pipes */}
      <path d="M28 40 Q22 46 24 52" stroke="#3c4a59" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M40 44 L40 50" stroke="#3c4a59" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* bolt badge on the grey box */}
      <path d="M20 22 L15 30 H19 L17 37 L24 28 H19 Z" fill="#8dffb4" stroke="#0c7a37" strokeWidth="1" strokeLinejoin="round" />
      {/* status lamps */}
      <circle cx="52" cy="20" r="1.5" fill="#8dffb4" />
      <circle cx="52" cy="25" r="1.5" fill="#8dffb4" />
    </Frame>
  );
}

/* 3. Optimisation d'armement — radar target + missile */
export function TargetingArt(props: IconProps) {
  return (
    <Frame {...props} id="targeting">
      <defs>
        <radialGradient id="tg-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ff4d4d" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff4d4d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="30" cy="55" rx="24" ry="7" fill="#2c3946" stroke={OUTLINE} strokeWidth="1.5" />
      {/* radar dish */}
      <circle cx="27" cy="28" r="20" fill="#3c4a59" stroke={OUTLINE} strokeWidth="1.8" />
      <circle cx="27" cy="28" r="20" fill="url(#tg-glow)" />
      <circle cx="27" cy="28" r="14" fill="none" stroke="#7f93a8" strokeWidth="1.6" />
      <circle cx="27" cy="28" r="8" fill="none" stroke="#9fb2c6" strokeWidth="1.4" />
      <circle cx="27" cy="28" r="3.2" fill="#ff3b3b" />
      {/* crosshair ticks */}
      <line x1="27" y1="4" x2="27" y2="14" stroke="#cfe0f0" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="27" y1="42" x2="27" y2="52" stroke="#cfe0f0" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="3" y1="28" x2="13" y2="28" stroke="#cfe0f0" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="41" y1="28" x2="51" y2="28" stroke="#4ceaff" strokeWidth="2.4" strokeLinecap="round" />
      {/* missile */}
      <g transform="rotate(38 46 24)">
        <rect x="40" y="18" width="18" height="9" rx="4.5" fill="#c9d4df" stroke={OUTLINE} strokeWidth="1.4" />
        <path d="M58 18.5 Q64 22.5 58 26.5 Z" fill="#ff5a3c" stroke={OUTLINE} strokeWidth="1.2" />
        <path d="M40 18 L36 14 L40 22 Z M40 27 L36 31 L40 23 Z" fill="#8b97a3" stroke={OUTLINE} strokeWidth="1" />
      </g>
      {/* control box */}
      <rect x="42" y="44" width="18" height="13" rx="2.5" fill="#3c4a59" stroke={OUTLINE} strokeWidth="1.6" />
      <circle cx="47" cy="50.5" r="2" fill="#ff5a5a" />
      <circle cx="53" cy="50.5" r="2" fill="#ff5a5a" />
      <rect x="44" y="54" width="14" height="2" rx="1" fill="#4ceaff" />
    </Frame>
  );
}

/* 4. Champ de mines — spiked naval mines on chains */
export function MineFieldArt(props: IconProps) {
  const horns = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <Frame {...props} id="minefield">
      <defs>
        <radialGradient id="mn-body" cx="0.38" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#3a4a5c" />
          <stop offset="1" stopColor="#1b2530" />
        </radialGradient>
      </defs>
      {/* water */}
      <path d="M2 46 q8 -5 15 0 t15 0 t15 0 t15 0 V64 H2 Z" fill="#123a5c" stroke={OUTLINE} strokeWidth="1.2" />
      <path d="M2 50 q8 -4 15 0 t15 0 t15 0 t15 0" fill="none" stroke="#3f7fb0" strokeWidth="1.6" opacity="0.7" />
      {/* chains */}
      <path d="M18 60 L20 40 M32 62 L32 32 M46 60 L44 42" stroke="#8b97a3" strokeWidth="2" strokeDasharray="2 2" />
      {/* small mines */}
      <circle cx="16" cy="44" r="8" fill="url(#mn-body)" stroke={OUTLINE} strokeWidth="1.5" />
      <circle cx="48" cy="45" r="7" fill="url(#mn-body)" stroke={OUTLINE} strokeWidth="1.5" />
      {[30, 90, 150, 210, 270, 330].map((a) => (
        <line key={`s${a}`} x1="16" y1="44" x2={16 + Math.cos((a * Math.PI) / 180) * 11} y2={44 + Math.sin((a * Math.PI) / 180) * 11} stroke="#2c3946" strokeWidth="3" strokeLinecap="round" />
      ))}
      {/* big mine */}
      <g>
        {horns.map((a) => {
          return (
            <g key={a} transform={`translate(32 30) rotate(${a})`}>
              <rect x="-2.4" y="-19" width="4.8" height="8" rx="1.5" fill="#2c3946" stroke={OUTLINE} strokeWidth="1.2" />
              <circle cx="0" cy="-19" r="2.2" fill="#6b7d92" stroke={OUTLINE} strokeWidth="0.8" />
            </g>
          );
        })}
        <circle cx="32" cy="30" r="15" fill="url(#mn-body)" stroke={OUTLINE} strokeWidth="1.8" />
        <circle cx="26" cy="24" r="4.5" fill="#fff" opacity="0.12" />
        <circle cx="32" cy="30" r="3" fill="none" stroke="#6b7d92" strokeWidth="1.4" />
      </g>
    </Frame>
  );
}

/* 5. Escadrille d'eclaireurs — twin scout jets with thrust trails */
export function ScoutWingArt(props: IconProps) {
  return (
    <Frame {...props} id="scoutwing">
      <defs>
        <linearGradient id="sc-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b97a3" />
          <stop offset="1" stopColor="#4a5763" />
        </linearGradient>
        <linearGradient id="sc-trail" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#4ceaff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#4ceaff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* back jet */}
      <g opacity="0.7" transform="translate(6 -6) scale(0.8)">
        <path d="M14 20 L52 20 L44 26 L14 26 Z" fill="url(#sc-trail)" />
        <path d="M50 23 L30 15 L18 18 L14 23 L18 28 L30 31 Z" fill="url(#sc-body)" stroke={OUTLINE} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M28 23 L20 8 L26 22 Z M28 23 L20 38 L26 24 Z" fill="#5a6773" stroke={OUTLINE} strokeWidth="1.2" />
      </g>
      {/* thrust trail front */}
      <path d="M6 40 L46 40 L38 48 L4 48 Z" fill="url(#sc-trail)" />
      {/* front jet */}
      <path d="M52 44 L28 33 L14 37 L8 44 L14 51 L28 55 Z" fill="url(#sc-body)" stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M26 44 L15 25 L23 42 Z M26 44 L15 63 L23 46 Z" fill="#5a6773" stroke={OUTLINE} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M40 44 L34 34 L38 44 L34 54 Z" fill="#3c4a59" stroke={OUTLINE} strokeWidth="1.1" />
      {/* cockpit */}
      <ellipse cx="34" cy="44" rx="5" ry="3" fill="#4ceaff" stroke={OUTLINE} strokeWidth="1.2" />
      {/* nose */}
      <path d="M52 44 L60 44" stroke="#8b97a3" strokeWidth="3" strokeLinecap="round" />
    </Frame>
  );
}

/* 6. Chantier naval — drydock with crane repairing a warship */
export function ShipyardArt(props: IconProps) {
  return (
    <Frame {...props} id="shipyard">
      <defs>
        <linearGradient id="sy-deck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a5763" />
          <stop offset="1" stopColor="#2c3946" />
        </linearGradient>
      </defs>
      {/* dock platform */}
      <path d="M4 44 L34 52 L60 44 L60 50 L34 58 L4 50 Z" fill="url(#sy-deck)" stroke={OUTLINE} strokeWidth="1.5" strokeLinejoin="round" />
      {/* hazard stripes */}
      <path d="M10 47 l4 1 M18 49 l4 1 M26 51 l4 1" stroke="#ffc850" strokeWidth="2" />
      {/* building block */}
      <rect x="38" y="24" width="20" height="20" rx="2" fill="#3c4a59" stroke={OUTLINE} strokeWidth="1.6" />
      <rect x="41" y="28" width="4" height="4" fill="#4ceaff" />
      <rect x="48" y="28" width="4" height="4" fill="#4ceaff" />
      <rect x="41" y="35" width="11" height="3" fill="#ffc850" />
      {/* crane */}
      <line x1="20" y1="46" x2="20" y2="10" stroke="#7f93a8" strokeWidth="3" />
      <line x1="8" y1="16" x2="38" y2="10" stroke="#7f93a8" strokeWidth="3" />
      <line x1="20" y1="10" x2="14" y2="16" stroke="#7f93a8" strokeWidth="2" />
      <line x1="20" y1="10" x2="27" y2="14" stroke="#7f93a8" strokeWidth="2" />
      <line x1="12" y1="15" x2="12" y2="24" stroke="#cfe0f0" strokeWidth="1.4" />
      <path d="M9 24 h6 l-1.5 3 h-3 Z" fill="#ffc850" stroke={OUTLINE} strokeWidth="1" />
      {/* warship in dock */}
      <path d="M12 44 L44 44 L40 50 L16 50 Z" fill="#55667a" stroke={OUTLINE} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="22" y="36" width="12" height="8" fill="#6b7d92" stroke={OUTLINE} strokeWidth="1.3" />
      <rect x="26" y="30" width="4" height="6" fill="#8b97a3" stroke={OUTLINE} strokeWidth="1.1" />
      {/* wrench emblem */}
      <path d="M48 46 l6 6 M53 44 a4 4 0 1 0 3 3 l-3 -3 -2 2 -2 -2 2 -2 Z" fill="#4ceaff" stroke={OUTLINE} strokeWidth="1" strokeLinejoin="round" />
    </Frame>
  );
}

export const UPGRADE_ART: Record<UpgradeId, (props: IconProps) => JSX.Element> = {
  reacteur: ReactorArt,
  generateur: GeneratorArt,
  optimisation: TargetingArt,
  champMines: MineFieldArt,
  eclaireur: ScoutWingArt,
  chantier: ShipyardArt,
};
