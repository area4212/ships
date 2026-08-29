export type Difficulty = "facile" | "moyen" | "difficile" | "expert";

export type GameMode = "pvp" | "bot" | "arene";

export type Orientation = "horizontal" | "vertical";

export interface ShipDef {
  id: string;
  name: string;
  size: number;
}

export interface PlacedShip {
  defId: string;
  name: string;
  size: number;
  cells: string[]; // cell keys "r,c"
  hitCells: string[]; // cell keys already hit
  sunk: boolean;
}

export type ShotResult = "hit" | "miss" | "sunk" | "already";

export interface BoardState {
  size: number;
  ships: PlacedShip[];
  shots: Record<string, "hit" | "miss">; // shots received on this board, key -> result
  blocked?: string[]; // impassable cells (rocks / islands), shared by both boards
}

export interface FireOutcome {
  board: BoardState;
  result: ShotResult;
  sunkShip?: PlacedShip;
  victory: boolean;
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  difficulty?: Difficulty;
  board: BoardState;
}

export type ScreenId =
  | "menu"
  | "play-setup"
  | "placement"
  | "handoff"
  | "battle"
  | "end"
  | "arena-intro"
  | "arena-result"
  | "settings"
  | "stats"
  | "rules";

export interface GameSettings {
  boardSize: number;
  soundOn: boolean;
  musicOn: boolean;
  theme: "sombre" | "clair";
  noTouchRule: boolean;
  fireAgainOnHit: boolean;
  animationsOn: boolean;
  powersOn: boolean;
  obstacles: "aucun" | "peu" | "beaucoup";
  fogOfWar: boolean;
}

export interface GameStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  shotsFired: number;
  shotsHit: number;
  arenaBestStreak: number;
  arenaCurrentStreak: number;
  arenaBestByMode: Partial<Record<string, number>>;
  winsByDifficulty: Record<Difficulty, number>;
  xp: number;
  upgrades: Partial<Record<string, number>>;
  // Cosmetic economy (no gameplay effect)
  doublons: number;
  ownedCosmetics: string[];
  lastDailyBonus: string; // ISO date "YYYY-MM-DD" of the last daily-first-win bonus
}

export const RANKS = [
  "Recrue",
  "Matelot",
  "Second Maitre",
  "Officier",
  "Capitaine",
  "Commandant",
  "Amiral",
  "Legende des Mers",
] as const;
