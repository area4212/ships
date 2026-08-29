// Special powers ("Le Truc en Plus"). Only the human player uses them, and
// only against a bot / in the arena. Each costs energy; the player earns 1
// energy at the start of every turn (capped).

export type PowerId = "drone" | "sonar" | "barrage" | "torpille" | "mine";

export interface PowerDef {
  id: PowerId;
  name: string;
  icon: string;
  cost: number;
  /** turns the power is locked after use (0 = usable every turn) */
  cooldown: number;
  short: string;
  target: "enemy" | "self";
  needsAxis?: boolean; // torpille: pick row vs column
}

// Powers are meant to be a rare, earned move — not something you spam. Energy
// starts low, trickles in one per turn, and every power has a cooldown on top.
export const ENERGY_START = 2;
export const ENERGY_MAX = 12;
export const ENERGY_PER_TURN = 1;

export const POWERS: PowerDef[] = [
  {
    id: "drone",
    name: "Drone de reco",
    icon: "🛰️",
    cost: 4,
    cooldown: 2,
    short: "Devoile une zone 3x3 adverse, sans degats.",
    target: "enemy",
  },
  {
    id: "sonar",
    name: "Coup de sonar",
    icon: "📡",
    cost: 3,
    cooldown: 2,
    short: "Compte les cases occupees dans une zone 3x3 (sans les positions).",
    target: "enemy",
  },
  {
    id: "barrage",
    name: "Tir de barrage",
    icon: "💥",
    cost: 6,
    cooldown: 4,
    short: "Frappe 5 cases en croix (+) d'un seul coup.",
    target: "enemy",
  },
  {
    id: "torpille",
    name: "Torpille chercheuse",
    icon: "🚀",
    cost: 5,
    cooldown: 3,
    short: "File le long d'une ligne jusqu'a percuter le premier navire.",
    target: "enemy",
    needsAxis: true,
  },
  {
    id: "mine",
    name: "Mine marine",
    icon: "⚓",
    cost: 3,
    cooldown: 2,
    short: "Piege une case de votre flotte : le tir adverse dessus est neutralise.",
    target: "self",
  },
];

export function powerById(id: PowerId): PowerDef {
  return POWERS.find((p) => p.id === id)!;
}

// cross (+) offsets for the barrage
export const CROSS: [number, number][] = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export function zone3x3(r: number, c: number, size: number): string[] {
  const out: string[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nc >= 0 && nr < size && nc < size) out.push(`${nr},${nc}`);
    }
  }
  return out;
}
