// Host-authoritative engine for online 1v1. The host holds both boards and
// resolves every action (its own clicks + the guest's relayed inputs), then
// broadcasts each player a view of only what they may see.

import { fireAt, parseKey, shipAtCell } from "./board";
import { BoardState } from "../types/game";
import { CROSS, PowerId, zone3x3 } from "./powers";
import type { CellData, ShipOverlay } from "../components/Grid";

export type Seat = "host" | "guest";
export const other = (s: Seat): Seat => (s === "host" ? "guest" : "host");

export interface OnlineAction {
  kind: "shot" | "barrage" | "torpille" | "drone" | "sonar" | "mine" | "repair";
  r: number;
  c: number;
  axis?: "row" | "col";
  power?: PowerId;
}

export interface OnlineConfig {
  boardSize: number;
  obstacles: string[];
  fireAgainOnHit: boolean;
  energyStart: number;
  energyPerTurn: number;
  powerDiscount: number;
  mineLimit: number;
  scoutStart: number;
  repairStart: number;
}

export interface HostState {
  cfg: OnlineConfig;
  boards: Record<Seat, BoardState>;
  turn: Seat;
  phase: "playing" | "over";
  winner: Seat | null;
  energy: Record<Seat, number>;
  revealed: Record<Seat, Record<string, "ship" | "water">>;
  sonarMarks: Record<Seat, Record<string, number>>;
  mines: Record<Seat, string[]>;
  repairLeft: Record<Seat, number>;
  log: string[];
}

const POWER_BASE: Record<PowerId, number> = {
  drone: 3,
  sonar: 2,
  barrage: 4,
  torpille: 3,
  mine: 2,
};

export function powerCost(cfg: OnlineConfig, p: PowerId): number {
  return Math.max(1, POWER_BASE[p] - cfg.powerDiscount);
}

function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createHostState(
  cfg: OnlineConfig,
  hostBoard: BoardState,
  guestBoard: BoardState,
  first: Seat
): HostState {
  const seedScout = (from: BoardState): Record<string, "ship" | "water"> => {
    const out: Record<string, "ship" | "water"> = {};
    if (cfg.scoutStart > 0) {
      for (const k of shuffle(from.ships.flatMap((s) => s.cells)).slice(0, cfg.scoutStart)) out[k] = "ship";
    }
    return out;
  };
  return {
    cfg,
    boards: { host: hostBoard, guest: guestBoard },
    turn: first,
    phase: "playing",
    winner: null,
    energy: { host: cfg.energyStart, guest: cfg.energyStart },
    revealed: { host: seedScout(guestBoard), guest: seedScout(hostBoard) },
    sonarMarks: { host: {}, guest: {} },
    mines: { host: [], guest: [] },
    repairLeft: { host: cfg.repairStart, guest: cfg.repairStart },
    log: ["La bataille commence."],
  };
}

function coord(key: string): string {
  const [r, c] = parseKey(key);
  return `${"ABCDEFGHIJKLMNOP"[c] ?? c + 1}${r + 1}`;
}

const fleetAlive = (b: BoardState) => b.ships.filter((s) => !s.sunk).length;

