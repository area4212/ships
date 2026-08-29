import React from "react";
import { ExplosionIcon, SplashIcon } from "../assets/icons";
import { ShipArt } from "../assets/shipArt";
import { Orientation } from "../types/game";
import { ShipLivery } from "../game/cosmetics";

export type CellVisual = "water" | "ship" | "hit" | "miss" | "sunk";

export interface CellData {
  visual: CellVisual;
  clickable: boolean;
  previewState?: "ok" | "bad";
  animate?: boolean;
  reveal?: "ship" | "water"; // drone scouting overlay on the tracking grid
  mine?: boolean; // your own mine on your grid
  sonar?: number; // sonar count badge shown on the zone centre
  aim?: boolean; // power-targeting highlight
  blocked?: boolean; // rock / island - impassable
  fog?: boolean; // fog of war - unexplored
}

export interface ShipOverlay {
  id: string;
  defId: string;
  cells: string[];
  sunk: boolean;
}

interface GridProps {
  size: number;
  data: CellData[][];
  ships?: ShipOverlay[];
  variant?: "enemy" | "own";
  livery?: ShipLivery;
  flag?: string[];
  onCellClick?: (r: number, c: number) => void;
  onCellEnter?: (r: number, c: number) => void;
  onCellLeave?: () => void;
}

const COLS = "ABCDEFGHIJKLMNOP";

function overlayGeometry(cells: string[]): { r: number; c: number; rowSpan: number; colSpan: number; orientation: Orientation } {
  const points = cells.map((key) => key.split(",").map(Number));
  const rows = points.map((p) => p[0]);
  const cols = points.map((p) => p[1]);
  const minR = Math.min(...rows);
  const minC = Math.min(...cols);
  const orientation: Orientation = rows.every((r) => r === rows[0]) ? "horizontal" : "vertical";
  return {
    r: minR,
    c: minC,
    rowSpan: orientation === "vertical" ? cells.length : 1,
    colSpan: orientation === "horizontal" ? cells.length : 1,
    orientation,
  };
}

export function Grid({ size, data, ships, variant, livery, flag, onCellClick, onCellEnter, onCellLeave }: GridProps) {
  const columns = `28px repeat(${size}, var(--cell-size, 34px))`;
  const rowsTemplate = `28px repeat(${size}, var(--cell-size, 34px))`;

  return (
    <div
      className={`grid-board${variant ? ` grid-${variant}` : ""}`}
      style={{ gridTemplateColumns: columns, gridTemplateRows: rowsTemplate }}
    >
      <div className="grid-label" style={{ gridRow: 1, gridColumn: 1 }} />
      {Array.from({ length: size }).map((_, c) => (
        <div key={`col-${c}`} className="grid-label" style={{ gridRow: 1, gridColumn: c + 2 }}>
          {COLS[c] ?? c + 1}
        </div>
      ))}
      {Array.from({ length: size }).map((_, r) => (
        <div key={`row-${r}`} className="grid-label" style={{ gridRow: r + 2, gridColumn: 1 }}>
          {r + 1}
        </div>
      ))}

      {ships?.map((ship) => {
        const geo = overlayGeometry(ship.cells);
        return (
          <div
            key={ship.id}
            className={`ship-overlay ${ship.sunk ? "sunk" : ""}`}
            style={{
              gridRow: `${geo.r + 2} / span ${geo.rowSpan}`,
              gridColumn: `${geo.c + 2} / span ${geo.colSpan}`,
            }}
          >
            <ShipArt
              variant={ship.defId}
              length={ship.cells.length}
              orientation={geo.orientation}
              uid={ship.id}
              livery={livery}
              flag={flag}
              sunk={ship.sunk}
            />
          </div>
        );
      })}

      {Array.from({ length: size }).map((_, r) =>
        Array.from({ length: size }).map((_, c) => {
          const cell = data[r][c];
          const classes = ["cell", cell.visual];
          classes.push(cell.clickable ? "clickable" : "disabled");
          if (cell.previewState === "ok") classes.push("preview-ok");
          if (cell.previewState === "bad") classes.push("preview-bad");
          if (cell.animate) classes.push("anim");
          if (cell.reveal) classes.push(`reveal-${cell.reveal}`);
          if (cell.mine) classes.push("has-mine");
          if (cell.aim) classes.push("aim");
          if (cell.blocked) classes.push("blocked");
          if (cell.fog) classes.push("fog");

          return (
            <div
              key={`${r}-${c}`}
              className={classes.join(" ")}
              style={{ gridRow: r + 2, gridColumn: c + 2 }}
              onClick={() => cell.clickable && onCellClick?.(r, c)}
              onMouseEnter={() => onCellEnter?.(r, c)}
              onMouseLeave={() => onCellLeave?.()}
            >
              {(cell.visual === "hit" || cell.visual === "sunk") && <ExplosionIcon className="mark" />}
              {cell.visual === "miss" && <SplashIcon className="mark" />}
              {cell.reveal === "ship" && cell.visual !== "hit" && cell.visual !== "sunk" && (
                <span className="reveal-mark" aria-hidden="true" />
              )}
              {cell.mine && <span className="mine-mark" aria-hidden="true">⚓</span>}
              {cell.sonar !== undefined && <span className="sonar-badge">{cell.sonar}</span>}
              {cell.blocked && <span className="rock-mark" aria-hidden="true">🪨</span>}
              {cell.fog && <span className="fog-mark" aria-hidden="true" />}

              {cell.animate && (cell.visual === "hit" || cell.visual === "sunk") && (
                <span
                  className={`boom${cell.visual === "sunk" ? " boom-sunk" : ""}`}
                  aria-hidden="true"
                >
                  <span className="boom-flash" />
                  <span className="boom-fire" />
                  <span className="boom-ring" />
                  <span className="boom-debris" />
                  <span className="boom-smoke" />
                </span>
              )}
              {cell.animate && cell.visual === "miss" && (
                <span className="splash-fx" aria-hidden="true">
                  <span className="splash-sheet" />
                  <span className="splash-col" />
                  <span className="splash-ring" />
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
