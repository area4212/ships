// Player progression: XP -> commander level -> command points spent on
// upgrades that buff the human's powers and fleet (bot / arena only).

export type UpgradeId =
  | "reacteur"
  | "generateur"
  | "optimisation"
  | "champMines"
  | "eclaireur"
  | "chantier";

export type UpgradeCategory = "energie" | "offensive" | "defense" | "reconnaissance";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  icon: string;
  category: UpgradeCategory;
  /** One short line: what this upgrade is for. */
  tagline: string;
  maxLevel: number;
  /** Effect obtained at the given level (lvl 0 = not owned yet). */
  describe: (lvl: number) => string;
}

export const CATEGORY_LABELS: Record<UpgradeCategory, string> = {
  energie: "Energie",
  offensive: "Offensive",
  defense: "Defense",
  reconnaissance: "Reconnaissance",
};

export const UPGRADES: UpgradeDef[] = [
  {
    id: "reacteur",
    name: "Reacteur ameliore",
    icon: "⚡",
    category: "energie",
    tagline: "Commencez la bataille avec plus d'energie pour vos pouvoirs.",
    maxLevel: 2,
    describe: (l) => (l <= 0 ? "Aucun bonus d'energie de depart." : `Energie de depart +${l * 2}.`),
  },
  {
    id: "generateur",
    name: "Generateur auxiliaire",
    icon: "🔋",
    category: "energie",
    tagline: "Rechargez votre energie plus vite a chaque tour.",
    maxLevel: 2,
    describe: (l) => (l <= 0 ? "+1 energie par tour (de base)." : `+${1 + l} energie par tour au lieu de +1.`),
  },
  {
    id: "optimisation",
    name: "Optimisation d'armement",
    icon: "🎯",
    category: "offensive",
    tagline: "Vos pouvoirs coutent moins cher, donc vous en lancez plus souvent.",
    maxLevel: 2,
    describe: (l) =>
      l <= 0 ? "Cout des pouvoirs normal." : `Cout de tous les pouvoirs -${l} (minimum 1).`,
  },
  {
    id: "champMines",
    name: "Champ de mines",
    icon: "⚓",
    category: "defense",
    tagline: "Posez plusieurs mines defensives sur votre grille en meme temps.",
    maxLevel: 2,
    describe: (l) => `${1 + l} mine${1 + l > 1 ? "s" : ""} posee${1 + l > 1 ? "s" : ""} en meme temps.`,
  },
  {
    id: "eclaireur",
    name: "Escadrille d'eclaireurs",
    icon: "🛰️",
    category: "reconnaissance",
    tagline: "Reperez des cases ennemies gratuitement des le debut de la bataille.",
    maxLevel: 2,
    describe: (l) =>
      l <= 0
        ? "Aucune case revelee au depart."
        : `Revele ${l * 2} case${l * 2 > 1 ? "s" : ""} de navire ennemi au debut de la bataille.`,
  },
  {
    id: "chantier",
    name: "Chantier naval",
    icon: "🔧",
    category: "defense",
    tagline: "Reparez une case touchee de votre flotte pendant la bataille.",
    maxLevel: 2,
    describe: (l) =>
      l <= 0
        ? "Aucune reparation disponible."
        : `Reparation possible ${l} fois par bataille.`,
  },
];

export type UpgradeMap = Partial<Record<UpgradeId, number>>;

export function upgradeLevel(map: UpgradeMap | undefined, id: UpgradeId): number {
  return map?.[id] ?? 0;
}

// XP curve: level n reached at 100 * n^2 total XP.
export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);
}

export function xpForLevel(level: number): number {
  return 100 * (level - 1) * (level - 1);
}

export function xpProgress(xp: number): { level: number; into: number; span: number } {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - base, span: next - base };
}

export function pointsSpent(map: UpgradeMap | undefined): number {
  if (!map) return 0;
  return Object.values(map).reduce((n, v) => n + (v ?? 0), 0);
}

// 1 command point per level beyond the first.
export function pointsAvailable(xp: number, map: UpgradeMap | undefined): number {
  return levelForXp(xp) - 1 - pointsSpent(map);
}

// XP awards
export const XP = {
  hit: 3,
  sink: 12,
  winBot: 90,
  lossBot: 25,
  arenaRound: 45,
};
