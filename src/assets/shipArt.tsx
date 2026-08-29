import React from "react";
import { Orientation } from "../types/game";
import { ShipLivery } from "../game/cosmetics";

interface ShipArtProps {
  variant: string;
  length: number;
  orientation: Orientation;
  uid: string;
  livery?: ShipLivery;
  flag?: string[];
  sunk?: boolean;
}

// Top-down sprite per ship type (from the shipz pack). Any unknown variant
// falls back to the destroyer sprite. Base sprites are drawn vertical (bow up).
const SHIP_SPRITES: Record<string, string> = {
  "porte-avions": "porte-avions",
  croiseur: "croiseur",
  "contre-torpilleur": "contre-torpilleur",
  "sous-marin": "sous-marin",
  torpilleur: "torpilleur",
};

function hexToHsl(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
// the shipz hulls sit around a warm khaki
const BASE_HSL = hexToHsl("#7c7a52");

/** Approximate CSS filter to tint a khaki hull sprite toward a livery colour. */
export function liveryFilter(livery?: ShipLivery): string | undefined {
  if (!livery) return undefined;
  const [th, ts, tl] = hexToHsl(livery.deckMid);
  const dh = Math.round(th - BASE_HSL[0]);
  const sat = clamp(ts / Math.max(0.05, BASE_HSL[1]), 0.35, 2.4);
  const bri = clamp(tl / Math.max(0.05, BASE_HSL[2]), 0.55, 1.7);
  return `hue-rotate(${dh}deg) saturate(${sat.toFixed(2)}) brightness(${bri.toFixed(2)})`;
}

// Detailed top-down warship art. Every hull is authored once in a horizontal
// coordinate space (x = 0..L along the keel, y = 0..100 across the beam) and
// rotated into place for vertical ships, so a single drawing serves both.
// L is the ship length in cells * 100.
export function ShipArt(props: ShipArtProps) {
  const { variant, length, orientation, uid, livery, flag, sunk } = props;

  const spriteKey = SHIP_SPRITES[variant] ?? "contre-torpilleur";
  if (spriteKey) {
    const base = `${import.meta.env.BASE_URL}ships/${spriteKey}${sunk ? "_sunk" : ""}.png`;
    return (
      <img
        className={`ship-sprite ${orientation === "vertical" ? "v" : "h"}`}
        src={base}
        alt=""
        draggable={false}
        style={sunk ? undefined : { filter: liveryFilter(livery) }}
      />
    );
  }
  return <ShipArtSvg variant={variant} length={length} orientation={orientation} uid={uid} livery={livery} flag={flag} />;
}

function ShipArtSvg({ variant, length, orientation, uid, livery, flag }: ShipArtProps) {
  const L = length * 100;
  const cx = L / 2;
  const vertical = orientation === "vertical";
  const g = `s-${uid}`;

  // shared palettes (overridable by an equipped hull livery)
  const deckTop = livery?.deckTop ?? "#8ea7bd";
  const deckMid = livery?.deckMid ?? "#5f7c93";
  const steel = livery?.steel ?? "#41586c";
  const steelDark = livery?.steelDark ?? "#2b3d4d";
  const outline = "#0a1622";
  const glass = "#7fd3ff";

  const isCarrier = variant === "porte-avions";
  const isSub = variant === "sous-marin";
  const isCruiser = variant === "croiseur";
  const isSmall = variant === "torpilleur";

  // ---- hull outline -------------------------------------------------------
  let hull: string;
  if (isSub) {
    const r = 46;
    hull = `M ${r},4 L ${L - r},4 Q ${L - 2},4 ${L - 2},50 Q ${L - 2},96 ${L - r},96 L ${r},96 Q 2,96 2,50 Q 2,4 ${r},4 Z`;
  } else if (isCarrier) {
    hull = `M 3,16 L 3,84 Q 3,92 12,92 L ${L - 70},92 Q ${L - 20},88 ${L - 3},50 Q ${L - 20},12 ${L - 70},8 L 12,8 Q 3,8 3,16 Z`;
  } else {
    const bowBack = L - Math.min(0.34 * L, 130);
    hull =
      `M 4,26 ` +
      `C ${0.06 * L},22 ${0.16 * L},8 ${0.3 * L},8 ` +
      `L ${bowBack},8 ` +
      `C ${L - 0.13 * L},8 ${L - 22},34 ${L - 3},50 ` +
      `C ${L - 22},66 ${L - 0.13 * L},92 ${bowBack},92 ` +
      `L ${0.3 * L},92 ` +
      `C ${0.16 * L},92 ${0.06 * L},78 4,74 Z`;
  }

  const barrel = (bx: number, by: number, dir: 1 | -1, len = 26, wdt = 5) => (
    <rect
      x={dir === 1 ? bx : bx - len}
      y={by - wdt / 2}
      width={len}
      height={wdt}
      rx={2}
      fill={steelDark}
      stroke={outline}
      strokeWidth={1.5}
    />
  );

  const turret = (tx: number, ty: number, dir: 1 | -1, r = 13) => (
    <g>
      {barrel(tx + dir * (r - 3), ty - 5, dir)}
      {barrel(tx + dir * (r - 3), ty + 5, dir)}
      <circle cx={tx} cy={ty} r={r} fill={deckMid} stroke={outline} strokeWidth={2} />
      <circle cx={tx} cy={ty} r={r * 0.45} fill={steelDark} />
    </g>
  );

  const funnel = (fx: number, w = 26, h = 34) => (
    <rect x={fx - w / 2} y={50 - h / 2} width={w} height={h} rx={7} fill={steelDark} stroke={outline} strokeWidth={2} />
  );

  const aa = (ax: number, ay: number) => (
    <circle cx={ax} cy={ay} r={4} fill={deckTop} stroke={outline} strokeWidth={1.5} />
  );

  return (
    <svg viewBox={vertical ? `0 0 100 ${L}` : `0 0 ${L} 100`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`${g}-hull`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={deckTop} />
          <stop offset="52%" stopColor={deckMid} />
          <stop offset="100%" stopColor={steel} />
        </linearGradient>
        <linearGradient id={`${g}-deck`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9fb6c9" />
          <stop offset="100%" stopColor="#6d8699" />
        </linearGradient>
      </defs>

      <g transform={vertical ? `translate(100 0) rotate(90)` : undefined}>
        {/* bow foam (kept within the ship's own footprint) */}
        {!isSub && (
          <path
            d={`M ${L - 24},50 q 10,-14 22,-6 q 4,6 0,12 q -12,8 -22,-6 Z`}
            fill="#eaf6ff"
            opacity={0.55}
          />
        )}

        {/* hull */}
        <path d={hull} fill={`url(#${g}-hull)`} stroke={outline} strokeWidth={4} strokeLinejoin="round" />

        {/* inset deck */}
        {!isCarrier && (
          <path
            d={hull}
            fill={`url(#${g}-deck)`}
            transform={`translate(${cx} 50) scale(0.9 0.74) translate(${-cx} -50)`}
            opacity={0.9}
          />
        )}

        {/* deck planking */}
        {!isCarrier &&
          !isSub &&
          Array.from({ length: Math.max(3, Math.round(length * 2)) }).map((_, i) => {
            const x = 0.12 * L + (i * (0.76 * L)) / Math.max(3, Math.round(length * 2));
            return <line key={i} x1={x} y1={16} x2={x} y2={84} stroke="#22323f" strokeWidth={1} opacity={0.35} />;
          })}

        {/* ---- Carrier ------------------------------------------------ */}
        {isCarrier && (
          <>
            <rect x={0.06 * L} y={13} width={0.84 * L} height={74} rx={12} fill="#3b4a58" stroke={outline} strokeWidth={2} />
            <line
              x1={0.1 * L}
              y1={50}
              x2={0.88 * L}
              y2={50}
              stroke="#ffcf5a"
              strokeWidth={3}
              strokeDasharray="16 12"
            />
            {Array.from({ length: Math.max(2, Math.round(length - 1)) }).map((_, i) => {
              const x = 0.2 * L + (i * 0.58 * L) / Math.max(1, Math.round(length - 1) - 1 || 1);
              return (
                <path
                  key={i}
                  d={`M ${x - 8},40 L ${x + 8},50 L ${x - 8},60`}
                  fill="none"
                  stroke="#dfe9f0"
                  strokeWidth={2.5}
                  opacity={0.8}
                />
              );
            })}
            {/* island on starboard */}
            <rect x={0.34 * L} y={70} width={0.16 * L} height={16} rx={3} fill={steelDark} stroke={outline} strokeWidth={2} />
            <rect x={0.37 * L} y={73} width={5} height={5} fill={glass} />
            <rect x={0.43 * L} y={73} width={5} height={5} fill={glass} />
            <line x1={0.4 * L} y1={70} x2={0.4 * L} y2={58} stroke={outline} strokeWidth={2} />
          </>
        )}

        {/* ---- Submarine --------------------------------------------- */}
        {isSub && (
          <>
            <line x1={70} y1={50} x2={L - 70} y2={50} stroke="#20313d" strokeWidth={2} opacity={0.5} strokeDasharray="10 8" />
            <rect x={cx - 26} y={36} width={52} height={28} rx={9} fill={steel} stroke={outline} strokeWidth={2.5} />
            <rect x={cx - 6} y={20} width={12} height={20} rx={4} fill={steelDark} stroke={outline} strokeWidth={2} />
            <line x1={cx + 2} y1={24} x2={cx + 22} y2={16} stroke={outline} strokeWidth={2} />
            <circle cx={cx - 12} cy={50} r={3} fill={deckTop} />
            <circle cx={cx + 12} cy={50} r={3} fill={deckTop} />
          </>
        )}

        {/* ---- Gun ships (destroyer / cruiser / torpedo boat) -------- */}
        {!isCarrier && !isSub && (
          <>
            {/* superstructure */}
            <rect
              x={0.34 * L}
              y={30}
              width={isSmall ? 0.24 * L : 0.26 * L}
              height={40}
              rx={6}
              fill={steel}
              stroke={outline}
              strokeWidth={2.5}
            />
            {/* bridge + windows */}
            <rect x={0.37 * L} y={36} width={0.12 * L} height={28} rx={4} fill={steelDark} stroke={outline} strokeWidth={2} />
            {Array.from({ length: 3 }).map((_, i) => (
              <rect key={i} x={0.385 * L + i * 0.03 * L} y={41} width={0.02 * L} height={7} fill={glass} />
            ))}
            {/* mast */}
            <line x1={0.4 * L} y1={50} x2={0.46 * L} y2={50} stroke={outline} strokeWidth={2} />
            <circle cx={0.4 * L} cy={50} r={4} fill={deckTop} stroke={outline} strokeWidth={1.5} />

            {/* funnels */}
            {isCruiser ? (
              <>
                {funnel(0.52 * L)}
                {funnel(0.62 * L)}
              </>
            ) : (
              funnel(isSmall ? 0.56 * L : 0.55 * L, 22, 30)
            )}

            {/* torpedo tubes for the small boat */}
            {isSmall && (
              <>
                <rect x={0.62 * L} y={40} width={0.14 * L} height={7} rx={3} fill={steelDark} stroke={outline} strokeWidth={1.5} />
                <rect x={0.62 * L} y={53} width={0.14 * L} height={7} rx={3} fill={steelDark} stroke={outline} strokeWidth={1.5} />
              </>
            )}

            {/* turrets: aft toward stern, forward toward bow */}
            {turret(0.16 * L, 50, -1, isCruiser ? 15 : isSmall ? 10 : 13)}
            {!isSmall && turret(0.74 * L, 50, 1, isCruiser ? 15 : 13)}
            {isSmall && turret(0.8 * L, 50, 1, 10)}
            {isCruiser && length >= 4 && turret(0.24 * L, 50, -1, 11)}

            {/* AA guns along the rails */}
            {aa(0.3 * L, 22)}
            {aa(0.3 * L, 78)}
            {aa(0.48 * L, 24)}
            {aa(0.48 * L, 76)}
          </>
        )}

        {/* squadron pennant flown at the stern */}
        {flag && flag.length > 0 && (
          <g>
            <rect x={0.05 * L - 2.5} y={34} width={2.5} height={34} fill={outline} />
            {flag.map((col, i) => (
              <rect
                key={i}
                x={0.05 * L}
                y={36 + (i * 26) / flag.length}
                width={Math.min(0.1 * L, 40)}
                height={26 / flag.length}
                fill={col}
                stroke={outline}
                strokeWidth={0.7}
              />
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}
