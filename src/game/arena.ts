import { Difficulty, RANKS } from "../types/game";

export interface ArenaDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  stars: number; // 1..5, shown as skulls
  /** accent colour for the arena card (border / glow / emblem) */
  accent: string;
  boardSize: number;
  obstacles: "aucun" | "peu" | "beaucoup";
  fog: boolean;
  /** difficulty-curve offset: higher = starts against tougher bots */
  startRound: number;
  /** rounds advanced per real round: 1 = normal, 2 = escalates twice as fast */
  rampSpeed: number;
  /** harder arenas take away your bonus shot on a hit */
  noFireAgain: boolean;
  /** extra energy every special power costs in this arena (0 = normal) */
  powerCostMod: number;
}

export const ARENAS: ArenaDef[] = [
  {
    id: "classique",
    name: "Arene Classique",
    icon: "⚓",
    desc: "Grille 10x10, mer degagee. La reference pour grimper les rangs.",
    stars: 1,
    accent: "#4ceaff",
    boardSize: 10,
    obstacles: "aucun",
    fog: false,
    startRound: 1,
    rampSpeed: 1,
    noFireAgain: false,
    powerCostMod: 0,
  },
  {
    id: "archipel",
    name: "Archipel",
    icon: "🏝️",
    desc: "Rochers et iles a foison, et des bots qui ne partent pas de zero.",
    stars: 2,
    accent: "#46d17a",
    boardSize: 10,
    obstacles: "beaucoup",
    fog: false,
    startRound: 2,
    rampSpeed: 1,
    noFireAgain: false,
    powerCostMod: 1,
  },
  {
    id: "blitz",
    name: "Blitz",
    icon: "⚡",
    desc: "Petite grille 8x8, escalade deux fois plus rapide. Ca va vite.",
    stars: 2,
    accent: "#ff9d2e",
    boardSize: 8,
    obstacles: "aucun",
    fog: false,
    startRound: 1,
    rampSpeed: 2,
    noFireAgain: false,
    powerCostMod: 1,
  },
  {
    id: "brume",
    name: "Brume de Guerre",
    icon: "🌫️",
    desc: "Brouillard permanent, bots deja aguerris. Tu avances a l'aveugle.",
    stars: 3,
    accent: "#9fb4c6",
    boardSize: 10,
    obstacles: "peu",
    fog: true,
    startRound: 3,
    rampSpeed: 1,
    noFireAgain: false,
    powerCostMod: 2,
  },
  {
    id: "tempete",
    name: "Tempete",
    icon: "🌊",
    desc: "Grande grille 12x12, brume, obstacles, escalade rapide et aucun tir bonus.",
    stars: 4,
    accent: "#4c8fff",
    boardSize: 12,
    obstacles: "peu",
    fog: true,
    startRound: 4,
    rampSpeed: 2,
    noFireAgain: true,
    powerCostMod: 2,
  },
  {
    id: "extreme",
    name: "Arene Extreme",
    icon: "☠️",
    desc: "Que des Amiraux des le premier round. Brume, iles denses, zero tir bonus. Combien de rounds tiendras-tu ?",
    stars: 5,
    accent: "#b06bff",
    boardSize: 12,
    obstacles: "beaucoup",
    fog: true,
    startRound: 6,
    rampSpeed: 2,
    noFireAgain: true,
    powerCostMod: 3,
  },
];

export function arenaById(id: string): ArenaDef {
  return ARENAS.find((a) => a.id === id) ?? ARENAS[0];
}

export function arenaDifficultyForRound(round: number, def?: ArenaDef): Difficulty {
  const startRound = def?.startRound ?? 1;
  const rampSpeed = def?.rampSpeed ?? 1;
  const r = startRound + (round - 1) * rampSpeed;
  if (r <= 2) return "facile";
  if (r <= 4) return "moyen";
  if (r <= 6) return "difficile";
  return "expert";
}

export function arenaRankForRound(round: number): string {
  const idx = Math.min(RANKS.length - 1, round - 1);
  return RANKS[idx];
}

export function arenaBotName(round: number): string {
  return `Bot - ${arenaRankForRound(round)}`;
}
