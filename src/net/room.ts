import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export type NetRole = "host" | "guest" | "spectator";
export type NetEvent =
  | "hello"
  | "config"
  | "placed"
  | "action"
  | "resolution"
  | "rematch"
  | "start"
  | "chat"
  | "emote"
  | "spectate"
  | "bye";

export interface RoomMember {
  key: string;
  name: string;
  joinedAt: number;
}

export interface RoomHandlers {
  onOpen?: (role: NetRole) => void;
  onPeerJoin?: (name: string) => void;
  onPeerLeave?: () => void;
  /** full member list (self included), sorted by join time */
  onMembers?: (members: RoomMember[], selfKey: string) => void;
  /** number of spectators currently watching */
  onSpectators?: (n: number) => void;
  onMessage?: (event: NetEvent, data: any) => void;
  onError?: (msg: string) => void;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(len = 4): string {
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export class Room {
  readonly code: string;
  readonly name: string;
  readonly role: NetRole;
  private handlers: RoomHandlers;
  private channel: RealtimeChannel | null = null;
  private selfId = Math.random().toString(36).slice(2);
  private joinedAt = Date.now();
  private leaveTimer: number | null = null;
  peerName: string | null = null;

  constructor(code: string, name: string, role: NetRole, handlers: RoomHandlers) {
    this.code = code;
    this.name = name || (role === "host" ? "Hote" : "Invite");
    this.role = role;
    this.handlers = handlers;
  }

  async connect(): Promise<void> {
    const sb = getSupabase();
    const channel = sb.channel(`feedlo-${this.code}`, {
      config: { broadcast: { self: false }, presence: { key: this.selfId } },
    });

    channel.on("broadcast", { event: "msg" }, ({ payload }) => {
      this.handlers.onMessage?.(payload.event as NetEvent, payload.data);
    });

    const refreshPresence = () => {
      const state = channel.presenceState() as Record<
        string,
        Array<{ name?: string; joinedAt?: number; role?: NetRole }>
      >;

      const members: RoomMember[] = Object.entries(state)
        .map(([key, arr]) => ({
          key,
          name: arr[0]?.name ?? "Joueur",
          joinedAt: arr[0]?.joinedAt ?? 0,
        }))
        .sort((a, b) => a.joinedAt - b.joinedAt || a.key.localeCompare(b.key));
      this.handlers.onMembers?.(members, this.selfId);

      // spectators never count as "the peer" (the opponent)
      const others = Object.entries(state).filter(
        ([key, arr]) => key !== this.selfId && arr[0]?.role !== "spectator"
      );
      this.handlers.onSpectators?.(
        Object.values(state).filter((arr) => arr[0]?.role === "spectator").length
      );

      if (others.length === 0) {
        // Presence can flicker (reconnects, React StrictMode remounts).
        // Only report a departure if the peer is still gone after a grace period.
        if (this.peerName !== null && this.leaveTimer === null) {
          this.leaveTimer = window.setTimeout(() => {
            this.leaveTimer = null;
            const now = channel.presenceState() as Record<string, unknown[]>;
            const stillAlone = Object.keys(now).filter((k) => k !== this.selfId).length === 0;
            if (stillAlone && this.peerName !== null) {
              this.peerName = null;
              this.handlers.onPeerLeave?.();
            }
          }, 3000);
        }
        return;
      }

      if (this.leaveTimer !== null) {
        clearTimeout(this.leaveTimer);
        this.leaveTimer = null;
      }
      const peer = others[0][1][0];
      const name = peer?.name ?? "Adversaire";
      if (this.peerName !== name) {
        this.peerName = name;
        this.handlers.onPeerJoin?.(name);
      }
    };

    channel.on("presence", { event: "sync" }, refreshPresence);
    channel.on("presence", { event: "join" }, refreshPresence);
    channel.on("presence", { event: "leave" }, refreshPresence);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ name: this.name, role: this.role, joinedAt: this.joinedAt });
        this.handlers.onOpen?.(this.role);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        this.handlers.onError?.("Connexion au salon impossible.");
      }
    });

    this.channel = channel;
  }

  send(event: NetEvent, data: unknown): void {
    this.channel?.send({ type: "broadcast", event: "msg", payload: { event, data } });
  }

  async leave(): Promise<void> {
    if (this.leaveTimer !== null) {
      clearTimeout(this.leaveTimer);
      this.leaveTimer = null;
    }
    try {
      this.send("bye", {});
      if (this.channel) await getSupabase().removeChannel(this.channel);
    } catch {
      /* ignore */
    }
    this.channel = null;
  }
}
