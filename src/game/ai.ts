import { Difficulty } from "../types/game";
import { cellKey, parseKey } from "./board";

export interface AIState {
  difficulty: Difficulty;
  boardSize: number;
  noTouch: boolean;
  hits: Set<string>;
  misses: Set<string>;
  blocked: Set<string>;
  deadCells: Set<string>; // hits that belong to an already-sunk ship
  queue: string[];
  activeHits: string[];
  axis: "h" | "v" | null;
}

export function createAIState(
  difficulty: Difficulty,
  boardSize: number,
  blocked: string[] = [],
  noTouch = false
): AIState {
  return {
    difficulty,
    boardSize,
    noTouch,
    hits: new Set(),
    misses: new Set(),
    blocked: new Set(blocked),
    deadCells: new Set(),
    queue: [],
    activeHits: [],
    axis: null,
  };
}

function inBounds(r: number, c: number, size: number): boolean {
  return r >= 0 && c >= 0 && r < size && c < size;
}

function neighbors(key: string, size: number): string[] {
  const [r, c] = parseKey(key);
  const deltas: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  const out: string[] = [];
  for (const [dr, dc] of deltas) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc, size)) out.push(cellKey(nr, nc));
  }
  return out;
}

function ring8(key: string, size: number): string[] {
  const [r, c] = parseKey(key);
  const out: string[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc, size)) out.push(cellKey(nr, nc));
    }
  }
  return out;
}

function axisNeighbors(key: string, axis: "h" | "v", size: number): string[] {
  const [r, c] = parseKey(key);
  const out: string[] = [];
  if (axis === "h") {
    if (inBounds(r, c - 1, size)) out.push(cellKey(r, c - 1));
    if (inBounds(r, c + 1, size)) out.push(cellKey(r, c + 1));
  } else {
    if (inBounds(r - 1, c, size)) out.push(cellKey(r - 1, c));
    if (inBounds(r + 1, c, size)) out.push(cellKey(r + 1, c));
  }
  return out;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function tried(state: AIState, key: string): boolean {
  return state.hits.has(key) || state.misses.has(key) || state.blocked.has(key);
}

function allUntried(state: AIState): string[] {
  const cells: string[] = [];
  for (let r = 0; r < state.boardSize; r++) {
    for (let c = 0; c < state.boardSize; c++) {
      const key = cellKey(r, c);
      if (!tried(state, key)) cells.push(key);
    }
  }
  return cells;
}

/**
 * Probability-density heuristic: for every remaining ship size, count every
 * placement (horizontal/vertical) that doesn't cross a miss/obstacle. Cells
 * crossed by more possible placements score higher; known hits add a big
 * bonus so the bot presses the attack.
 */
function probabilityMap(state: AIState, remainingSizes: number[]): Map<string, number> {
  const map = new Map<string, number>();
  const size = state.boardSize;
  const bump = (key: string, amount: number) => map.set(key, (map.get(key) || 0) + amount);
  const clear = (k: string) => !state.misses.has(k) && !state.blocked.has(k);

  for (const shipSize of remainingSizes) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (c + shipSize <= size) {
          const cells = Array.from({ length: shipSize }, (_, i) => cellKey(r, c + i));
          if (cells.every(clear)) {
            const hitsOnLine = cells.filter((k) => state.hits.has(k)).length;
            cells.forEach((k) => bump(k, 1 + hitsOnLine * 8));
          }
        }
        if (r + shipSize <= size) {
          const cells = Array.from({ length: shipSize }, (_, i) => cellKey(r + i, c));
          if (cells.every(clear)) {
            const hitsOnLine = cells.filter((k) => state.hits.has(k)).length;
            cells.forEach((k) => bump(k, 1 + hitsOnLine * 8));
          }
        }
      }
    }
  }
  return map;
}

