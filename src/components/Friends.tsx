import React, { useCallback, useEffect, useRef, useState } from "react";
import { NetRole, generateCode } from "../net/room";
import { isOnlineConfigured } from "../net/supabase";
import { Challenge, Lobby } from "../net/lobby";
import { getIdentity, setIdentityName } from "../net/identity";
import {
  EMPTY_SNAPSHOT,
  Friend,
  SocialSnapshot,
  getSocial,
  removeFriend,
  respondRequest,
  sendFriendRequest,
  sendReasonLabel,
  syncPlayer,
} from "../net/social";
import { LiveGame, LiveGames } from "../net/live";
import { LiveGamesList } from "./LiveGamesList";
import { useApp } from "../context/AppContext";

interface FriendsProps {
  onInviteGame: (code: string, role: NetRole, name: string) => void;
  onSpectate: (code: string) => void;
  onBack: () => void;
}

const POLL_MS = 4000;

export function Friends({ onInviteGame, onSpectate, onBack }: FriendsProps) {
  const { sfx } = useApp();
  const identity = getIdentity();

  const [name, setName] = useState(identity.name);
  const [snap, setSnap] = useState<SocialSnapshot>(EMPTY_SNAPSHOT);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [incoming, setIncoming] = useState<Challenge | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [addCode, setAddCode] = useState("");
  const [setupMissing, setSetupMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);

  const lobbyRef = useRef<Lobby | null>(null);
  const configured = isOnlineConfigured();

  const refresh = useCallback(async () => {
    const res = await getSocial(identity.id);
    if (res.setupMissing) {
      setSetupMissing(true);
      return;
    }
    if (res.data) {
      setSetupMissing(false);
      setSnap(res.data);
    }
  }, [identity.id]);

  // one-time player sync + first load
  useEffect(() => {
    if (!configured) return;
    let alive = true;
    (async () => {
      const r = await syncPlayer(identity.id, name || "Joueur");
      if (!alive) return;
      if (r.setupMissing) {
        setSetupMissing(true);
        return;
      }
      if (r.data) setSnap((s) => ({ ...s, myCode: r.data as string }));
      refresh();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  // poll social state so offline-sent requests show up
  useEffect(() => {
    if (!configured || setupMissing) return;
    const t = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(t);
  }, [configured, setupMissing, refresh]);

  // live games (to spectate)
  useEffect(() => {
    if (!configured) return;
    const live = new LiveGames(setLiveGames);
    live.connect();
    return () => {
      live.leave();
    };
  }, [configured]);

  // realtime presence + incoming game invites
  useEffect(() => {
    if (!configured) return;
    const lobby = new Lobby(identity.id, name || "Joueur", {
      onPlayers: () => {},
      onPresenceIds: setOnlineIds,
      onChallenge: (c) => setIncoming(c),
      onDeclined: (who) => setNotice(`${who} a decline l'invitation.`),
    });
    lobbyRef.current = lobby;
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (!cancelled) lobby.connect();
    }, 60);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      lobby.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  function saveName(n: string) {
    setName(n);
    setIdentityName(n);
    lobbyRef.current?.setBusy(false); // re-track presence with the new name
    syncPlayer(identity.id, n || "Joueur");
  }

  async function doAddByCode() {
    const code = addCode.trim().toUpperCase();
    if (code.length < 4 || busy) return;
    setBusy(true);
    const res = await sendFriendRequest(identity.id, name || "Joueur", { code });
    setBusy(false);
    if (res.setupMissing) return setSetupMissing(true);
    if (!res.data) return setNotice(res.error ?? "Echec de l'envoi.");
    setNotice(sendReasonLabel(res.data.reason));
    if (res.data.ok) {
      setAddCode("");
      refresh();
    }
  }

  async function respond(f: Friend, accept: boolean) {
    sfx("click");
    const res = await respondRequest(identity.id, f.friendshipId, accept);
    if (res.setupMissing) return setSetupMissing(true);
    setNotice(accept ? `${f.name} est maintenant votre ami.` : `Demande de ${f.name} refusee.`);
    refresh();
  }

  async function drop(f: Friend) {
    sfx("click");
    const res = await removeFriend(identity.id, f.id);
    if (res.setupMissing) return setSetupMissing(true);
    setNotice(`${f.name} retire de vos amis.`);
    refresh();
  }

  function invite(f: Friend) {
    const code = generateCode(4);
    lobbyRef.current?.challenge(f.id, code, "duel");
    setNotice(`Invitation envoyee a ${f.name}...`);
    onInviteGame(code, "host", name.trim() || "Hote");
  }

  function acceptInvite() {
    if (!incoming) return;
    const c = incoming;
    setIncoming(null);
    onInviteGame(c.code, "guest", name.trim() || "Invite");
  }

  function declineInvite() {
    if (incoming) lobbyRef.current?.decline(incoming.fromId);
    setIncoming(null);
  }

  function copyCode() {
    if (!snap.myCode) return;
    const done = () => setNotice("Code ami copie.");
    try {
      const p = navigator.clipboard?.writeText(snap.myCode);
      if (p && typeof p.then === "function") p.then(done, () => setNotice(snap.myCode));
      else setNotice(snap.myCode);
    } catch {
      setNotice(snap.myCode);
    }
  }

  if (!configured) {
    return (
      <div className="panel stack">
        <h2>Amis</h2>
        <p className="subtitle">Le mode en ligne n'est pas configure sur cette installation.</p>
        <button className="btn btn-ghost" onClick={onBack}>
          Retour au menu
        </button>
      </div>
    );
  }

  return (
    <div className="panel stack friends-screen">
      <h2>Amis</h2>
      <p className="subtitle">
        Ajoutez des amis, voyez qui est connecte et invitez-les en un clic pour un duel.
      </p>

      {incoming && (
        <div className="challenge-toast">
          <span>
            <strong>{incoming.fromName}</strong> vous invite a jouer !
          </span>
          <span className="row">
            <button className="btn btn-primary" onClick={acceptInvite}>
              Accepter
            </button>
            <button className="btn btn-ghost" onClick={declineInvite}>
              Refuser
            </button>
          </span>
        </div>
      )}
      {notice && <p className="pill">{notice}</p>}

      {setupMissing && (
        <div className="friends-setup-note">
          <strong>Base amis non installee.</strong>
          <span>
            Lance le script <code>supabase/friends_setup.sql</code> dans Supabase &rarr; SQL Editor,
            puis reviens ici.
          </span>
        </div>
      )}

      <label className="online-field">
        <span>Votre pseudo</span>
        <input
          className="select"
          maxLength={16}
          value={name}
          placeholder="Amiral"
          onChange={(e) => saveName(e.target.value)}
        />
      </label>

      <div className="friend-code-box">
        <div>
          <span className="friend-code-lbl">Votre code ami</span>
          <span className="friend-code-val">{snap.myCode || "..."}</span>
        </div>
        <button className="btn btn-sm" onClick={copyCode} disabled={!snap.myCode}>
          Copier
        </button>
      </div>

      <div className="friend-add-row">
        <input
          className="select"
          placeholder="CODE AMI"
          maxLength={6}
          value={addCode}
          onChange={(e) => setAddCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && doAddByCode()}
        />
        <button
          className="btn btn-primary"
          disabled={addCode.trim().length < 4 || busy}
          onClick={doAddByCode}
        >
          Envoyer la demande
        </button>
      </div>

      {snap.incoming.length > 0 && (
        <div className="friend-section">
          <h3 className="diff-heading">Demandes recues ({snap.incoming.length})</h3>
          {snap.incoming.map((f) => (
            <div key={f.friendshipId} className="friend-row req">
              <span className="friend-name">{f.name}</span>
              <span className="row">
                <button className="btn btn-primary btn-sm" onClick={() => respond(f, true)}>
                  Accepter
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => respond(f, false)}>
                  Refuser
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="friend-section">
        <h3 className="diff-heading">Mes amis ({snap.friends.length})</h3>
        {snap.friends.length === 0 && (
          <p className="lobby-empty">Aucun ami pour l'instant. Partagez votre code !</p>
        )}
        {snap.friends.map((f) => {
          const online = onlineIds.has(f.id);
          return (
            <div key={f.friendshipId} className={`friend-row${online ? " is-online" : ""}`}>
              <span className={`friend-dot${online ? " online" : ""}`} />
              <span className="friend-name">{f.name}</span>
              <span className="friend-status">{online ? "en ligne" : "hors ligne"}</span>
              <span className="row">
                <button
                  className="btn btn-primary btn-sm"
                  disabled={!online}
                  onClick={() => invite(f)}
                >
                  Inviter
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => drop(f)}>
                  Retirer
                </button>
              </span>
            </div>
          );
        })}
      </div>

      {snap.outgoing.length > 0 && (
        <div className="friend-section">
          <h3 className="diff-heading">Demandes envoyees ({snap.outgoing.length})</h3>
          {snap.outgoing.map((f) => (
            <div key={f.friendshipId} className="friend-row pending">
              <span className="friend-name">{f.name}</span>
              <span className="friend-status">en attente</span>
              <button className="btn btn-ghost btn-sm" onClick={() => drop(f)}>
                Annuler
              </button>
            </div>
          ))}
        </div>
      )}

      {liveGames.length > 0 && (
        <div className="friend-section">
          <LiveGamesList
            games={liveGames}
            friendNames={new Set(snap.friends.map((f) => f.name))}
            onSpectate={onSpectate}
          />
        </div>
      )}

      <button className="btn btn-ghost" onClick={onBack}>
        Retour au menu
      </button>
    </div>
  );
}
