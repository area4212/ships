import React, { useMemo, useState } from "react";
import {
  canPlaceShip,
  cellKey,
  createEmptyBoard,
  getShipCells,
  placeShip,
  randomPlaceFleet,
  removeShipAt,
  shipAtCell,
} from "../game/board";
import { BoardState, Orientation, ShipDef } from "../types/game";
import { useApp } from "../context/AppContext";
import { equippedDef, liveryFor } from "../game/cosmetics";
import { CellData, Grid, ShipOverlay } from "./Grid";

interface ShipPlacementProps {
  boardSize: number;
  fleet: ShipDef[];
  noTouchRule: boolean;
  blocked?: string[];
  title: string;
  subtitle?: string;
  onConfirm: (board: BoardState) => void;
  onBack: () => void;
}

export function ShipPlacement({
  boardSize,
  fleet,
  noTouchRule,
  blocked = [],
  title,
  subtitle,
  onConfirm,
  onBack,
}: ShipPlacementProps) {
  const { sfx, loadout } = useApp();
  const livery = liveryFor(loadout);
  const flag = equippedDef(loadout, "flag")?.flag;
  const [board, setBoard] = useState<BoardState>(() => createEmptyBoard(boardSize, blocked));
  const blockedSet = useMemo(() => new Set(blocked), [blocked]);
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [hover, setHover] = useState<string | null>(null);

  const placedIds = new Set(board.ships.map((s) => s.defId));
  const unplaced = fleet.filter((def) => !placedIds.has(def.id));
  const [selectedId, setSelectedId] = useState<string | null>(fleet[0]?.id ?? null);

  const selectedDef = fleet.find((f) => f.id === selectedId) ?? unplaced[0] ?? null;
  const allPlaced = board.ships.length === fleet.length;

  const previewCells = useMemo(() => {
    if (!hover || !selectedDef || placedIds.has(selectedDef.id)) return null;
    const [r, c] = hover.split(",").map(Number);
    const cells = getShipCells(r, c, selectedDef.size, orientation, boardSize);
    if (!cells) return { cells: [], ok: false };
    const ok = canPlaceShip(board, cells, noTouchRule);
    return { cells, ok };
  }, [hover, selectedDef, orientation, board, boardSize, noTouchRule, placedIds]);

  function handleCellClick(r: number, c: number) {
    const key = cellKey(r, c);
    const existing = shipAtCell(board, key);
    if (existing) {
      setBoard(removeShipAt(board, key));
      setSelectedId(existing.defId);
      sfx("click");
      return;
    }
    if (!selectedDef) return;
    const result = placeShip(board, selectedDef, r, c, orientation, noTouchRule);
    if (!result) {
      sfx("click");
      return;
    }
    setBoard(result);
    sfx("place");
    const nextUnplaced = fleet.filter((def) => !new Set(result.ships.map((s) => s.defId)).has(def.id));
    setSelectedId(nextUnplaced[0]?.id ?? null);
  }

  function handleRandom() {
    setBoard(randomPlaceFleet(boardSize, fleet, noTouchRule, blocked));
    setSelectedId(null);
    sfx("click");
  }

  function handleClear() {
    setBoard(createEmptyBoard(boardSize, blocked));
    setSelectedId(fleet[0]?.id ?? null);
    sfx("click");
  }

  function handleRotate() {
    setOrientation((o) => (o === "horizontal" ? "vertical" : "horizontal"));
    sfx("click");
  }

  const gridData: CellData[][] = useMemo(() => {
    const grid: CellData[][] = [];
    const previewSet = new Set(previewCells?.cells ?? []);
    for (let r = 0; r < boardSize; r++) {
      const row: CellData[] = [];
      for (let c = 0; c < boardSize; c++) {
        const key = cellKey(r, c);
        const isBlocked = blockedSet.has(key);
        const occupied = board.ships.some((s) => s.cells.includes(key));
        const cell: CellData = {
          visual: occupied ? "ship" : "water",
          clickable: !isBlocked,
          blocked: isBlocked,
        };
        if (previewSet.has(key)) {
          cell.previewState = previewCells?.ok ? "ok" : "bad";
        }
        row.push(cell);
      }
      grid.push(row);
    }
    return grid;
  }, [board, boardSize, previewCells]);

  const shipOverlays: ShipOverlay[] = board.ships.map((s) => ({
    id: `placement-${s.defId}`,
    defId: s.defId,
    cells: s.cells,
    sunk: false,
  }));

  return (
    <div className="panel stack">
      <div>
        <h2>{title}</h2>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>

      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="fleet-list" style={{ minWidth: 220 }}>
          {fleet.map((def) => {
            const isPlaced = placedIds.has(def.id);
            const isSelected = selectedDef?.id === def.id;
            return (
              <div
                key={def.id}
                className={`fleet-item ${isPlaced ? "placed" : ""} ${isSelected && !isPlaced ? "selected" : ""}`}
                onClick={() => !isPlaced && setSelectedId(def.id)}
                style={{ cursor: isPlaced ? "default" : "pointer" }}
              >
                <span>{def.name}</span>
                <span className="ship-dots">
                  {Array.from({ length: def.size }).map((_, i) => (
                    <span key={i} className="ship-dot" />
                  ))}
                </span>
              </div>
            );
          })}
        </div>

        <div className="board-block">
          <Grid
            size={boardSize}
            data={gridData}
            ships={shipOverlays}
            livery={livery}
            flag={flag}
            onCellClick={handleCellClick}
            onCellEnter={(r, c) => setHover(cellKey(r, c))}
            onCellLeave={() => setHover(null)}
          />
        </div>
      </div>

      <div className="row">
        <button className="btn" onClick={handleRotate}>
          Pivoter ({orientation === "horizontal" ? "Horizontal" : "Vertical"})
        </button>
        <button className="btn" onClick={handleRandom}>
          Placement aleatoire
        </button>
        <button className="btn" onClick={handleClear}>
          Effacer
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={onBack}>
          Retour
        </button>
        <button className="btn btn-primary" disabled={!allPlaced} onClick={() => onConfirm(board)}>
          Valider la flotte
        </button>
      </div>
    </div>
  );
}
