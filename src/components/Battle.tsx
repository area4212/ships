import React, { useEffect, useMemo, useState } from "react";
import { AIState, chooseShot, createAIState, registerShotResult } from "../game/ai";
import { fireAt, parseKey, shipAtCell } from "../game/board";
import { BoardState, Difficulty, PlacedShip } from "../types/game";
import { useApp } from "../context/AppContext";
import { setTension } from "../game/music";
import { UpgradeId, upgradeLevel } from "../game/progression";
import { EmblemShape, HullTrait, equippedDef, hullTraitOf, liveryFor } from "../game/cosmetics";
import { EmblemGlyph } from "../assets/emblemArt";
import { EmoteBar, FloatingEmote } from "./EmoteBar";
import { randomEmote } from "../game/emotes";
import { FlagshipPortrait, EmblemImage } from "./FlagshipPortrait";
import {
  CROSS,
  ENERGY_MAX,
  ENERGY_PER_TURN,
  ENERGY_START,
  POWERS,
  PowerId,
  powerById,
  zone3x3,
} from "../game/powers";
import { AnchorIcon } from "../assets/icons";
import { ShipSilhouette } from "../assets/ShipSilhouette";
import { CellData, Grid, ShipOverlay } from "./Grid";

const COL_LETTERS = "ABCDEFGHIJKLMNOP";
function coordLabel(key: string): string {
  const [r, c] = key.split(",").map(Number);
  return `${COL_LETTERS[c] ?? c + 1}${r + 1}`;
}

type Side = "A" | "B";

interface BattleProps {
  mode: "pvp" | "bot" | "arene";
  difficulty?: Difficulty;
  boardA: BoardState;
  boardB: BoardState;
  nameA: string;
  nameB: string;
  fogOverride?: boolean;
  fireAgainOverride?: boolean;
  arenaTag?: { name: string; stars: number; powerCostMod?: number };
  onGameEnd: (winner: Side) => void;
  onQuit: () => void;
}

interface LocalState {
  boardA: BoardState;
  boardB: BoardState;
  turn: Side;
  phase: "handoff" | "playing" | "over";
  log: string[];
  lastShot: { side: Side; key: string } | null;
  winner: Side | null;
  // --- powers (side A / human only) ---
  energy: number;
  revealed: Record<string, "ship" | "water">; // A's scouting of board B
  sonarMarks: Record<string, number>; // centre key -> occupied count
  mines: string[]; // A's mines, on board A
  repairLeft: number; // Chantier naval uses remaining
  powerCooldowns: Partial<Record<PowerId, number>>; // turns left before a power can be reused
}

// count one turn off every active power cooldown, dropping the ones that hit 0
function tickCooldowns(cd: Partial<Record<PowerId, number>>): Partial<Record<PowerId, number>> {
  const out: Partial<Record<PowerId, number>> = {};
  (Object.keys(cd) as PowerId[]).forEach((k) => {
    const v = (cd[k] ?? 0) - 1;
    if (v > 0) out[k] = v;
  });
  return out;
}

function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function opponentOf(side: Side): Side {
  return side === "A" ? "B" : "A";
}

function remainingSizes(board: BoardState): number[] {
  return board.ships.filter((s) => !s.sunk).map((s) => s.size);
}

const clampEnergy = (n: number) => Math.max(0, Math.min(ENERGY_MAX, n));

