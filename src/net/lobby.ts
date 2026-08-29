import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export type LobbyMode = "duel" | "chaos";

export interface LobbyPlayer {
  id: string;
  name: string;
  busy: boolean;
}

export interface Challenge {
  fromId: string;
  fromName: string;
  code: string;
  mode: LobbyMode;
}

export interface LobbyHandlers {
  onPlayers: (players: LobbyPlayer[]) => void;
  onChallenge: (c: Challenge) => void;
  onDeclined: (byName: string) => void;
  /** ids currently present on the lobby channel (self included) */
  onPresenceIds?: (ids: Set<string>) => void;
}

const CHANNEL = "feedlo-lobby-v1";

export class Lobby {
  private ch: RealtimeChannel | null = null;
  private id: string;
  private name: string;
  private busy = false;
  private handlers: LobbyHandlers;

  constructor(id: string, name: string, handlers: LobbyHandlers) {
    this.id = id || Math.random().toString(36).slice(2);
    this.name = name || "Joueur";
    this.handlers = handlers;
  }

  get selfId(): string {
    return this.id;
  }

  async connect(): Promise<void> {
    const ch = getSupabase().channel(CHANNEL, {
      config: { presence: { key: this.id }, broadcast: { self: false } },
    });

    const emit = () => {
      const st = ch.presenceState() as Record<string, Array<{ name?: string; busy?: boolean }>>;
      const players = Object.entries(st)
        .filter(([k]) => k !== this.id)
        .map(([k, a]) => ({ id: k, name: a[0]?.name ?? "Joueur", busy: Boolean(a[0]?.busy) }));
      this.handlers.onPlayers(players);
      this.handlers.onPresenceIds?.(new Set(Object.keys(st)));
    };
    ch.on("presence", { event: "sync" }, emit);
    ch.on("presence", { event: "join" }, emit);
    ch.on("presence", { event: "leave" }, emit);

    ch.on("broadcast", { event: "challenge" }, ({ payload }) => {
      if (payload?.to === this.id) {
        this.handlers.onChallenge({
          fromId: payload.from.id,
          fromName: payload.from.name,
          code: payload.from.code,
          mode: payload.from.mode,
        });
      }
    });
    ch.on("broadcast", { event: "decline" }, ({ payload }) => {
      if (payload?.to === this.id) this.handlers.onDeclined(payload.byName ?? "L'autre joueur");
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ name: this.name, busy: this.busy });
    });
    this.ch = ch;
  }

  challenge(toId: string, code: string, mode: LobbyMode): void {
    this.ch?.send({
      type: "broadcast",
      event: "challenge",
      payload: { to: toId, from: { id: this.id, name: this.name, code, mode } },
    });
  }

  decline(toId: string): void {
    this.ch?.send({ type: "broadcast", event: "decline", payload: { to: toId, byName: this.name } });
  }

  async setBusy(busy: boolean): Promise<void> {
    this.busy = busy;
    try {
      await this.ch?.track({ name: this.name, busy });
    } catch {
      /* ignore */
    }
  }

  async leave(): Promise<void> {
    try {
      if (this.ch) await getSupabase().removeChannel(this.ch);
    } catch {
      /* ignore */
    }
    this.ch = null;
  }
}
