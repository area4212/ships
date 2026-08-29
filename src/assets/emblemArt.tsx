// Small squadron-emblem glyphs, drawn as simple monochrome SVG shapes so they
// read at badge size. No external assets. `color` tints the glyph.

import React from "react";
import type { EmblemShape } from "../game/cosmetics";

interface Props {
  shape: EmblemShape;
  color?: string;
  size?: number;
  className?: string;
}

export function EmblemGlyph({ shape, color = "#4ceaff", size = 26, className = "" }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    className,
    role: "img" as const,
    "aria-hidden": true,
  };
  const stroke = { stroke: color, strokeWidth: 2, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (shape) {
    case "ancre":
      return (
        <svg {...common}>
          <circle cx="12" cy="4.5" r="2" {...stroke} />
          <path d="M12 6.5V20" {...stroke} />
          <path d="M7 10h10" {...stroke} />
          <path d="M4 14c0 4 4 6 8 6s8-2 8-6" {...stroke} />
        </svg>
      );
    case "etoile":
      return (
        <svg {...common}>
          <path
            d="M12 2l2.7 6.3 6.8.6-5.1 4.5 1.5 6.7L12 16.9 6.1 20.6l1.5-6.7L2.5 8.9l6.8-.6z"
            fill={color}
          />
        </svg>
      );
    case "crane":
      return (
        <svg {...common}>
          <path d="M12 3c-4.4 0-7 3-7 6.5 0 2.3 1.2 3.7 2.5 4.6V17h9v-2.9c1.3-.9 2.5-2.3 2.5-4.6C19 6 16.4 3 12 3z" fill={color} />
          <circle cx="9.3" cy="10" r="1.6" fill="#0a1622" />
          <circle cx="14.7" cy="10" r="1.6" fill="#0a1622" />
          <path d="M9 19l1.5 2M15 19l-1.5 2M12 18v3" {...stroke} strokeWidth={1.6} />
        </svg>
      );
    case "trident":
      return (
        <svg {...common}>
          <path d="M12 4v16" {...stroke} />
          <path d="M6 5v4c0 2 2.7 3 6 3s6-1 6-3V5" {...stroke} />
          <path d="M6 5l-1.5-2M18 5l1.5-2M12 4V1.5" {...stroke} strokeWidth={1.6} />
          <path d="M9 20h6" {...stroke} />
        </svg>
      );
    case "eclair":
      return (
        <svg {...common}>
          <path d="M13 2L4 14h6l-2 8 11-13h-7z" fill={color} stroke="#0a1622" strokeWidth={0.8} strokeLinejoin="round" />
        </svg>
      );
    case "vague":
      return (
        <svg {...common}>
          <path d="M2 9c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0" {...stroke} />
          <path d="M2 14c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0" {...stroke} />
          <path d="M2 19c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0" {...stroke} />
        </svg>
      );
    case "none":
    default:
      return null;
  }
}
