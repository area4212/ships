// In-battle emotes: a preset set of emoji played as a short CSS animation
// above a board. Online, the id is broadcast to the opponent. No asset files.

export type EmoteAnim = "bounce" | "shake" | "spin" | "rise" | "pulse";

export interface EmoteDef {
  id: string;
  glyph: string;
  label: string;
  anim: EmoteAnim;
}

export const EMOTES: EmoteDef[] = [
  { id: "wave", glyph: "👋", label: "Salut", anim: "shake" },
  { id: "cool", glyph: "😎", label: "Tranquille", anim: "bounce" },
  { id: "shock", glyph: "😱", label: "Panique", anim: "shake" },
  { id: "laugh", glyph: "😂", label: "Rire", anim: "bounce" },
  { id: "fire", glyph: "🔥", label: "En feu", anim: "rise" },
  { id: "aim", glyph: "🎯", label: "Dans le mille", anim: "pulse" },
  { id: "salt", glyph: "🧂", label: "Salé", anim: "spin" },
  { id: "anchor", glyph: "⚓", label: "GG", anim: "pulse" },
];

const BY_ID: Record<string, EmoteDef> = Object.fromEntries(EMOTES.map((e) => [e.id, e]));

export function emoteById(id: string | undefined): EmoteDef | undefined {
  return id ? BY_ID[id] : undefined;
}

export function randomEmote(): EmoteDef {
  return EMOTES[Math.floor(Math.random() * EMOTES.length)];
}

/** Minimum ms between two emotes from the same player. */
export const EMOTE_COOLDOWN_MS = 2000;
