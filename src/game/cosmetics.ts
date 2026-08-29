// Cosmetic economy: a SECOND currency ("doublons") earned by playing, spent
// only on appearance items. Cosmetics never touch gameplay balance.
//
// The base collection is pure SVG/CSS parameters (palettes, colours, shapes).
// The "medieval" collection adds illustrated items: each carries an `image`
// (bundled JPG in public/cosmetics/) for the shop + HUD, plus a derived
// livery/flag/trail so it still applies to the top-down grid ships.

export type CosmeticCategory = "hull" | "flag" | "emblem" | "trail" | "grid";
export type Rarity = "commun" | "rare" | "epique" | "legendaire";
export type Collection = "standard" | "medieval";

export interface ShipLivery {
  deckTop: string;
  deckMid: string;
  steel: string;
  steelDark: string;
}

export type EmblemShape = "none" | "ancre" | "etoile" | "crane" | "trident" | "eclair" | "vague";

/** Passive perk carried by some hulls. Applied vs bot / in arena only. */
export type HullTrait = "energyStart" | "regen" | "mine" | "scout" | "discount" | "repair";

export interface CosmeticDef {
  id: string;
  category: CosmeticCategory;
  name: string;
  price: number;
  rarity: Rarity;
  /** artwork shown in the shop (and, for hull/emblem, in-game). Path under public/. */
  image?: string;
  collection?: Collection;
  /** grouping label inside the medieval collection ("Age viking", ...) */
  era?: string;
  /** hull */
  livery?: ShipLivery;
  /** hull passive perk (vs bot / arena only) */
  hullTrait?: HullTrait;
  traitName?: string;
  traitDesc?: string;
  /** flag: 2-3 horizontal bands */
  flag?: string[];
  /** emblem */
  emblem?: { shape: EmblemShape; color: string };
  /** trail: FX tint colour */
  trail?: string;
  /** grid: board water + line colours */
  grid?: { water: string; line: string };
}

export const RARITY_PRICE: Record<Rarity, number> = {
  commun: 60,
  rare: 150,
  epique: 260,
  legendaire: 400,
};

export const RARITY_LABEL: Record<Rarity, string> = {
  commun: "commun",
  rare: "rare",
  epique: "epique",
  legendaire: "legendaire",
};

/** Full URL for a cosmetic's artwork (honours the Vite base path). */
export function cosmeticImage(def: CosmeticDef | undefined): string | undefined {
  return def?.image ? `${import.meta.env.BASE_URL}${def.image}` : undefined;
}

export const CATEGORY_META: Record<CosmeticCategory, { label: string; help: string }> = {
  hull: { label: "Livree de coque", help: "La peinture de tous vos navires." },
  flag: { label: "Pavillon", help: "Le drapeau hisse sur votre flotte." },
  emblem: { label: "Embleme d'escadre", help: "Le blason affiche sur le bandeau de votre grille." },
  trail: { label: "Sillage de combat", help: "La teinte de vos impacts et gerbes d'eau." },
  grid: { label: "Theme de grille", help: "La couleur de l'eau et du quadrillage de votre grille." },
};

export const CATEGORY_ORDER: CosmeticCategory[] = ["hull", "flag", "emblem", "trail", "grid"];

const P = RARITY_PRICE;