export function Battle({
  mode,
  difficulty,
  boardA,
  boardB,
  nameA,
  nameB,
  fogOverride,
  fireAgainOverride,
  arenaTag,
  onGameEnd,
  onQuit,
}: BattleProps) {
  const { settings, sfx, recordShot, stats, loadout } = useApp();
  const ownLivery = liveryFor(loadout);
  const ownAura = equippedDef(loadout, "aura")?.aura;
  const ownFlag = equippedDef(loadout, "flag")?.flag;
  const ownEmblem = equippedDef(loadout, "emblem")?.emblem;
  const gridTheme = equippedDef(loadout, "grid")?.grid;
  const fxTrail = equippedDef(loadout, "trail")?.trail;
  const loadoutVars = {
    ...(fxTrail ? { ["--fx-trail" as string]: fxTrail } : {}),
  } as React.CSSProperties;
  const ownGridVars = {
    ...(gridTheme
      ? {
          ["--grid-water" as string]: gridTheme.water,
          ["--grid-cell" as string]: gridTheme.water,
          ["--grid-line" as string]: gridTheme.line,
        }
      : {}),
  } as React.CSSProperties;
  const isPvp = mode === "pvp";
  const boardSize = boardA.size;
  const powersEnabled = settings.powersOn && !isPvp;

  const up = (id: UpgradeId) => (powersEnabled ? upgradeLevel(stats.upgrades, id) : 0);
  // equipped hull passive perk (vs bot / arena only)
  const hullPerk = powersEnabled ? hullTraitOf(loadout) : undefined;
  const t = (k: HullTrait, v: number) => (hullPerk?.hullTrait === k ? v : 0);
  const energyPerTurn = ENERGY_PER_TURN + up("generateur") + t("regen", 1);
  const mineLimit = 1 + up("champMines") + t("mine", 1);
  const arenaPowerTax = arenaTag?.powerCostMod ?? 0;
  const powerCost = (pid: PowerId) =>
    Math.max(1, powerById(pid).cost + arenaPowerTax - up("optimisation") - t("discount", 1));

  const blocked = boardA.blocked ?? [];
  const fogOn = (fogOverride ?? settings.fogOfWar) && !isPvp;
  const fireAgain = fireAgainOverride ?? settings.fireAgainOnHit;

  const [aiState] = useState<AIState>(() =>
    createAIState(difficulty ?? "moyen", boardSize, blocked, settings.noTouchRule)
  );

  const [state, setState] = useState<LocalState>(() => {
    const scout = upgradeLevel(stats.upgrades, "eclaireur") * 2 + t("scout", 2);
    const revealed: Record<string, "ship" | "water"> = {};
    if (powersEnabled && scout > 0) {
      const shipCells = shuffle(boardB.ships.flatMap((s) => s.cells)).slice(0, scout);
      for (const k of shipCells) revealed[k] = "ship";
    }
    return {
      boardA,
      boardB,
      turn: "A" as Side,
      phase: isPvp ? "handoff" : ("playing" as LocalState["phase"]),
      log: isPvp ? [`${nameA} commence la bataille.`] : [`${nameA}, a vous de tirer !`],
      lastShot: null,
      winner: null,
      energy:
        ENERGY_START +
        (powersEnabled ? upgradeLevel(stats.upgrades, "reacteur") * 2 : 0) +
        t("energyStart", 2),
      revealed,
      sonarMarks: {},
      mines: [],
      repairLeft: (powersEnabled ? upgradeLevel(stats.upgrades, "chantier") : 0) + t("repair", 1),
      powerCooldowns: {},
    };
  });

  const [selectedPower, setSelectedPower] = useState<PowerId | null>(null);
  const [myEmote, setMyEmote] = useState<{ id: string; ts: number } | null>(null);
  const [botEmote, setBotEmote] = useState<{ id: string; ts: number } | null>(null);
  const [torpilleAxis, setTorpilleAxis] = useState<"row" | "col">("row");
  const [aimHover, setAimHover] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const names = { A: nameA, B: nameB };

  function playEmote(id: string) {
    setMyEmote({ id, ts: Date.now() });
    sfx("click");
    if (!isPvp && Math.random() < 0.3) {
      window.setTimeout(() => setBotEmote({ id: randomEmote().id, ts: Date.now() }), 1100);
    }
  }

  // NOTE: this reads `state` from the surrounding closure rather than a
  // setState(prev => ...) updater - see the long comment kept below.
  function applyShot(attacker: Side, target: Side, r: number, c: number) {
    const targetBoard = target === "A" ? state.boardA : state.boardB;
    const key = `${r},${c}`;

    // --- mine: a bot shot landing on one of A's mines is neutralised ---
    if (attacker === "B" && target === "A" && state.mines.includes(key)) {
      const deflected: BoardState = { ...state.boardA, shots: { ...state.boardA.shots, [key]: "miss" } };
      sfx("miss");
      setState((prev) => ({
        ...prev,
        boardA: deflected,
        turn: "A",
        phase: "playing",
        energy: clampEnergy(prev.energy + energyPerTurn + 2),
        powerCooldowns: tickCooldowns(prev.powerCooldowns),
        mines: prev.mines.filter((m) => m !== key),
        lastShot: { side: "A", key },
        log: [
          `Mine ! Le tir de ${names.B} en ${key} est devie. Contrecoup : +2 energie.`,
          ...prev.log,
        ].slice(0, 40),
      }));
      return;
    }

    const outcome = fireAt(targetBoard, r, c);
    if (outcome.result === "already") return;

    const nextBoards =
      target === "A" ? { boardA: outcome.board, boardB: state.boardB } : { boardA: state.boardA, boardB: outcome.board };

    let line = "";
    if (outcome.result === "miss") {
      line = `${names[attacker]} tire en ${key} : dans l'eau.`;
      sfx("miss");
    } else if (outcome.result === "hit") {
      line = `${names[attacker]} touche un navire de ${names[target]} !`;
      sfx("hit");
    } else if (outcome.result === "sunk" && outcome.sunkShip) {
      line = `${names[attacker]} coule le ${outcome.sunkShip.name} de ${names[target]} !`;
      sfx("sunk");
    }

    if (mode !== "pvp" && attacker === "A") {
      recordShot(outcome.result !== "miss");
    }
    if (mode !== "pvp" && attacker === "B") {
      registerShotResult(aiState, key, outcome.result as "hit" | "miss" | "sunk");
    }

    const wasHit = outcome.result === "hit" || outcome.result === "sunk";
    const keepTurn = wasHit && fireAgain && !outcome.victory;

    if (outcome.victory) {
      sfx(attacker === "A" ? "victory" : "defeat");
      setState((prev) => ({
        ...prev,
        ...nextBoards,
        phase: "over",
        winner: attacker,
        lastShot: { side: target, key },
        log: [line, `${names[attacker]} remporte la bataille !`, ...prev.log].slice(0, 40),
      }));
      return;
    }

    const nextTurn: Side = keepTurn ? attacker : opponentOf(attacker);
    const needsHandoff = isPvp && nextTurn !== attacker;
    const backToPlayer = nextTurn === "A" && attacker === "B";
    const energyGain = backToPlayer ? energyPerTurn : 0;

    setState((prev) => ({
      ...prev,
      ...nextBoards,
      turn: nextTurn,
      phase: needsHandoff ? "handoff" : "playing",
      energy: clampEnergy(prev.energy + energyGain),
      powerCooldowns: backToPlayer ? tickCooldowns(prev.powerCooldowns) : prev.powerCooldowns,
      lastShot: { side: target, key },
      log: [line, ...prev.log].slice(0, 40),
    }));
  }

  useEffect(() => {
    if (state.phase === "over" && state.winner) {
      onGameEnd(state.winner);
    }
  }, [state.phase, state.winner]);

  // Tense-moment music: last ships standing, or a shot away from a sinking.
  useEffect(() => {
    const alive = (b: BoardState) => b.ships.filter((s) => !s.sunk).length;
    const almost = (b: BoardState) =>
      b.ships.some((s) => !s.sunk && s.size > 1 && s.hitCells.length === s.size - 1);
    const tense =
      state.phase === "playing" &&
      (alive(state.boardA) <= 1 || alive(state.boardB) <= 1 || almost(state.boardA) || almost(state.boardB));
    setTension(tense);
  }, [state]);

  useEffect(() => () => setTension(false), []);

  // Resolve one bot shot, tolerating any desync between the AI's memory and
  // the real board (which would otherwise freeze the turn on "Bot reflechit").
  function botFire() {
    const blockedSet = new Set(state.boardA.blocked ?? []);
    for (let attempt = 0; attempt < 6; attempt++) {
      const key = chooseShot(aiState, remainingSizes(state.boardA));
      const [r, c] = parseKey(key);
      if (state.boardA.shots[key] || blockedSet.has(key)) {
        registerShotResult(aiState, key, "miss"); // teach the AI, then retry
        continue;
      }
      applyShot("B", "A", r, c);
      return;
    }
    // last resort: first genuinely free cell
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        const k = `${r},${c}`;
        if (!state.boardA.shots[k] && !blockedSet.has(k)) {
          applyShot("B", "A", r, c);
          return;
        }
      }
    }
  }

  // Bot automatically fires on its turn. Reaction time scales with difficulty,
  // and it fires faster when locked onto a wounded ship. A watchdog forces a
  // move if the turn ever hangs (fire-again, tab throttling, desync...).
  useEffect(() => {
    if (mode === "pvp") return;
    if (state.phase !== "playing") return;
    if (state.turn !== "B") return;

    const base = { facile: 900, moyen: 620, difficile: 470, expert: 340 }[difficulty ?? "moyen"];
    const hunting = aiState.queue.length > 0 || aiState.activeHits.length > 0;
    const delay = Math.round((hunting ? base * 0.55 : base) + Math.random() * 120);

    const shot = window.setTimeout(botFire, delay);
    const watchdog = window.setTimeout(botFire, delay + 5000);

    return () => {
      clearTimeout(shot);
      clearTimeout(watchdog);
    };
  }, [state.turn, state.phase, state.lastShot, mode]);

  // Clear a selected power whenever it stops being your turn.
  useEffect(() => {
    if (state.turn !== "A" || state.phase !== "playing") {
      setSelectedPower(null);
      setAimHover(null);
    }
  }, [state.turn, state.phase]);

  function handleFire(r: number, c: number) {
    if (state.phase !== "playing") return;
    if (mode !== "pvp" && state.turn !== "A") return;
    sfx("fire");
    applyShot(state.turn, opponentOf(state.turn), r, c);
  }

  function confirmHandoff() {
    sfx("click");
    setState((s) => ({ ...s, phase: "playing" }));
  }

  const viewerSide: Side = isPvp ? state.turn : "A";
  const opponentSide = opponentOf(viewerSide);
  const viewerBoard = viewerSide === "A" ? state.boardA : state.boardB;
  const opponentBoard = opponentSide === "A" ? state.boardA : state.boardB;
  const canFireNow = state.phase === "playing" && viewerSide === state.turn;
  const canUsePowers = powersEnabled && canFireNow && viewerSide === "A";

  // ---- powers -----------------------------------------------------------
  function endPlayerTurn(patch: Partial<LocalState>, logLines: string[]) {
    setSelectedPower(null);
    setAimHover(null);
    setState((prev) => ({
      ...prev,
      ...patch,
      turn: "B",
      phase: "playing",
      log: [...logLines, ...prev.log].slice(0, 40),
    }));
  }

  function runPower(pid: PowerId, r: number, c: number) {
    const cost = powerCost(pid);
    if (!canUsePowers || state.energy < cost) return;
    if ((state.powerCooldowns[pid] ?? 0) > 0) return;
    const spend = {
      energy: clampEnergy(state.energy - cost),
      powerCooldowns: { ...state.powerCooldowns, [pid]: powerById(pid).cooldown },
    };
    const key = `${r},${c}`;

    if (pid === "drone") {
      const zone = zone3x3(r, c, boardSize);
      const revealed = { ...state.revealed };
      for (const k of zone) revealed[k] = shipAtCell(state.boardB, k) ? "ship" : "water";
      const found = zone.filter((k) => revealed[k] === "ship").length;
      sfx("click");
      endPlayerTurn(
        { ...spend, revealed, lastShot: { side: "B", key } },
        [`Drone sur ${key} : ${found} case(s) de navire reperee(s) dans la zone 3x3.`]
      );
      return;
    }

    if (pid === "sonar") {
      const zone = zone3x3(r, c, boardSize);
      const count = zone.filter((k) => shipAtCell(state.boardB, k)).length;
      sfx("click");
      endPlayerTurn(
        { ...spend, sonarMarks: { ...state.sonarMarks, [key]: count }, lastShot: { side: "B", key } },
        [`Sonar sur ${key} : ${count} case(s) occupee(s) dans la zone (positions inconnues).`]
      );
      return;
    }

    if (pid === "mine") {
      if (
        state.boardA.shots[key] ||
        state.mines.includes(key) ||
        state.mines.length >= mineLimit ||
        (state.boardA.blocked ?? []).includes(key)
      )
        return;
      sfx("place");
      endPlayerTurn({ ...spend, mines: [...state.mines, key] }, [`Mine posee en ${key} sur votre flotte.`]);
      return;
    }

    // --- attacking powers: resolve a list of cells against board B ---
    const blockedB = new Set(state.boardB.blocked ?? []);
    let cells: string[];
    if (pid === "barrage") {
      cells = CROSS.map(([dr, dc]) => [r + dr, c + dc] as [number, number])
        .filter(([nr, nc]) => nr >= 0 && nc >= 0 && nr < boardSize && nc < boardSize)
        .map(([nr, nc]) => `${nr},${nc}`)
        .filter((k) => !blockedB.has(k));
    } else {
      // torpille: run along the row / column until the first ship is struck
      cells = [];
      for (let i = 0; i < boardSize; i++) {
        const k = torpilleAxis === "row" ? `${r},${i}` : `${i},${c}`;
        if (state.boardB.shots[k] || blockedB.has(k)) continue;
        cells.push(k);
        if (shipAtCell(state.boardB, k)) break;
      }
    }

    let board = state.boardB;
    const lines: string[] = [];
    let victory = false;
    let anyHit = false;
    for (const k of cells) {
      if (board.shots[k]) continue;
      const [rr, cc] = parseKey(k);
      const out = fireAt(board, rr, cc);
      board = out.board;
      if (out.result === "miss") {
        lines.push(`${pid === "barrage" ? "Barrage" : "Torpille"} en ${k} : dans l'eau.`);
      } else if (out.result === "hit") {
        anyHit = true;
        lines.push(`Touche en ${k} !`);
      } else if (out.result === "sunk" && out.sunkShip) {
        anyHit = true;
        lines.push(`${out.sunkShip.name} coule !`);
      }
      recordShot(out.result === "hit" || out.result === "sunk");
      if (out.victory) victory = true;
    }
    sfx(anyHit ? "hit" : "fire");
    if (victory) sfx("victory");

    const lastKey = cells[cells.length - 1] ?? key;
    setSelectedPower(null);
    setAimHover(null);
    if (victory) {
      setState((prev) => ({
        ...prev,
        boardB: board,
        ...spend,
        phase: "over",
        winner: "A",
        lastShot: { side: "B", key: lastKey },
        log: [...lines, `${names.A} remporte la bataille !`, ...prev.log].slice(0, 40),
      }));
      return;
    }
    setState((prev) => ({
      ...prev,
      boardB: board,
      ...spend,
      turn: "B",
      phase: "playing",
      lastShot: { side: "B", key: lastKey },
      log: [
        `${pid === "barrage" ? "Tir de barrage" : "Torpille chercheuse"} lance !`,
        ...lines,
        ...prev.log,
      ].slice(0, 40),
    }));
  }

  function handleEnemyCell(r: number, c: number) {
    if (selectedPower === "mine") return; // mine targets your own grid
    if (selectedPower) {
      runPower(selectedPower, r, c);
      return;
    }
    if (canFireNow) handleFire(r, c);
  }

  function handleOwnCell(r: number, c: number) {
    if (selectedPower === "mine") runPower("mine", r, c);
  }

  // Chantier naval: patch one hit on a damaged ship (free, doesn't end the turn).
  function doRepair() {
    if (state.repairLeft <= 0 || !canUsePowers) return;
    const target = state.boardA.ships.find((s) => !s.sunk && s.hitCells.length > 0);
    if (!target) return;
    const cell = target.hitCells[target.hitCells.length - 1];
    const ships = state.boardA.ships.map((s) =>
      s === target ? { ...s, hitCells: s.hitCells.slice(0, -1), sunk: false } : s
    );
    const shots = { ...state.boardA.shots };
    delete shots[cell];
    sfx("place");
    setState((prev) => ({
      ...prev,
      boardA: { ...prev.boardA, ships, shots },
      repairLeft: prev.repairLeft - 1,
      log: [`Chantier naval : coque reparee en ${cell}.`, ...prev.log].slice(0, 40),
    }));
  }

  // ---- aim preview ----------------------------------------------------
  const aimCells = useMemo(() => {
    if (!aimHover || !selectedPower) return new Set<string>();
    const [r, c] = parseKey(aimHover);
    if (selectedPower === "drone" || selectedPower === "sonar") return new Set(zone3x3(r, c, boardSize));
    if (selectedPower === "barrage") {
      return new Set(
        CROSS.map(([dr, dc]) => [r + dr, c + dc] as [number, number])
          .filter(([nr, nc]) => nr >= 0 && nc >= 0 && nr < boardSize && nc < boardSize)
          .map(([nr, nc]) => `${nr},${nc}`)
      );
    }
    if (selectedPower === "torpille") {
      const s = new Set<string>();
      for (let i = 0; i < boardSize; i++) s.add(torpilleAxis === "row" ? `${r},${i}` : `${i},${c}`);
      return s;
    }
    if (selectedPower === "mine") return new Set([aimHover]);
    return new Set<string>();
  }, [aimHover, selectedPower, torpilleAxis, boardSize]);

  const trackingAnimateKey =
    settings.animationsOn && state.lastShot && state.lastShot.side === opponentSide ? state.lastShot.key : undefined;
  const ownAnimateKey =
    settings.animationsOn && state.lastShot && state.lastShot.side === viewerSide ? state.lastShot.key : undefined;

  const fogCells = useMemo(() => {
    if (!fogOn || viewerSide !== "A") return undefined;
    const shotKeys = Object.keys(opponentBoard.shots);
    const revealedKeys = Object.keys(state.revealed);
    const clear = new Set<string>([...shotKeys, ...revealedKeys]);
    for (const k of [...shotKeys, ...revealedKeys]) {
      const [r, c] = parseKey(k);
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) clear.add(`${r + dr},${c + dc}`);
    }
    const fog = new Set<string>();
    for (let r = 0; r < boardSize; r++)
      for (let c = 0; c < boardSize; c++) {
        const k = `${r},${c}`;
        if (!clear.has(k)) fog.add(k);
      }
    return fog;
  }, [fogOn, viewerSide, opponentBoard.shots, state.revealed, boardSize]);

  const trackingData = useMemo(
    () =>
      buildTrackingGrid(opponentBoard, boardSize, canFireNow || (canUsePowers && !!selectedPower && selectedPower !== "mine"), {
        animateKey: trackingAnimateKey,
        revealed: viewerSide === "A" ? state.revealed : {},
        sonarMarks: viewerSide === "A" ? state.sonarMarks : {},
        aim: selectedPower && selectedPower !== "mine" ? aimCells : undefined,
        blocked: opponentBoard.blocked ?? [],
        fog: fogCells,
      }),
    [opponentBoard, boardSize, canFireNow, canUsePowers, selectedPower, trackingAnimateKey, state.revealed, state.sonarMarks, aimCells, viewerSide, fogCells]
  );

  const ownData = useMemo(
    () =>
      buildOwnGrid(viewerBoard, boardSize, {
        animateKey: ownAnimateKey,
        mines: viewerSide === "A" ? state.mines : [],
        aim: selectedPower === "mine" ? aimCells : undefined,
        mineMode: canUsePowers && selectedPower === "mine",
        blocked: viewerBoard.blocked ?? [],
      }),
    [viewerBoard, boardSize, ownAnimateKey, state.mines, selectedPower, aimCells, viewerSide, canUsePowers]
  );

  const trackingShips: ShipOverlay[] = useMemo(
    () =>
      opponentBoard.ships
        .filter((s) => s.sunk)
        .map((s) => ({ id: `${opponentSide}-${s.defId}`, defId: s.defId, cells: s.cells, sunk: true })),
    [opponentBoard, opponentSide]
  );

  const ownShips: ShipOverlay[] = useMemo(
    () => viewerBoard.ships.map((s) => ({ id: `${viewerSide}-${s.defId}`, defId: s.defId, cells: s.cells, sunk: s.sunk })),
    [viewerBoard, viewerSide]
  );

  if (state.phase === "handoff") {
    return (
      <div className="panel stack center">
        <h2>Changement de joueur</h2>
        <p className="subtitle">
          Passez l'appareil a <strong>{names[state.turn]}</strong> puis confirmez pour reveler son champ de bataille.
        </p>
        <button className="btn btn-primary btn-block" onClick={confirmHandoff}>
          {names[state.turn]} est pret
        </button>
        <button className="btn btn-ghost" onClick={onQuit}>
          Abandonner la partie
        </button>
      </div>
    );
  }

  return (
    <div className="panel stack">
      <div className={`turn-indicator ${state.turn === "A" ? "you" : "enemy"}`}>
        {mode === "pvp"
          ? `Tour de ${names[state.turn]}`
          : state.turn === "A"
          ? "A vous de tirer"
          : `${nameB} reflechit...`}
      </div>

      {powersEnabled && (
        <PowerBar
          energy={state.energy}
          selected={selectedPower}
          disabled={!canUsePowers}
          costOf={powerCost}
          cooldowns={state.powerCooldowns}
          torpilleAxis={torpilleAxis}
          repairLeft={state.repairLeft}
          onRepair={doRepair}
          onToggleAxis={() => setTorpilleAxis((a) => (a === "row" ? "col" : "row"))}
          onSelect={(pid) => {
            if ((state.powerCooldowns[pid] ?? 0) > 0) return;
            sfx("click");
            setSelectedPower((cur) => (cur === pid ? null : pid));
            setAimHover(null);
          }}
        />
      )}

      {hullPerk && (
        <div className="hull-trait-chip" title="Actif contre un bot et en arene">
          <span className="hull-trait-icon">⚔</span>
          <strong>{hullPerk.traitName}</strong>
          <span>· {hullPerk.traitDesc}</span>
        </div>
      )}

      {!isPvp && (
        <div className="emote-row">
          <EmoteBar onEmote={playEmote} />
        </div>
      )}

      <div className="boards-area" style={loadoutVars}>
        <div className="board-block board-frame enemy">
          {botEmote && (
            <FloatingEmote key={botEmote.ts} id={botEmote.id} from={nameB} />
          )}
          <BoardHeader
            variant="enemy"
            title="Flotte adverse"
            subtitle={names[opponentSide]}
            shotsInfo={`${Object.keys(opponentBoard.shots).length} tirs`}
          />
          <div className="grid-wrap">
            <Grid
              size={boardSize}
              data={trackingData}
              ships={trackingShips}
              variant="enemy"
              onCellClick={
                canFireNow || (canUsePowers && selectedPower && selectedPower !== "mine") ? handleEnemyCell : undefined
              }
              onCellEnter={(r, c) => {
                setHoverKey(`${r},${c}`);
                if (selectedPower && selectedPower !== "mine") setAimHover(`${r},${c}`);
              }}
              onCellLeave={() => {
                setHoverKey(null);
                if (selectedPower) setAimHover(null);
              }}
            />
            <div className={`coord-readout${hoverKey ? " show" : ""}`}>
              {hoverKey ? `CIBLE ${coordLabel(hoverKey)}` : ""}
            </div>
          </div>
          <FleetStatus ships={opponentBoard.ships} reveal="hidden" />
        </div>
        {arenaTag && (
          <div className="arena-badge" aria-label={`${arenaTag.name}, difficulte ${arenaTag.stars} sur 5`}>
            <span className="arena-badge-name">{arenaTag.name}</span>
            <span className="arena-badge-stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={`arena-star${i < arenaTag.stars ? " on" : ""}`}>
                  ☠
                </span>
              ))}
            </span>
          </div>
        )}
        <div className="board-block board-frame own" style={ownGridVars}>
          {myEmote && <FloatingEmote key={myEmote.ts} id={myEmote.id} />}
          <BoardHeader
            variant="own"
            title="Votre flotte"
            subtitle={names[viewerSide]}
            emblem={ownEmblem}
            portrait={!isPvp ? <FlagshipPortrait loadout={loadout} size={30} /> : undefined}
            emblemImage={!isPvp ? <EmblemImage loadout={loadout} size={26} /> : undefined}
          />
          <div className="grid-wrap">
            <Grid
              size={boardSize}
              data={ownData}
              ships={ownShips}
              variant="own"
              livery={ownLivery}
              flag={ownFlag}
              aura={ownAura?.fx}
              auraColor={ownAura?.color}
              onCellClick={canUsePowers && selectedPower === "mine" ? handleOwnCell : undefined}
              onCellEnter={selectedPower === "mine" ? (r, c) => setAimHover(`${r},${c}`) : undefined}
              onCellLeave={selectedPower === "mine" ? () => setAimHover(null) : undefined}
            />
          </div>
          <FleetStatus ships={viewerBoard.ships} reveal="full" />
        </div>
      </div>

      <div className="legend legend-bar">
        <span>
          <span className="legend-swatch swatch-hit" />
          Touche
        </span>
        <span>
          <span className="legend-swatch swatch-sunk" />
          Coule
        </span>
        <span>
          <span className="legend-swatch swatch-miss" />
          Rate
        </span>
        <span>
          <span className="legend-swatch swatch-ship" />
          Navire
        </span>
        <span>
          <span className="legend-swatch swatch-water" />
          Eau
        </span>
      </div>

      <div className="message-log">
        {state.log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      <button className="btn btn-ghost" onClick={onQuit}>
        Abandonner la partie
      </button>
    </div>
  );
}

