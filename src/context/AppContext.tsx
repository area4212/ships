import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Difficulty, GameSettings, GameStats } from "../types/game";
import { playSfx, SfxName } from "../game/sound";
import { startMusic, stopMusic } from "../game/music";
import { UPGRADES, UpgradeId, XP as XP_AWARD, pointsAvailable, upgradeLevel } from "../game/progression";
import {
  DEFAULT_LOADOUT,
  FREE_COSMETIC_IDS,
  Loadout,
  cosmeticById,
  doublonsForArena,
  doublonsForGame,
  isOwned,
  DOUBLONS,
  todayKey,
} from "../game/cosmetics";

const STORAGE_KEY = "feedlo-navale-data-v1";

const DEFAULT_SETTINGS: GameSettings = {
  boardSize: 10,
  soundOn: true,
  musicOn: false,
  theme: "sombre",
  noTouchRule: false,
  fireAgainOnHit: true,
  animationsOn: true,
  powersOn: true,
  obstacles: "aucun",
  fogOfWar: false,
};

const DEFAULT_STATS: GameStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  shotsFired: 0,
  shotsHit: 0,
  arenaBestStreak: 0,
  arenaCurrentStreak: 0,
  arenaBestByMode: {},
  winsByDifficulty: { facile: 0, moyen: 0, difficile: 0, expert: 0 },
  xp: 0,
  upgrades: {},
  doublons: 0,
  ownedCosmetics: [...FREE_COSMETIC_IDS],
  lastDailyBonus: "",
};

interface StoredData {
  settings: GameSettings;
  stats: GameStats;
  loadout: Loadout;
}

function loadStored(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { settings: DEFAULT_SETTINGS, stats: DEFAULT_STATS, loadout: DEFAULT_LOADOUT };
    const parsed = JSON.parse(raw);
    const ownedCosmetics = Array.from(
      new Set<string>([...FREE_COSMETIC_IDS, ...(parsed.stats?.ownedCosmetics ?? [])])
    );
    // Only keep an equipped item the player actually owns.
    const rawLoadout: Loadout = { ...DEFAULT_LOADOUT, ...parsed.loadout };
    const loadout = Object.fromEntries(
      (Object.keys(DEFAULT_LOADOUT) as (keyof Loadout)[]).map((k) => [
        k,
        ownedCosmetics.includes(rawLoadout[k]) && cosmeticById(rawLoadout[k])?.category === k
          ? rawLoadout[k]
          : DEFAULT_LOADOUT[k],
      ])
    ) as unknown as Loadout;
    return {
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      stats: {
        ...DEFAULT_STATS,
        ...parsed.stats,
        winsByDifficulty: { ...DEFAULT_STATS.winsByDifficulty, ...parsed.stats?.winsByDifficulty },
        upgrades: { ...parsed.stats?.upgrades },
        arenaBestByMode: { ...parsed.stats?.arenaBestByMode },
        doublons: Math.max(0, parsed.stats?.doublons ?? 0),
        ownedCosmetics,
        lastDailyBonus: parsed.stats?.lastDailyBonus ?? "",
      },
      loadout,
    };
  } catch {
    return { settings: DEFAULT_SETTINGS, stats: DEFAULT_STATS, loadout: DEFAULT_LOADOUT };
  }
}

