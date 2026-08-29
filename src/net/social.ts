// Thin client over the Supabase RPC functions defined in
// supabase/friends_setup.sql. No auth: every call passes the caller's
// local uuid (see net/identity.ts). If the SQL setup hasn't been run,
// calls fail with PostgREST code PGRST202 -> `setupMissing`.

import { getSupabase, isOnlineConfigured } from "./supabase";

export interface Friend {
  id: string;
  name: string;
  friendshipId: string;
}

export interface SocialSnapshot {
  myCode: string;
  friends: Friend[];
  incoming: Friend[];
  outgoing: Friend[];
}

export interface SocialResult<T> {
  data: T | null;
  error: string | null;
  setupMissing: boolean;
}

const EMPTY: SocialSnapshot = { myCode: "", friends: [], incoming: [], outgoing: [] };

function wrap<T>(data: T | null, err: unknown): SocialResult<T> {
  const e = err as { code?: string; message?: string } | null;
  const setupMissing = e?.code === "PGRST202" || /Could not find the function/i.test(e?.message ?? "");
  return { data, error: e ? e.message ?? "Erreur reseau" : null, setupMissing };
}

export function socialAvailable(): boolean {
  return isOnlineConfigured();
}

export async function syncPlayer(id: string, name: string): Promise<SocialResult<string>> {
  try {
    const { data, error } = await getSupabase().rpc("sync_player", { p_id: id, p_name: name });
    return wrap<string>(typeof data === "string" ? data : null, error);
  } catch (err) {
    return wrap<string>(null, err);
  }
}

export async function getSocial(id: string): Promise<SocialResult<SocialSnapshot>> {
  try {
    const { data, error } = await getSupabase().rpc("get_social", { p_id: id });
    if (error || !data) return wrap<SocialSnapshot>(null, error);
    const d = data as Partial<SocialSnapshot>;
    return wrap<SocialSnapshot>(
      {
        myCode: d.myCode ?? "",
        friends: d.friends ?? [],
        incoming: d.incoming ?? [],
        outgoing: d.outgoing ?? [],
      },
      null
    );
  } catch (err) {
    return wrap<SocialSnapshot>(null, err);
  }
}

export interface SendResult {
  ok: boolean;
  reason: string;
}

const REASON_LABEL: Record<string, string> = {
  "introuvable": "Aucun joueur avec ce code.",
  "soi-meme": "C'est votre propre code.",
  "deja-ami": "Vous etes deja amis.",
  "deja-envoyee": "Demande deja envoyee.",
  "envoyee": "Demande envoyee.",
  "accepte": "Vous etes maintenant amis !",
};

export function sendReasonLabel(reason: string): string {
  return REASON_LABEL[reason] ?? reason;
}

export async function sendFriendRequest(
  id: string,
  name: string,
  target: { code?: string; toId?: string }
): Promise<SocialResult<SendResult>> {
  try {
    const { data, error } = await getSupabase().rpc("send_friend_request", {
      p_from: id,
      p_from_name: name,
      p_to_code: target.code ?? null,
      p_to_id: target.toId ?? null,
    });
    if (error || !data) return wrap<SendResult>(null, error);
    const d = data as { ok?: boolean; reason?: string };
    return wrap<SendResult>({ ok: Boolean(d.ok), reason: d.reason ?? "" }, null);
  } catch (err) {
    return wrap<SendResult>(null, err);
  }
}

export async function respondRequest(
  id: string,
  friendshipId: string,
  accept: boolean
): Promise<SocialResult<true>> {
  try {
    const { error } = await getSupabase().rpc("respond_friend_request", {
      p_me: id,
      p_friendship: friendshipId,
      p_accept: accept,
    });
    return wrap<true>(error ? null : true, error);
  } catch (err) {
    return wrap<true>(null, err);
  }
}

export async function removeFriend(id: string, otherId: string): Promise<SocialResult<true>> {
  try {
    const { error } = await getSupabase().rpc("remove_friend", { p_me: id, p_other: otherId });
    return wrap<true>(error ? null : true, error);
  } catch (err) {
    return wrap<true>(null, err);
  }
}

export { EMPTY as EMPTY_SNAPSHOT };