function BoardHeader({
  variant,
  title,
  subtitle,
  shotsInfo,
  emblem,
  emblemImage,
  portrait,
}: {
  variant: "enemy" | "own";
  title: string;
  subtitle: string;
  shotsInfo?: string;
  emblem?: { shape: EmblemShape; color: string };
  emblemImage?: React.ReactNode;
  portrait?: React.ReactNode;
}) {
  return (
    <div className={`board-hud ${variant}`}>
      <span className="board-hud-emblem" aria-hidden="true">
        {variant === "enemy" ? (
          <span className="board-hud-radar">
            <span className="board-hud-radar-sweep" />
          </span>
        ) : emblemImage ? (
          emblemImage
        ) : emblem && emblem.shape !== "none" ? (
          <EmblemGlyph shape={emblem.shape} color={emblem.color} size={26} />
        ) : (
          <AnchorIcon size={26} />
        )}
      </span>
      <div className="board-hud-plate">
        <span className="board-hud-title">{title}</span>
        <span className={`board-hud-sub ${variant}`}>{subtitle}</span>
      </div>
      {shotsInfo && <span className="board-hud-count">{shotsInfo}</span>}
      <span className="board-hud-ship" aria-hidden="true">
        {portrait ?? <ShipSilhouette />}
      </span>
    </div>
  );
}