/** Mutates a shallow-cloned state and returns it. `actor` is the shooter. */
export function resolveAction(state: HostState, actor: Seat, a: OnlineAction): HostState {
  if (state.phase !== "playing" || state.turn !== actor) return state;
  const s: HostState = {
    ...state,
    boards: { ...state.boards },
    energy: { ...state.energy },
    revealed: { host: { ...state.revealed.host }, guest: { ...state.revealed.guest } },
    sonarMarks: { host: { ...state.sonarMarks.host }, guest: { ...state.sonarMarks.guest } },
    mines: { host: [...state.mines.host], guest: [...state.mines.guest] },
    repairLeft: { ...state.repairLeft },
    log: [...state.log],
  };
  const foe = other(actor);
  const foeBoard = s.boards[foe];
  const blockedFoe = new Set(foeBoard.blocked ?? []);
  const key = `${a.r},${a.c}`;
  const log = (line: string) => {
    s.log = [line, ...s.log].slice(0, 40);
  };
  const cost = a.power ? powerCost(s.cfg, a.power) : 0;
  if (a.power && s.energy[actor] < cost) return state;

  let endsTurnToFoe = true;
  let anyHit = false;

  if (a.kind === "repair") {
    if (s.repairLeft[actor] <= 0) return state;
    const board = s.boards[actor];
    const ship = board.ships.find((sh) => !sh.sunk && sh.hitCells.length > 0);
    if (!ship) return state;
    const cell = ship.hitCells[ship.hitCells.length - 1];
    const shots = { ...board.shots };
    delete shots[cell];
    s.boards[actor] = {
      ...board,
      shots,
      ships: board.ships.map((sh) =>
        sh === ship ? { ...sh, hitCells: sh.hitCells.slice(0, -1), sunk: false } : sh
      ),
    };
    s.repairLeft[actor] -= 1;
    log(`${actor === "host" ? "Hote" : "Invite"} repare sa coque.`);
    return s; // free action, no turn change
  }

  if (a.power) s.energy[actor] -= cost;

  if (a.kind === "drone") {
    const zone = zone3x3(a.r, a.c, s.cfg.boardSize);
    const rev = { ...s.revealed[actor] };
    let found = 0;
    for (const k of zone) {
      const isShip = Boolean(shipAtCell(foeBoard, k));
      rev[k] = isShip ? "ship" : "water";
      if (isShip) found++;
    }
    s.revealed[actor] = rev;
    log(`Drone sur ${coord(key)} : ${found} case(s) de navire dans la zone.`);
  } else if (a.kind === "sonar") {
    const zone = zone3x3(a.r, a.c, s.cfg.boardSize);
    const count = zone.filter((k) => shipAtCell(foeBoard, k)).length;
    s.sonarMarks[actor] = { ...s.sonarMarks[actor], [key]: count };
    log(`Sonar sur ${coord(key)} : ${count} case(s) occupee(s).`);
  } else if (a.kind === "mine") {
    if (
      s.boards[actor].shots[key] ||
      s.mines[actor].includes(key) ||
      s.mines[actor].length >= s.cfg.mineLimit ||
      (s.boards[actor].blocked ?? []).includes(key)
    ) {
      if (a.power) s.energy[actor] += cost;
      return state;
    }
    s.mines[actor] = [...s.mines[actor], key];
    log(`Mine posee en ${coord(key)}.`);
  } else {
    // shot / barrage / torpille -> resolve cells against the foe board
    let cells: string[];
    if (a.kind === "barrage") {
      cells = CROSS.map(([dr, dc]) => `${a.r + dr},${a.c + dc}`).filter((k) => {
        const [rr, cc] = parseKey(k);
        return rr >= 0 && cc >= 0 && rr < s.cfg.boardSize && cc < s.cfg.boardSize && !blockedFoe.has(k);
      });
    } else if (a.kind === "torpille") {
      cells = [];
      for (let i = 0; i < s.cfg.boardSize; i++) {
        const k = a.axis === "col" ? `${i},${a.c}` : `${a.r},${i}`;
        if (foeBoard.shots[k] || blockedFoe.has(k)) continue;
        cells.push(k);
        if (shipAtCell(foeBoard, k)) break;
      }
    } else {
      cells = [key];
    }

    // mine on the foe's board catches the incoming shot
    let board = foeBoard;
    for (const k of cells) {
      if (board.shots[k]) continue;
      if (s.mines[foe].includes(k)) {
        s.mines[foe] = s.mines[foe].filter((m) => m !== k);
        board = { ...board, shots: { ...board.shots, [k]: "miss" } };
        s.energy[foe] = Math.min(12, s.energy[foe] + 2);
        log(`Mine ! Le tir en ${coord(k)} est devie (contrecoup +2 energie).`);
        continue;
      }
      const [rr, cc] = parseKey(k);
      const out = fireAt(board, rr, cc);
      board = out.board;
      if (out.result === "hit") {
        anyHit = true;
        log(`Touche en ${coord(k)} !`);
      } else if (out.result === "sunk" && out.sunkShip) {
        anyHit = true;
        log(`${out.sunkShip.name} coule !`);
      } else if (out.result === "miss") {
        log(`${coord(k)} : dans l'eau.`);
      }
    }
    s.boards[foe] = board;

    if (fleetAlive(board) === 0) {
      s.phase = "over";
      s.winner = actor;
      log(`${actor === "host" ? "Hote" : "Invite"} remporte la bataille !`);
      return s;
    }

    // fire-again only for direct shots (not the one-shot power salvos)
    if (a.kind === "shot" && anyHit && s.cfg.fireAgainOnHit) endsTurnToFoe = false;
  }

  const nextTurn: Seat = endsTurnToFoe ? foe : actor;
  if (nextTurn !== s.turn) {
    s.energy[nextTurn] = Math.min(12, s.energy[nextTurn] + s.cfg.energyPerTurn);
  }
  s.turn = nextTurn;
  return s;
}

// ---- view builders ----------------------------------------------------------

export interface SeatView {
  yourTurn: boolean;
  phase: "playing" | "over";
  result: "win" | "loss" | null;
  boardSize: number;
  log: string[];
  energy: number;
  repairLeft: number;
  mineCount: number;
  tracking: CellData[][];
  own: CellData[][];
  trackingShips: ShipOverlay[];
  ownShips: ShipOverlay[];
  enemyFleet: { name: string; size: number; sunk: boolean }[];
  ownFleet: { name: string; size: number; hits: number; sunk: boolean }[];
}