interface AppContextValue {
  settings: GameSettings;
  stats: GameStats;
  loadout: Loadout;
  updateSettings: (partial: Partial<GameSettings>) => void;
  resetStats: () => void;
  recordGameEnd: (won: boolean, difficulty?: Difficulty) => void;
  recordShot: (wasHit: boolean) => void;
  recordArenaResult: (won: boolean, arenaId?: string) => void;
  buyUpgrade: (id: UpgradeId) => void;
  buyCosmetic: (id: string) => void;
  equipCosmetic: (id: string) => void;
  sfx: (name: SfxName) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [{ settings, stats, loadout }, setData] = useState<StoredData>(loadStored);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, stats, loadout }));
  }, [settings, stats, loadout]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  // Background music. Browsers block audio until the first user gesture, so
  // when music is enabled we wait for one before starting it.
  useEffect(() => {
    if (!settings.musicOn) {
      stopMusic();
      return;
    }
    let armed = true;
    const kick = () => {
      if (!armed) return;
      armed = false;
      startMusic();
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
    window.addEventListener("pointerdown", kick);
    window.addEventListener("keydown", kick);
    return () => {
      armed = false;
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
  }, [settings.musicOn]);

  const value = useMemo<AppContextValue>(
    () => ({
      settings,
      stats,
      loadout,
      updateSettings: (partial) =>
        setData((d) => ({ ...d, settings: { ...d.settings, ...partial } })),
      resetStats: () =>
        setData((d) => ({
          ...d,
          // keep paid cosmetic progress — only game statistics are reset
          stats: {
            ...DEFAULT_STATS,
            doublons: d.stats.doublons,
            ownedCosmetics: d.stats.ownedCosmetics,
            lastDailyBonus: d.stats.lastDailyBonus,
          },
        })),
      recordGameEnd: (won, difficulty) =>
        setData((d) => {
          const today = todayKey();
          const dailyBonus = won && d.stats.lastDailyBonus !== today ? DOUBLONS.dailyFirstWin : 0;
          return {
          ...d,
          stats: {
            ...d.stats,
            gamesPlayed: d.stats.gamesPlayed + 1,
            wins: d.stats.wins + (won ? 1 : 0),
            losses: d.stats.losses + (won ? 0 : 1),
            xp: d.stats.xp + (won ? XP_AWARD.winBot : XP_AWARD.lossBot),
            doublons: d.stats.doublons + doublonsForGame(won) + dailyBonus,
            lastDailyBonus: dailyBonus > 0 ? today : d.stats.lastDailyBonus,
            winsByDifficulty:
              won && difficulty
                ? {
                    ...d.stats.winsByDifficulty,
                    [difficulty]: d.stats.winsByDifficulty[difficulty] + 1,
                  }
                : d.stats.winsByDifficulty,
          },
          };
        }),
      recordShot: (wasHit) =>
        setData((d) => ({
          ...d,
          stats: {
            ...d.stats,
            shotsFired: d.stats.shotsFired + 1,
            shotsHit: d.stats.shotsHit + (wasHit ? 1 : 0),
            xp: d.stats.xp + (wasHit ? XP_AWARD.hit : 0),
          },
        })),
      buyUpgrade: (id) =>
        setData((d) => {
          const def = UPGRADES.find((u) => u.id === id);
          if (!def) return d;
          const cur = upgradeLevel(d.stats.upgrades, id);
          if (cur >= def.maxLevel) return d;
          if (pointsAvailable(d.stats.xp, d.stats.upgrades) < 1) return d;
          return {
            ...d,
            stats: { ...d.stats, upgrades: { ...d.stats.upgrades, [id]: cur + 1 } },
          };
        }),
      recordArenaResult: (won, arenaId) =>
        setData((d) => {
          const currentStreak = won ? d.stats.arenaCurrentStreak + 1 : 0;
          const best = Math.max(d.stats.arenaBestStreak, currentStreak);
          const byMode = { ...d.stats.arenaBestByMode };
          if (arenaId) byMode[arenaId] = Math.max(byMode[arenaId] ?? 0, currentStreak);
          return {
            ...d,
            stats: {
              ...d.stats,
              xp: d.stats.xp + (won ? XP_AWARD.arenaRound : 0),
              doublons: d.stats.doublons + doublonsForArena(won, currentStreak),
              arenaCurrentStreak: currentStreak,
              arenaBestStreak: best,
              arenaBestByMode: byMode,
            },
          };
        }),
      buyCosmetic: (id) =>
        setData((d) => {
          const def = cosmeticById(id);
          if (!def || isOwned(d.stats.ownedCosmetics, id)) return d;
          if (d.stats.doublons < def.price) return d;
          return {
            ...d,
            stats: {
              ...d.stats,
              doublons: d.stats.doublons - def.price,
              ownedCosmetics: [...d.stats.ownedCosmetics, id],
            },
            // auto-equip the freshly bought item
            loadout: { ...d.loadout, [def.category]: id },
          };
        }),
      equipCosmetic: (id) =>
        setData((d) => {
          const def = cosmeticById(id);
          if (!def || !isOwned(d.stats.ownedCosmetics, id)) return d;
          return { ...d, loadout: { ...d.loadout, [def.category]: id } };
        }),
      sfx: (name) => playSfx(name, settings.soundOn),
    }),
    [settings, stats, loadout]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
