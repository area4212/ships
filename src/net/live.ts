import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

// Presence channel that advertises online Duel battles in progress so other
// players can spectate them. Each participant (host + guest) announces the
// same game `code`; the list is deduplicated by code.

export interface LiveGame {
  code: string;
  a: string; // host name
  b: string; // guest name
}

const CHANNEL = "feedlo-live-v1";

interface Announce {
  code: string;
  me: string;
  vs: string;
  host: boolean;
}

export class LiveGames {
  private ch: RealtimeChannel | null = null;
  private id = Math.random().toString(36).slice(2);
  private info: Announce | null;
  private onGames: (games: LiveGame[]) => void;

  constructor(onGames: (games: LiveGame[]) => void, announce?: Announce) {
    this.onGames = onGames;
    this.info = announce ?? null;
  }

  async connect(): Promise<void> {
    const ch = getSupabase().channel(CHANNEL, {
      config: { presence: { key: this.id }, broadcast: { self: false } },
    });

    const emit = () => {
      const st = ch.presenceState() as Record<
        string,
        Array<{ code?: string; me?: string; vs?: string; host?: boolean }>
      >;
      const byCode = new Map<string, LiveGame>();
      for (const arr of Object.values(st)) {
        const p = arr[0];
        if (!p?.code || !p.me) continue;
        // each entry knows both names (me + vs); host's entry defines a/b order
        const a = p.host ? p.me : p.vs ?? "";
        const b = p.host ? p.vs ?? "" : p.me;
        const cur = byCode.get(p.code);
        if (!cur || p.host) byCode.set(p.code, { code: p.code, a, b });
      }
      const mine = this.info?.code;
      this.onGames([...byCode.values()].filter((g) => g.code !== mine && g.a && g.b));
    };
    ch.on("presence", { event: "sync" }, emit);
    ch.on("presence", { event: "join" }, emit);
    ch.on("presence", { event: "leave" }, emit);

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED" && this.info) {
        await ch.track({
          code: this.info.code,
          me: this.info.me,
          vs: this.info.vs,
          host: this.info.host,
        });
      }
    });
    this.ch = ch;
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