export function viewFor(state: HostState, seat: Seat): SeatView {
  const size = state.cfg.boardSize;
  const foe = other(seat);
  const mine = state.boards[seat];
  const enemy = state.boards[foe];
  const revealed = state.revealed[seat];
  const sonar = state.sonarMarks[seat];
  const mineSet = new Set(state.mines[seat]);
  const blocked = new Set(mine.blocked ?? []);

  const tracking: CellData[][] = [];
  const own: CellData[][] = [];
  const shipCells = new Set(mine.ships.flatMap((s) => s.cells));

  for (let r = 0; r < size; r++) {
    const trow: CellData[] = [];
    const orow: CellData[] = [];
    for (let c = 0; c < size; c++) {
      const key = `${r},${c}`;
      // tracking (enemy board)
      const eShot = enemy.shots[key];
      let tv: CellData["visual"] = "water";
      if (eShot === "hit") tv = shipAtCell(enemy, key)?.sunk ? "sunk" : "hit";
      else if (eShot === "miss") tv = "miss";
      trow.push({
        visual: tv,
        clickable: false,
        reveal: !eShot ? revealed[key] : undefined,
        sonar: sonar[key],
        blocked: (enemy.blocked ?? []).includes(key),
      });
      // own board
      const mShot = mine.shots[key];
      let ov: CellData["visual"] = shipCells.has(key) ? "ship" : "water";
      if (mShot === "hit") ov = shipAtCell(mine, key)?.sunk ? "sunk" : "hit";
      else if (mShot === "miss") ov = "miss";
      orow.push({ visual: ov, clickable: false, mine: mineSet.has(key), blocked: blocked.has(key) });
    }
    tracking.push(trow);
    own.push(orow);
  }

  return {
    yourTurn: state.turn === seat && state.phase === "playing",
    phase: state.phase,
    result: state.phase === "over" ? (state.winner === seat ? "win" : "loss") : null,
    boardSize: size,
    log: state.log,
    energy: state.energy[seat],
    repairLeft: state.repairLeft[seat],
    mineCount: state.mines[seat].length,
    tracking,
    own,
    trackingShips: enemy.ships
      .filter((s) => s.sunk)
      .map((s) => ({ id: `e-${s.defId}`, defId: s.defId, cells: s.cells, sunk: true })),
    ownShips: mine.ships.map((s) => ({ id: `o-${s.defId}`, defId: s.defId, cells: s.cells, sunk: s.sunk })),
    enemyFleet: enemy.ships.map((s) => ({ name: s.name, size: s.size, sunk: s.sunk })),
    ownFleet: mine.ships.map((s) => ({
      name: s.name,
      size: s.size,
      hits: s.hitCells.length,
      sunk: s.sunk,
    })),
  };
}

// ---- spectator view (both boards fully visible) ---------------------------

export interface SpectatorView {
  boardSize: number;
  phase: "playing" | "over";
  winner: Seat | null;
  turn: Seat;
  hostName: string;
  guestName: string;
  hostOwn: CellData[][];
  guestOwn: CellData[][];
  hostShips: ShipOverlay[];
  guestShips: ShipOverlay[];
  hostFleet: { name: string; size: number; hits: number; sunk: boolean }[];
  guestFleet: { name: string; size: number; hits: number; sunk: boolean }[];
  log: string[];
}

function ownGrid(board: BoardState, mines: string[], size: number): CellData[][] {
  const shipCells = new Set(board.ships.flatMap((s) => s.cells));
  const mineSet = new Set(mines);
  const blocked = new Set(board.blocked ?? []);
  const grid: CellData[][] = [];
  for (let r = 0; r < size; r++) {
    const row: CellData[] = [];
    for (let c = 0; c < size; c++) {
      const key = `${r},${c}`;
      const shot = board.shots[key];
      let v: CellData["visual"] = shipCells.has(key) ? "ship" : "water";
      if (shot === "hit") v = shipAtCell(board, key)?.sunk ? "sunk" : "hit";
      else if (shot === "miss") v = "miss";
      row.push({ visual: v, clickable: false, mine: mineSet.has(key), blocked: blocked.has(key) });
    }
    grid.push(row);
  }
  return grid;
}

const overlaysOf = (board: BoardState, prefix: string): ShipOverlay[] =>
  board.ships.map((s) => ({ id: `${prefix}-${s.defId}`, defId: s.defId, cells: s.cells, sunk: s.sunk }));

const fleetOf = (board: BoardState) =>
  board.ships.map((s) => ({ name: s.name, size: s.size, hits: s.hitCells.length, sunk: s.sunk }));

export function spectatorView(state: HostState, names: { host: string; guest: string }): SpectatorView {
  const size = state.cfg.boardSize;
  return {
    boardSize: size,
    phase: state.phase,
    winner: state.winner,
    turn: state.turn,
    hostName: names.host || "Hote",
    guestName: names.guest || "Invite",
    hostOwn: ownGrid(state.boards.host, state.mines.host, size),
    guestOwn: ownGrid(state.boards.guest, state.mines.guest, size),
    hostShips: overlaysOf(state.boards.host, "h"),
    guestShips: overlaysOf(state.boards.guest, "g"),
    hostFleet: fleetOf(state.boards.host),
    guestFleet: fleetOf(state.boards.guest),
    log: state.log,
  };
}
