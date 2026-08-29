import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Online play uses Supabase Realtime "broadcast" only - no database tables,
// no auth. Provide the project URL + anon key via a .env file:
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJhbGci...

// The publishable / anon key is designed to be exposed in the client bundle,
// so we ship a default that works out of the box. A .env still overrides it.
const DEFAULT_URL = "https://pjimqmzwtmfvrsjvhcow.supabase.co";
const DEFAULT_KEY = "sb_publishable_2C_pirv7UBDAQF2e5twHRg_Dff_o23h";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_KEY;

let client: SupabaseClient | null = null;

export function isOnlineConfigured(): boolean {
  return Boolean(url && anonKey);
}

export function getSupabase(): SupabaseClient {
  if (!isOnlineConfigured()) {
    throw new Error("Supabase non configure (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants).");
  }
  if (!client) {
    client = createClient(url!, anonKey!, {
      realtime: { params: { eventsPerSecond: 20 } },
    });
  }
  return client;
}