function PowerBar({
  energy,
  selected,
  disabled,
  costOf,
  cooldowns,
  torpilleAxis,
  repairLeft,
  onRepair,
  onToggleAxis,
  onSelect,
}: {
  energy: number;
  selected: PowerId | null;
  disabled: boolean;
  costOf: (p: PowerId) => number;
  cooldowns: Partial<Record<PowerId, number>>;
  torpilleAxis: "row" | "col";
  repairLeft: number;
  onRepair: () => void;
  onToggleAxis: () => void;
  onSelect: (pid: PowerId) => void;
}) {
  return (
    <div className="power-bar">
      <div className="energy-gauge" title={`${energy} / ${ENERGY_MAX} energie`}>
        <span className="energy-label">Energie</span>
        <span className="energy-pips">
          {Array.from({ length: ENERGY_MAX }).map((_, i) => (
            <span key={i} className={`energy-pip${i < energy ? " on" : ""}`} />
          ))}
        </span>
        <span className="energy-num">{energy}</span>
      </div>
      <div className="power-buttons">
        {POWERS.map((p) => {
          const cost = costOf(p.id);
          const cd = cooldowns[p.id] ?? 0;
          const affordable = energy >= cost;
          const active = selected === p.id;
          const locked = cd > 0;
          const title = locked
            ? `${p.name} - en rechargement (${cd} tour${cd > 1 ? "s" : ""})\n${p.short}`
            : `${p.name} - ${cost} energie, recharge ${p.cooldown} tour${p.cooldown > 1 ? "s" : ""}${
                affordable ? "" : "\nPas assez d'energie"
              }\n${p.short}`;
          return (
            <button
              key={p.id}
              className={`power-btn${active ? " active" : ""}${locked ? " cooling" : ""}`}
              disabled={disabled || !affordable || locked}
              title={title}
              onClick={() => onSelect(p.id)}
            >
              <span className="power-icon">{p.icon}</span>
              <span className="power-cost">{locked ? `⏳${cd}` : cost}</span>
            </button>
          );
        })}
        {repairLeft > 0 && (
          <button
            className="power-btn repair"
            disabled={disabled}
            title={`Chantier naval - repare une case touchee (${repairLeft} restante(s))`}
            onClick={onRepair}
          >
            <span className="power-icon">🔧</span>
            <span className="power-cost">{repairLeft}</span>
          </button>
        )}
        {selected === "torpille" && (
          <button className="power-axis" onClick={onToggleAxis} title="Sens de la torpille">
            {torpilleAxis === "row" ? "Ligne ⇄" : "Colonne ⇅"}
          </button>
        )}
      </div>
      {selected && <div className="power-hint">{powerById(selected).short}</div>}
    </div>
  );
}

