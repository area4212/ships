// Host-authoritative free-for-all engine (2 to 4 players). Shooting + shared
// obstacles only, no powers. Last fleet afloat wins. The host holds every
// board and relays each player only what they may see.

import { fireAt, parseKey, shipAtCell } from "./board";
import { BoardState } from "../types/game";
import type { CellData, ShipOverlay } from "../components/Grid";

export type FSeat = string; // "0", "1", "2", ...

export interface FFAConfig {
  boardSize: number;
  obstacles: string[];
  fireAgainOnHit: boolean;
  seats: FSeat[];
  names: Record<FSeat, string>;
}

export interface FFAAction {
  target: FSeat;
  r: number;
  c: number;
}

export interface FFAState {
  cfg: FFAConfig;
  boards: Record<FSeat, BoardState>;
  alive: Record<FSeat, boolean>;
  turn: FSeat;
  phase: "playing" | "over";
  winner: FSeat | null;
  log: string[];
}

const COORD = "ABCDEFGHIJKLMNOP";
function coord(key: string): string {
  const [r, c] = parseKey(key);
  return `${COORD[c] ?? c + 1}${r + 1}`;
}
const fleetAlive = (b: BoardState) => b.ships.filter((s) => !s.sunk).length;

function nextAliveSeat(state: FFAState, from: FSeat): FSeat {
  const order = state.cfg.seats;
  const i = order.indexOf(from);
  for (let step = 1; step <= order.length; step++) {
    const cand = order[(i + step) % order.length];
    if (state.alive[cand]) return cand;
  }
  return from;
}

export function createFFAState(cfg: FFAConfig, boards: Record<FSeat, BoardState>): FFAState {
  const alive: Record<FSeat, boolean> = {};
  for (const s of cfg.seats) alive[s] = true;
  const first = cfg.seats[Math.floor(Math.random() * cfg.seats.length)];
  return {
    cfg,
    boards,
    alive,
    turn: first,
    phase: "playing",
    winner: null,
    log: [`Chaos a ${cfg.seats.length} : ${cfg.names[first]} ouvre le feu.`],
  };
}

export function ffaResolve(state: FFAState, actor: FSeat, a: FFAAction): FFAState {
  if (state.phase !== "playing" || state.turn !== actor) return state;
  if (actor === a.target || !state.alive[a.target] || !state.alive[actor]) return state;

  const s: FFAState = {
    ...state,
    boards: { ...state.boards },
    alive: { ...state.alive },
    log: [...state.log],
  };
  const log = (line: string) => {
    s.log = [line, ...s.log].slice(0, 40);
  };

  const tgtBoard = s.boards[a.target];
  const key = `${a.r},${a.c}`;
  if (tgtBoard.shots[key] || (tgtBoard.blocked ?? []).includes(key)) return state;

  const out = fireAt(tgtBoard, a.r, a.c);
  s.boards[a.target] = out.board;
  const names = s.cfg.names;
  let hit = false;
  if (out.result === "miss") {
    log(`${names[actor]} tire sur ${names[a.target]} en ${coord(key)} : dans l'eau.`);
  } else if (out.result === "hit") {
    hit = true;
    log(`${names[actor]} touche ${names[a.target]} en ${coord(key)} !`);
  } else if (out.result === "sunk" && out.sunkShip) {
    hit = true;
    log(`${names[actor]} coule le ${out.sunkShip.name} de ${names[a.target]} !`);
  }

  if (fleetAlive(out.board) === 0) {
    s.alive[a.target] = false;
    log(`${names[a.target]} est elimine !`);
  }

  const remaining = s.cfg.seats.filter((seat) => s.alive[seat]);
  if (remaining.length <= 1) {
    s.phase = "over";
    s.winner = remaining[0] ?? actor;
    log(`${names[s.winner]} remporte le chaos !`);
    return s;
  }

  const keep = hit && s.cfg.fireAgainOnHit && s.alive[a.target];
  s.turn = keep ? actor : nextAliveSeat(s, actor);
  return s;
}

// ---- views ----------------------------------------------------------------

export interface FFAOpponentView {
  seatId: FSeat;
  name: string;
  alive: boolean;
  tracking: CellData[][];
  trackingShips: ShipOverlay[];
  fleet: { name: string; size: number; sunk: boolean }[];
}

export interface FFAView {
  boardSize: number;
  yourTurn: boolean;
  eliminated: boolean;
  phase: "playing" | "over";
  result: "win" | "loss" | null;
  turnName: string;
  log: string[];
  own: CellData[][];
  ownShips: ShipOverlay[];
  ownFleet: { name: string; size: number; hits: number; sunk: boolean }[];
  opponents: FFAOpponentView[];
}

function trackingGrid(board: BoardState, size: number): CellData[][] {
  const grid: CellData[][] = [];
  const blocked = new Set(board.blocked ?? []);
  for (let r = 0; r < size; r++) {
    const row: CellData[] = [];
    for (let c = 0; c < size; c++) {
      const key = `${r},${c}`;
      const shot = board.shots[key];
      let v: CellData["visual"] = "water";
      if (shot === "hit") v = shipAtCell(board, key)?.sunk ? "sunk" : "hit";
      else if (shot === "miss") v = "miss";
      row.push({ visual: v, clickable: false, blocked: blocked.has(key) });
    }
    grid.push(row);
  }
  return grid;
}

export function ffaViewFor(state: FFAState, seat: FSeat): FFAView {
  const size = state.cfg.boardSize;
  const mine = state.boards[seat];
  const shipCells = new Set(mine.ships.flatMap((s) => s.cells));
  const blocked = new Set(mine.blocked ?? []);

  const own: CellData[][] = [];
  for (let r = 0; r < size; r++) {
    const row: CellData[] = [];
    for (let c = 0; c < size; c++) {
      const key = `${r},${c}`;
      const shot = mine.shots[key];
      let v: CellData["visual"] = shipCells.has(key) ? "ship" : "water";
      if (shot === "hit") v = shipAtCell(mine, key)?.sunk ? "sunk" : "hit";
      else if (shot === "miss") v = "miss";
      row.push({ visual: v, clickable: false, blocked: blocked.has(key) });
    }
    own.push(row);
  }

  return {
    boardSize: size,
    yourTurn: state.turn === seat && state.phase === "playing" && state.alive[seat],
    eliminated: !state.alive[seat],
    phase: state.phase,
    result:
      state.phase === "over" ? (state.winner === seat ? "win" : "loss") : null,
    turnName: state.cfg.names[state.turn] ?? "",
    log: state.log,
    own,
    ownShips: mine.ships.map((s) => ({ id: `o-${s.defId}`, defId: s.defId, cells: s.cells, sunk: s.sunk })),
    ownFleet: mine.ships.map((s) => ({ name: s.name, size: s.size, hits: s.hitCells.length, sunk: s.sunk })),
    opponents: state.cfg.seats
      .filter((sid) => sid !== seat)
      .map((sid) => {
        const b = state.boards[sid];
        return {
          seatId: sid,
          name: state.cfg.names[sid] ?? "Joueur",
          alive: state.alive[sid],
          tracking: trackingGrid(b, size),
          trackingShips: b.ships
            .filter((s) => s.sunk)
            .map((s) => ({ id: `e-${sid}-${s.defId}`, defId: s.defId, cells: s.cells, sunk: true })),
          fleet: b.ships.map((s) => ({ name: s.name, size: s.size, sunk: s.sunk })),
        };
      }),
  };
}
