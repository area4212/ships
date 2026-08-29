import { BoardState, FireOutcome, Orientation, PlacedShip, ShipDef } from "../types/game";

export function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

export function parseKey(key: string): [number, number] {
  const [r, c] = key.split(",").map(Number);
  return [r, c];
}

export function createEmptyBoard(size: number, blocked: string[] = []): BoardState {
  return { size, ships: [], shots: {}, blocked };
}

/**
 * Random rocks / islands shared by both boards. "peu" ~ 3 cells, "beaucoup" ~ 7,
 * grouped into 1-3 cell clusters and kept off the outermost ring so placement
 * stays feasible.
 */
export function generateObstacles(size: number, level: "peu" | "beaucoup"): string[] {
  const budget = level === "beaucoup" ? Math.round(size * 0.7) : Math.round(size * 0.3);
  const blocked = new Set<string>();
  let guard = 0;
  while (blocked.size < budget && guard++ < 400) {
    const r = 1 + Math.floor(Math.random() * (size - 2));
    const c = 1 + Math.floor(Math.random() * (size - 2));
    const clusterSize = Math.random() < 0.55 ? 1 : Math.random() < 0.7 ? 2 : 3;
    let cr = r;
    let cc = c;
    for (let i = 0; i < clusterSize; i++) {
      if (cr < 0 || cc < 0 || cr >= size || cc >= size) break;
      blocked.add(cellKey(cr, cc));
      if (Math.random() < 0.5) cc += Math.random() < 0.5 ? 1 : -1;
      else cr += Math.random() < 0.5 ? 1 : -1;
    }
  }
  return [...blocked];
}

export function allCells(size: number): string[] {
  const cells: string[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      cells.push(cellKey(r, c));
    }
  }
  return cells;
}

export function getShipCells(
  startR: number,
  startC: number,
  size: number,
  orientation: Orientation,
  boardSize: number
): string[] | null {
  const cells: string[] = [];
  for (let i = 0; i < size; i++) {
    const r = orientation === "vertical" ? startR + i : startR;
    const c = orientation === "horizontal" ? startC + i : startC;
    if (r < 0 || c < 0 || r >= boardSize || c >= boardSize) return null;
    cells.push(cellKey(r, c));
  }
  return cells;
}

function occupiedNeighborhood(existingShips: PlacedShip[], boardSize: number): Set<string> {
  const occupied = new Set<string>();
  const touching = new Set<string>();
  for (const ship of existingShips) {
    for (const key of ship.cells) {
      occupied.add(key);
      const [r, c] = parseKey(key);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= boardSize || nc >= boardSize) continue;
          touching.add(cellKey(nr, nc));
        }
      }
    }
  }
  return new Set([...occupied, ...touching]);
}

export function canPlaceShip(
  board: BoardState,
  cells: string[],
  noTouchRule: boolean
): boolean {
  const forbidden = noTouchRule
    ? occupiedNeighborhood(board.ships, board.size)
    : new Set(board.ships.flatMap((s) => s.cells));
  const blocked = new Set(board.blocked ?? []);
  return cells.every((key) => !forbidden.has(key) && !blocked.has(key));
}

export function placeShip(
  board: BoardState,
  def: ShipDef,
  startR: number,
  startC: number,
  orientation: Orientation,
  noTouchRule: boolean
): BoardState | null {
  const cells = getShipCells(startR, startC, def.size, orientation, board.size);
  if (!cells) return null;
  if (!canPlaceShip(board, cells, noTouchRule)) return null;

  const newShip: PlacedShip = {
    defId: def.id,
    name: def.name,
    size: def.size,
    cells,
    hitCells: [],
    sunk: false,
  };

  return {
    ...board,
    ships: [...board.ships, newShip],
  };
}

export function removeShipAt(board: BoardState, key: string): BoardState {
  return {
    ...board,
    ships: board.ships.filter((s) => !s.cells.includes(key)),
  };
}

export function clearBoard(board: BoardState): BoardState {
  return { ...board, ships: [] };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function randomPlaceFleet(
  size: number,
  fleet: ShipDef[],
  noTouchRule: boolean,
  blocked: string[] = []
): BoardState {
  let board = createEmptyBoard(size, blocked);
  for (const def of fleet) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 500) {
      attempts++;
      const orientation: Orientation = Math.random() < 0.5 ? "horizontal" : "vertical";
      const startR = Math.floor(Math.random() * size);
      const startC = Math.floor(Math.random() * size);
      const result = placeShip(board, def, startR, startC, orientation, noTouchRule);
      if (result) {
        board = result;
        placed = true;
      }
    }
    if (!placed) {
      // extremely unlikely fallback: retry whole layout
      return randomPlaceFleet(size, fleet, noTouchRule, blocked);
    }
  }
  return board;
}

export function fleetDestroyed(board: BoardState): boolean {
  return board.ships.length > 0 && board.ships.every((s) => s.sunk);
}

export function fireAt(board: BoardState, r: number, c: number): FireOutcome {
  const key = cellKey(r, c);

  if (board.shots[key]) {
    return { board, result: "already", victory: false };
  }

  const targetShip = board.ships.find((s) => s.cells.includes(key));

  if (!targetShip) {
    const newBoard: BoardState = {
      ...board,
      shots: { ...board.shots, [key]: "miss" },
    };
    return { board: newBoard, result: "miss", victory: false };
  }

  const updatedShip: PlacedShip = {
    ...targetShip,
    hitCells: [...targetShip.hitCells, key],
  };
  updatedShip.sunk = updatedShip.hitCells.length >= updatedShip.size;

  const newBoard: BoardState = {
    ...board,
    ships: board.ships.map((s) => (s === targetShip ? updatedShip : s)),
    shots: { ...board.shots, [key]: "hit" },
  };

  const victory = fleetDestroyed(newBoard);

  return {
    board: newBoard,
    result: updatedShip.sunk ? "sunk" : "hit",
    sunkShip: updatedShip.sunk ? updatedShip : undefined,
    victory,
  };
}

export function resetBoardCombatState(board: BoardState): BoardState {
  return {
    ...board,
    shots: {},
    blocked: board.blocked ?? [],
    ships: board.ships.map((s) => ({ ...s, hitCells: [], sunk: false })),
  };
}

export function shipAtCell(board: BoardState, key: string): PlacedShip | undefined {
  return board.ships.find((s) => s.cells.includes(key));
}

export function allShipsCellsSet(board: BoardState): Set<string> {
  return new Set(board.ships.flatMap((s) => s.cells));
}