export function chooseShot(state: AIState, remainingSizes: number[]): string {
  const untried = allUntried(state);
  if (untried.length === 0) return cellKey(0, 0);

  const queued = state.queue.filter((k) => !tried(state, k));
  const minShip = Math.max(2, Math.min(...remainingSizes, 5));

  if (state.difficulty === "facile") {
    // Reacts a little: often follows up near a hit, but not reliably.
    if (queued.length > 0 && Math.random() < 0.55) return randomFrom(queued);
    return randomFrom(untried);
  }

  if (state.difficulty === "moyen") {
    if (queued.length > 0) return queued[0];
    // light parity so it doesn't blindly re-scan explored zones
    const parity = untried.filter((k) => {
      const [r, c] = parseKey(k);
      return (r + c) % 2 === 0;
    });
    return randomFrom(parity.length ? parity : untried);
  }

  if (state.difficulty === "difficile") {
    if (queued.length > 0) return queued[0];
    // checkerboard spaced to the smallest remaining ship - guaranteed to hit
    // any ship of that size while covering the board uniformly.
    const step = Math.min(minShip, 3);
    const parityCells = untried.filter((k) => {
      const [r, c] = parseKey(k);
      return (r + c) % step === 0;
    });
    return randomFrom(parityCells.length > 0 ? parityCells : untried);
  }

  // expert: statistically most likely cell, hunting-aware
  const map = probabilityMap(state, remainingSizes);
  const pool = queued.length > 0 ? queued : untried;
  let best: string[] = [];
  let bestScore = -1;
  for (const k of pool) {
    const score = map.get(k) || 0;
    if (score > bestScore) {
      bestScore = score;
      best = [k];
    } else if (score === bestScore) {
      best.push(k);
    }
  }
  return randomFrom(best.length ? best : pool);
}

export function registerShotResult(
  state: AIState,
  key: string,
  result: "hit" | "miss" | "sunk"
): void {
  state.queue = state.queue.filter((k) => k !== key);

  if (result === "miss") {
    state.misses.add(key);
    return;
  }

  state.hits.add(key);
  state.activeHits.push(key);

  if (result === "sunk") {
    for (const cell of state.activeHits) state.deadCells.add(cell);
    // difficile / expert know that a sunk ship's neighbourhood is water when
    // the "ships don't touch" rule is on.
    if (state.noTouch && (state.difficulty === "difficile" || state.difficulty === "expert")) {
      for (const cell of state.activeHits) {
        for (const n of ring8(cell, state.boardSize)) {
          if (!state.hits.has(n)) state.misses.add(n);
        }
      }
    }
    state.activeHits = [];
    state.axis = null;
    state.queue = [];
    // resume hunting any earlier hit that isn't part of a sunk ship
    if (state.difficulty === "difficile" || state.difficulty === "expert") {
      const q: string[] = [];
      for (const h of state.hits) {
        if (state.deadCells.has(h)) continue;
        for (const n of neighbors(h, state.boardSize)) {
          if (!tried(state, n)) q.push(n);
        }
      }
      state.queue = Array.from(new Set(q));
    }
    return;
  }

  if (state.difficulty === "facile") {
    // may add follow-ups, chooseShot decides whether to use them
    for (const n of neighbors(key, state.boardSize)) {
      if (!tried(state, n)) state.queue.push(n);
    }
    return;
  }

  const usesAxis = state.difficulty === "difficile" || state.difficulty === "expert";
  const [kr, kc] = parseKey(key);

  // Lock the axis as soon as two orthogonally-adjacent hits line up.
  if (usesAxis && !state.axis) {
    for (const h of state.activeHits) {
      if (h === key || state.deadCells.has(h)) continue;
      const [hr, hc] = parseKey(h);
      if (hr === kr && Math.abs(hc - kc) === 1) {
        state.axis = "h";
        break;
      }
      if (hc === kc && Math.abs(hr - kr) === 1) {
        state.axis = "v";
        break;
      }
    }
  }

  const candidates = new Set<string>();
  if (usesAxis && state.axis) {
    // extend from every live hit that sits on the same line as this one
    for (const h of state.activeHits) {
      if (state.deadCells.has(h)) continue;
      const [hr, hc] = parseKey(h);
      const sameLine = state.axis === "h" ? hr === kr : hc === kc;
      if (!sameLine) continue;
      for (const n of axisNeighbors(h, state.axis, state.boardSize)) {
        if (!tried(state, n)) candidates.add(n);
      }
    }
  }
  if (candidates.size === 0) {
    // no axis yet (or exhausted) - probe orthogonal neighbours of live hits
    for (const h of [...state.queue, ...neighbors(key, state.boardSize)]) {
      if (!tried(state, h)) candidates.add(h);
    }
  }

  state.queue = [...candidates];
}
