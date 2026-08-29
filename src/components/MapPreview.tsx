import React, { useMemo } from "react";

interface MapPreviewProps {
  boardSize: number;
  obstacles: "aucun" | "peu" | "beaucoup";
  fog: boolean;
}

const DENSITY: Record<MapPreviewProps["obstacles"], number> = {
  aucun: 0,
  peu: 0.06,
  beaucoup: 0.14,
};

// Deterministic pseudo-random so the preview is stable per (size, density).
function scatter(size: number, ratio: number): Set<number> {
  const out = new Set<number>();
  if (ratio <= 0) return out;
  const total = size * size;
  const target = Math.round(total * ratio);
  let seed = size * 97 + Math.round(ratio * 1000);
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  let guard = 0;
  while (out.size < target && guard++ < total * 4) {
    out.add(Math.floor(rnd() * total));
  }
  return out;
}

export function MapPreview({ boardSize, obstacles, fog }: MapPreviewProps) {
  const rocks = useMemo(() => scatter(boardSize, DENSITY[obstacles]), [boardSize, obstacles]);
  const cells = boardSize * boardSize;

  return (
    <div className="map-preview" aria-hidden="true">
      <div
        className="map-preview-grid"
        style={{ gridTemplateColumns: `repeat(${boardSize}, 1fr)` }}
      >
        {Array.from({ length: cells }).map((_, i) => (
          <span key={i} className={`mp-cell${rocks.has(i) ? " rock" : ""}`} />
        ))}
      </div>
      {fog && <span className="map-preview-fog" />}
      <span className="map-preview-size">
        {boardSize}&times;{boardSize}
      </span>
    </div>
  );
}
