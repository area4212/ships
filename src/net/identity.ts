// Stable, local player identity for the social / friends features.
// The game has no auth: a player is a client-generated uuid kept in
// localStorage. The display name lives here too (it used to be a
// separate "feedlo-online-name" key owned by OnlineLobby).

const KEY = "feedlo-identity";
const LEGACY_NAME_KEY = "feedlo-online-name";

export interface Identity {
  id: string;
  name: string;
}

function uuid(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  // fallback: RFC-4122-ish
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let cached: Identity | null = null;

export function getIdentity(): Identity {
  if (cached) return cached;
  let id = "";
  let name = "";
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Identity>;
      id = typeof p.id === "string" ? p.id : "";
      name = typeof p.name === "string" ? p.name : "";
    }
    if (!name) name = localStorage.getItem(LEGACY_NAME_KEY) ?? "";
  } catch {
    /* ignore */
  }
  if (!id) id = uuid();
  cached = { id, name };
  persist();
  return cached;
}

function persist() {
  if (!cached) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cached));
    // keep the legacy key in sync so any other reader still works
    if (cached.name) localStorage.setItem(LEGACY_NAME_KEY, cached.name);
  } catch {
    /* ignore */
  }
}

export function setIdentityName(name: string): Identity {
  const id = getIdentity().id;
  cached = { id, name };
  persist();
  return cached;
}

/** Display form of the friend/player id is the server-issued code, not this. */
export function shortId(id: string): string {
  return id.slice(0, 8);
}