export const COSMETICS: CosmeticDef[] = [
  // ---- Hull liveries --------------------------------------------------------
  {
    id: "hull-standard",
    category: "hull",
    name: "Acier de flotte",
    price: 0,
    rarity: "commun",
    livery: { deckTop: "#8ea7bd", deckMid: "#5f7c93", steel: "#41586c", steelDark: "#2b3d4d" },
  },
  {
    id: "hull-nuit",
    category: "hull",
    name: "Coque de nuit",
    price: P.commun,
    rarity: "commun",
    livery: { deckTop: "#4a5560", deckMid: "#333d47", steel: "#232b33", steelDark: "#161c22" },
  },
  {
    id: "hull-corsaire",
    category: "hull",
    name: "Bois de corsaire",
    price: P.rare,
    rarity: "rare",
    livery: { deckTop: "#7a5a3a", deckMid: "#5e4228", steel: "#3e2c1a", steelDark: "#2a1d10" },
  },
  {
    id: "hull-arctique",
    category: "hull",
    name: "Camouflage arctique",
    price: P.rare,
    rarity: "rare",
    livery: { deckTop: "#dfe9f0", deckMid: "#b9ccd8", steel: "#8fa6b4", steelDark: "#6b8290" },
  },
  {
    id: "hull-recif",
    category: "hull",
    name: "Vert de recif",
    price: P.rare,
    rarity: "rare",
    livery: { deckTop: "#6fc7b0", deckMid: "#3f9d88", steel: "#2c7566", steelDark: "#1d5044" },
  },
  {
    id: "hull-magma",
    category: "hull",
    name: "Coque de magma",
    price: P.legendaire,
    rarity: "legendaire",
    livery: { deckTop: "#c46b3a", deckMid: "#8f3f1f", steel: "#5c2814", steelDark: "#3a1a0d" },
  },
  {
    id: "hull-abyssal",
    category: "hull",
    name: "Bleu abyssal",
    price: P.legendaire,
    rarity: "legendaire",
    livery: { deckTop: "#5b6fae", deckMid: "#3d4d86", steel: "#2a3660", steelDark: "#1a2140" },
  },
  {
    id: "hull-amiraute",
    category: "hull",
    name: "Or de l'Amiraute",
    price: P.legendaire,
    rarity: "legendaire",
    livery: { deckTop: "#e9c46a", deckMid: "#c99a3a", steel: "#9c7522", steelDark: "#6b4f14" },
  },

  // ---- Flags --------------------------------------------------------------
  { id: "flag-none", category: "flag", name: "Aucun pavillon", price: 0, rarity: "commun", flag: [] },
  { id: "flag-tricolore", category: "flag", name: "Tricolore", price: P.commun, rarity: "commun", flag: ["#3b5bfb", "#ffffff", "#e63946"] },
  { id: "flag-corsaire", category: "flag", name: "Pavillon corsaire", price: P.commun, rarity: "commun", flag: ["#141414", "#c1121f"] },
  { id: "flag-marine", category: "flag", name: "Fanion de marine", price: P.rare, rarity: "rare", flag: ["#0a2a3a", "#4ceaff", "#0a2a3a"] },
  { id: "flag-or", category: "flag", name: "Etendard dore", price: P.rare, rarity: "rare", flag: ["#1a1408", "#ffd23f"] },
  { id: "flag-spectre", category: "flag", name: "Banniere spectre", price: P.legendaire, rarity: "legendaire", flag: ["#1b0f2e", "#b06bff", "#1b0f2e"] },

  // ---- Emblems ----------------------------------------------------------
  { id: "emblem-none", category: "emblem", name: "Aucun embleme", price: 0, rarity: "commun", emblem: { shape: "none", color: "#8ea7bd" } },
  { id: "emblem-ancre", category: "emblem", name: "Ancre d'honneur", price: P.commun, rarity: "commun", emblem: { shape: "ancre", color: "#4ceaff" } },
  { id: "emblem-etoile", category: "emblem", name: "Etoile d'amiral", price: P.commun, rarity: "commun", emblem: { shape: "etoile", color: "#ffd23f" } },
  { id: "emblem-vague", category: "emblem", name: "Vague liberee", price: P.rare, rarity: "rare", emblem: { shape: "vague", color: "#4dff8c" } },
  { id: "emblem-trident", category: "emblem", name: "Trident de Neptune", price: P.rare, rarity: "rare", emblem: { shape: "trident", color: "#4c8fff" } },
  { id: "emblem-eclair", category: "emblem", name: "Foudre de guerre", price: P.legendaire, rarity: "legendaire", emblem: { shape: "eclair", color: "#ffcf5c" } },
  { id: "emblem-crane", category: "emblem", name: "Tete de mort", price: P.legendaire, rarity: "legendaire", emblem: { shape: "crane", color: "#e6e6e6" } },

  // ---- Trails ----------------------------------------------------------
  { id: "trail-standard", category: "trail", name: "Gerbe standard", price: 0, rarity: "commun", trail: "#7fd3ff" },
  { id: "trail-vert", category: "trail", name: "Feu vert", price: P.commun, rarity: "commun", trail: "#4dff8c" },
  { id: "trail-or", category: "trail", name: "Etincelles d'or", price: P.rare, rarity: "rare", trail: "#ffd23f" },
  { id: "trail-rouge", category: "trail", name: "Braise rouge", price: P.rare, rarity: "rare", trail: "#ff5a3c" },
  { id: "trail-plasma", category: "trail", name: "Plasma violet", price: P.legendaire, rarity: "legendaire", trail: "#b06bff" },

  // ---- Grid themes ----------------------------------------------------
  { id: "grid-standard", category: "grid", name: "Mer de nuit", price: 0, rarity: "commun", grid: { water: "#0d3355", line: "rgba(76,234,255,0.25)" } },
  { id: "grid-lagon", category: "grid", name: "Lagon", price: P.commun, rarity: "commun", grid: { water: "#0e4d52", line: "rgba(63,208,201,0.35)" } },
  { id: "grid-tempete", category: "grid", name: "Tempete", price: P.rare, rarity: "rare", grid: { water: "#1a2436", line: "rgba(150,170,200,0.3)" } },
  { id: "grid-sang", category: "grid", name: "Mer de sang", price: P.rare, rarity: "rare", grid: { water: "#3a1420", line: "rgba(224,106,106,0.35)" } },
  { id: "grid-neon", category: "grid", name: "Grille neon", price: P.legendaire, rarity: "legendaire", grid: { water: "#0a1030", line: "rgba(76,143,255,0.45)" } },

  // ============================================================
  //  Collection medievale (illustrations) — 6 ages x 4 categories
  // ============================================================

  // ---- Age viking (VIIIe-XIe) ----
  { id: "med-viking-hull", collection: "medieval", era: "Age viking", category: "hull", name: "Coque du Jarl", price: P.rare, rarity: "rare", image: "cosmetics/viking-navire.jpg",
    livery: { deckTop: "#8a6a44", deckMid: "#6b4a2c", steel: "#4a3320", steelDark: "#2e2013" },
    hullTrait: "energyStart", traitName: "Fureur du Jarl", traitDesc: "+2 energie de depart" },
  { id: "med-viking-flag", collection: "medieval", era: "Age viking", category: "flag", name: "Corbeaux d'Odin", price: P.commun, rarity: "commun", image: "cosmetics/viking-pavillon.jpg",
    flag: ["#161616", "#e8e8e8"] },
  { id: "med-viking-emblem", collection: "medieval", era: "Age viking", category: "emblem", name: "Serpent de Midgard", price: P.commun, rarity: "commun", image: "cosmetics/viking-embleme.jpg",
    emblem: { shape: "vague", color: "#9aa7b0" } },
  { id: "med-viking-trail", collection: "medieval", era: "Age viking", category: "trail", name: "Sillage runique", price: P.rare, rarity: "rare", image: "cosmetics/viking-sillage.jpg",
    trail: "#4aa3ff" },

  // ---- Age des croisades (XIIe-XIIIe) ----
  { id: "med-croisades-hull", collection: "medieval", era: "Age des croisades", category: "hull", name: "Acier du Croise", price: P.rare, rarity: "rare", image: "cosmetics/croisades-navire.jpg",
    livery: { deckTop: "#c2c6ca", deckMid: "#8a9096", steel: "#5c6268", steelDark: "#3a3f45" },
    hullTrait: "repair", traitName: "Foi inebranlable", traitDesc: "+1 reparation par bataille" },
  { id: "med-croisades-flag", collection: "medieval", era: "Age des croisades", category: "flag", name: "Ordre du Temple", price: P.rare, rarity: "rare", image: "cosmetics/croisades-pavillon.jpg",
    flag: ["#f0f0f0", "#c1121f", "#f0f0f0"] },
  { id: "med-croisades-emblem", collection: "medieval", era: "Age des croisades", category: "emblem", name: "Bouclier de chevalier", price: P.rare, rarity: "rare", image: "cosmetics/croisades-embleme.jpg",
    emblem: { shape: "etoile", color: "#c1121f" } },
  { id: "med-croisades-trail", collection: "medieval", era: "Age des croisades", category: "trail", name: "Sillage sacre", price: P.rare, rarity: "rare", image: "cosmetics/croisades-sillage.jpg",
    trail: "#ffe9b0" },

  // ---- Age feodal (XIIIe-XIVe) ----
  { id: "med-feodal-hull", collection: "medieval", era: "Age feodal", category: "hull", name: "Maison du Lion", price: P.epique, rarity: "epique", image: "cosmetics/feodal-navire.jpg",
    livery: { deckTop: "#d9b35a", deckMid: "#3a539b", steel: "#26386f", steelDark: "#17223f" },
    hullTrait: "mine", traitName: "Banniere du Lion", traitDesc: "+1 mine simultanee" },
  { id: "med-feodal-flag", collection: "medieval", era: "Age feodal", category: "flag", name: "Fleur de lys", price: P.rare, rarity: "rare", image: "cosmetics/feodal-pavillon.jpg",
    flag: ["#2f4a9e", "#e9c46a"] },
  { id: "med-feodal-emblem", collection: "medieval", era: "Age feodal", category: "emblem", name: "Lion heraldique", price: P.rare, rarity: "rare", image: "cosmetics/feodal-embleme.jpg",
    emblem: { shape: "etoile", color: "#e9c46a" } },
  { id: "med-feodal-trail", collection: "medieval", era: "Age feodal", category: "trail", name: "Sillage royal", price: P.epique, rarity: "epique", image: "cosmetics/feodal-sillage.jpg",
    trail: "#ffd23f" },

  // ---- Guerre de Cent Ans (XIVe-XVe) ----
  { id: "med-centans-hull", collection: "medieval", era: "Guerre de Cent Ans", category: "hull", name: "Longbow", price: P.rare, rarity: "rare", image: "cosmetics/centans-navire.jpg",
    livery: { deckTop: "#7a8b5a", deckMid: "#4a5c38", steel: "#3a4a2c", steelDark: "#26331d" },
    hullTrait: "scout", traitName: "Oeil de l'archer", traitDesc: "+2 cases ennemies revelees au debut" },
  { id: "med-centans-flag", collection: "medieval", era: "Guerre de Cent Ans", category: "flag", name: "Maison du Cerf", price: P.rare, rarity: "rare", image: "cosmetics/centans-pavillon.jpg",
    flag: ["#2e4d33", "#d9b35a"] },
  { id: "med-centans-emblem", collection: "medieval", era: "Guerre de Cent Ans", category: "emblem", name: "Lys royal", price: P.rare, rarity: "rare", image: "cosmetics/centans-embleme.jpg",
    emblem: { shape: "trident", color: "#e9c46a" } },
  { id: "med-centans-trail", collection: "medieval", era: "Guerre de Cent Ans", category: "trail", name: "Sillage sylvestre", price: P.rare, rarity: "rare", image: "cosmetics/centans-sillage.jpg",
    trail: "#4dff8c" },

  // ---- Fin du Moyen Age (XVe) ----
  { id: "med-finmoyenage-hull", collection: "medieval", era: "Fin du Moyen Age", category: "hull", name: "Armure gothique", price: P.epique, rarity: "epique", image: "cosmetics/finmoyenage-navire.jpg",
    livery: { deckTop: "#6a7078", deckMid: "#444a52", steel: "#2c3138", steelDark: "#1a1e23" },
    hullTrait: "discount", traitName: "Plates gothiques", traitDesc: "-1 au cout de tous les pouvoirs" },
  { id: "med-finmoyenage-flag", collection: "medieval", era: "Fin du Moyen Age", category: "flag", name: "Rose heraldique", price: P.epique, rarity: "epique", image: "cosmetics/finmoyenage-pavillon.jpg",
    flag: ["#7a1220", "#e9c46a"] },
  { id: "med-finmoyenage-emblem", collection: "medieval", era: "Fin du Moyen Age", category: "emblem", name: "Dragon noir", price: P.epique, rarity: "epique", image: "cosmetics/finmoyenage-embleme.jpg",
    emblem: { shape: "crane", color: "#c1121f" } },
  { id: "med-finmoyenage-trail", collection: "medieval", era: "Fin du Moyen Age", category: "trail", name: "Sillage de braises", price: P.epique, rarity: "epique", image: "cosmetics/finmoyenage-sillage.jpg",
    trail: "#ff5a3c" },

  // ---- Medieval legendaire ----
  { id: "med-legendaire-hull", collection: "medieval", era: "Medieval legendaire", category: "hull", name: "Ecailles du Dragon", price: P.legendaire, rarity: "legendaire", image: "cosmetics/legendaire-navire.jpg",
    livery: { deckTop: "#d98a3a", deckMid: "#a83a1e", steel: "#6e2412", steelDark: "#45160a" },
    hullTrait: "regen", traitName: "Souffle du Dragon", traitDesc: "+1 energie par tour" },
  { id: "med-legendaire-flag", collection: "medieval", era: "Medieval legendaire", category: "flag", name: "Banniere du Roi-Dragon", price: P.legendaire, rarity: "legendaire", image: "cosmetics/legendaire-pavillon.jpg",
    flag: ["#161616", "#c1121f"] },
  { id: "med-legendaire-emblem", collection: "medieval", era: "Medieval legendaire", category: "emblem", name: "Graal", price: P.legendaire, rarity: "legendaire", image: "cosmetics/legendaire-embleme.jpg",
    emblem: { shape: "etoile", color: "#e9c46a" } },
  { id: "med-legendaire-trail", collection: "medieval", era: "Medieval legendaire", category: "trail", name: "Sillage necromantique", price: P.legendaire, rarity: "legendaire", image: "cosmetics/legendaire-sillage.jpg",
    trail: "#b06bff" },
];