function FleetStatus({ ships, reveal }: { ships: PlacedShip[]; reveal: "full" | "hidden" }) {
  const totalCells = ships.reduce((n, s) => n + s.size, 0);
  const hitCells = ships.reduce((n, s) => n + s.hitCells.length, 0);
  const sunkCount = ships.filter((s) => s.sunk).length;

  return (
    <div className="fleet-status">
      <div className="fleet-status-head">
        <span>
          {ships.length - sunkCount}/{ships.length} navires
        </span>
        {reveal === "full" && (
          <span>
            {totalCells - hitCells}/{totalCells} PV
          </span>
        )}
      </div>
      <div className="fleet-status-list">
        {ships.map((s) => {
          const shown = reveal === "full" || s.sunk;
          const hits = reveal === "full" ? s.hitCells.length : s.sunk ? s.size : 0;
          return (
            <div key={s.defId} className={`fleet-ship${s.sunk ? " is-sunk" : ""}`}>
              <span className="fleet-ship-name">{shown ? s.name : "? ? ?"}</span>
              <span className="fleet-ship-pips">
                {Array.from({ length: s.size }).map((_, i) => (
                  <span key={i} className={`pip${i < hits ? (s.sunk ? " dead" : " hit") : ""}`} />
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TrackOpts {
  animateKey?: string;
  revealed: Record<string, "ship" | "water">;
  sonarMarks: Record<string, number>;
  aim?: Set<string>;
  blocked: string[];
  fog?: Set<string>;
}

function buildTrackingGrid(board: BoardState, size: number, clickable: boolean, opts: TrackOpts): CellData[][] {
  const blockedSet = new Set(opts.blocked);
  const grid: CellData[][] = [];
  for (let r = 0; r < size; r++) {
    const row: CellData[] = [];
    for (let c = 0; c < size; c++) {
      const key = `${r},${c}`;
      const isBlocked = blockedSet.has(key);
      const shot = board.shots[key];
      let visual: CellData["visual"] = "water";
      if (shot === "hit") {
        const ship = shipAtCell(board, key);
        visual = ship?.sunk ? "sunk" : "hit";
      } else if (shot === "miss") {
        visual = "miss";
      }
      row.push({
        visual,
        clickable: clickable && !shot && !isBlocked,
        animate: key === opts.animateKey,
        reveal: !shot ? opts.revealed[key] : undefined,
        sonar: opts.sonarMarks[key],
        aim: opts.aim?.has(key),
        blocked: isBlocked,
        fog: !isBlocked && !shot ? opts.fog?.has(key) : undefined,
      });
    }
    grid.push(row);
  }
  return grid;
}

interface OwnOpts {
  animateKey?: string;
  mines: string[];
  aim?: Set<string>;
  mineMode?: boolean;
  blocked: string[];
}

function buildOwnGrid(board: BoardState, size: number, opts: OwnOpts): CellData[][] {
  const shipCells = new Set(board.ships.flatMap((s: PlacedShip) => s.cells));
  const mineSet = new Set(opts.mines);
  const blockedSet = new Set(opts.blocked);
  const grid: CellData[][] = [];
  for (let r = 0; r < size; r++) {
    const row: CellData[] = [];
    for (let c = 0; c < size; c++) {
      const key = `${r},${c}`;
      const isBlocked = blockedSet.has(key);
      const shot = board.shots[key];
      let visual: CellData["visual"] = shipCells.has(key) ? "ship" : "water";
      if (shot === "hit") {
        const ship = shipAtCell(board, key);
        visual = ship?.sunk ? "sunk" : "hit";
      } else if (shot === "miss") {
        visual = "miss";
      }
      row.push({
        visual,
        clickable: Boolean(opts.mineMode) && !shot && !mineSet.has(key) && !isBlocked,
        animate: key === opts.animateKey,
        mine: mineSet.has(key),
        aim: opts.aim?.has(key),
        blocked: isBlocked,
      });
    }
    grid.push(row);
  }
  return grid;
}