export interface Loadout {
  hull: string;
  flag: string;
  emblem: string;
  trail: string;
  grid: string;
}

/** Free item per category — always owned, equipped by default. */
export const DEFAULT_LOADOUT: Loadout = {
  hull: "hull-standard",
  flag: "flag-none",
  emblem: "emblem-none",
  trail: "trail-standard",
  grid: "grid-standard",
};

export const FREE_COSMETIC_IDS = Object.values(DEFAULT_LOADOUT);

const BY_ID: Record<string, CosmeticDef> = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

export function cosmeticById(id: string | undefined): CosmeticDef | undefined {
  return id ? BY_ID[id] : undefined;
}

export function isOwned(owned: string[] | undefined, id: string): boolean {
  return cosmeticById(id)?.price === 0 || !!owned?.includes(id);
}

export function equippedDef(loadout: Loadout, category: CosmeticCategory): CosmeticDef | undefined {
  return cosmeticById(loadout[category]);
}

export function liveryFor(loadout: Loadout): ShipLivery {
  return equippedDef(loadout, "hull")?.livery ?? cosmeticById("hull-standard")!.livery!;
}

/** The equipped hull's def if it carries a gameplay trait, else undefined. */
export function hullTraitOf(loadout: Loadout): CosmeticDef | undefined {
  const h = equippedDef(loadout, "hull");
  return h?.hullTrait ? h : undefined;
}

// ---- Earning -----------------------------------------------------------

export const DOUBLONS = {
  perGame: 5,
  winBonus: 15,
  arenaRound: 20,
  arenaStreakMilestone: 50, // at streak 3 / 5 / 10
  dailyFirstWin: 30,
};

export function doublonsForGame(won: boolean): number {
  return DOUBLONS.perGame + (won ? DOUBLONS.winBonus : 0);
}

export function doublonsForArena(won: boolean, newStreak: number): number {
  if (!won) return DOUBLONS.perGame;
  const milestone = newStreak === 3 || newStreak === 5 || newStreak === 10;
  return DOUBLONS.arenaRound + (milestone ? DOUBLONS.arenaStreakMilestone : 0);
}

export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
