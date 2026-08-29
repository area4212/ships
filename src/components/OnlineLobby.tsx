import React, { useEffect, useRef, useState } from "react";
import { NetRole, generateCode, normalizeCode } from "../net/room";
import { isOnlineConfigured } from "../net/supabase";
import { Challenge, Lobby, LobbyMode, LobbyPlayer } from "../net/lobby";
import { getIdentity, setIdentityName } from "../net/identity";
import { getSocial, sendFriendRequest } from "../net/social";
import { LiveGame, LiveGames } from "../net/live";
import { LiveGamesList } from "./LiveGamesList";
import { useApp } from "../context/AppContext";

export type OnlineMap = { boardSize: number; obstacles: "aucun" | "peu" | "beaucoup" };

interface OnlineLobbyProps {
  onStart: (code: string, role: NetRole, name: string, mode: LobbyMode, map: OnlineMap) => void;
  onOpenFriends: () => void;
  onSpectate: (code: string) => void;
  onBack: () => void;
}

const SIZES = [8, 10, 12];
const OBS: { id: OnlineMap["obstacles"]; label: string }[] = [
  { id: "aucun", label: "Aucun" },
  { id: "peu", label: "Quelques-uns" },
  { id: "beaucoup", label: "Beaucoup" },
];

export function OnlineLobby({ onStart, onOpenFriends, onSpectate, onBack }: OnlineLobbyProps) {
  const identity = getIdentity();
  const [name, setName] = useState<string>(identity.name);
  const { settings } = useApp();
  const [mode, setMode] = useState<LobbyMode>("duel");
  const [joinCode, setJoinCode] = useState("");
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [incoming, setIncoming] = useState<Challenge | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [pendingAdd, setPendingAdd] = useState<Set<string>>(new Set());
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);

  const [boardSize, setBoardSize] = useState<number>(settings.boardSize);
  const [obstacles, setObstacles] = useState<OnlineMap["obstacles"]>(settings.obstacles);

  const lobbyRef = useRef<Lobby | null>(null);
  const configured = isOnlineConfigured();
  const map: OnlineMap = { boardSize, obstacles };

  useEffect(() => {
    if (!configured) return;
    getSocial(identity.id).then((r) => {
      if (r.data) setFriendIds(new Set(r.data.friends.map((f) => f.id)));
    });
  }, [configured, identity.id]);

  useEffect(() => {
    if (!configured) return;
    const live = new LiveGames(setLiveGames);
    live.connect();
    return () => {
      live.leave();
    };
  }, [configured]);

  useEffect(() => {
    if (!configured) return;
    const lobby = new Lobby(identity.id, name || "Joueur", {
      onPlayers: setPlayers,
      onChallenge: (c) => setIncoming(c),
      onDeclined: (who) => setNotice(`${who} a decline le defi.`),
    });
    lobbyRef.current = lobby;
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (!cancelled) lobby.connect();
    }, 60);
    return () => {
      cancelled = true;
      clearTimeout(t);
      lobby.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  function remember(n: string) {
    setName(n);
    setIdentityName(n);
    lobbyRef.current?.setBusy(false); // re-track with new name
  }

  async function addFriend(p: LobbyPlayer) {
    setPendingAdd((s) => new Set(s).add(p.id));
    const res = await sendFriendRequest(identity.id, name || "Joueur", { toId: p.id });
    if (res.setupMissing) {
      setNotice("Systeme d'amis non installe (voir l'ecran Amis).");
      return;
    }
    if (res.data?.ok && res.data.reason === "accepte") {
      setFriendIds((s) => new Set(s).add(p.id));
      setNotice(`${p.name} est maintenant votre ami.`);
    } else {
      setNotice(`Demande d'ami envoyee a ${p.name}.`);
    }
  }

  function challengePlayer(p: LobbyPlayer) {
    const code = generateCode(4);
    lobbyRef.current?.challenge(p.id, code, mode);
    setNotice(`Defi envoye a ${p.name}...`);
    onStart(code, "host", name.trim() || "Hote", mode, map);
  }

  function acceptChallenge() {
    if (!incoming) return;
    const c = incoming;
    setIncoming(null);
    onStart(c.code, "guest", name.trim() || "Invite", c.mode, map);
  }

  function randomizeMap() {
    setBoardSize(SIZES[Math.floor(Math.random() * SIZES.length)]);
    setObstacles(OBS[Math.floor(Math.random() * OBS.length)].id);
  }

  function declineChallenge() {
    if (incoming) lobbyRef.current?.decline(incoming.fromId);
    setIncoming(null);
  }

  if (!configured) {
    return (
      <div className="panel stack">
        <h2>Jouer en ligne</h2>
        <p className="subtitle">Le mode en ligne n'est pas configure sur cette installation.</p>
        <pre className="online-env">
{`VITE_SUPABASE_URL=https://TON-PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...`}
        </pre>
        <p style={{ fontSize: 14 }}>
          Ajoute un fichier <code>.env</code> a la racine (valeurs dans Supabase &rarr; Project
          Settings &rarr; API) puis relance <code>npm run dev</code>.
        </p>
        <button className="btn btn-ghost" onClick={onBack}>
          Retour au menu
        </button>
      </div>
    );
  }

  const code = normalizeCode(joinCode);
  const free = players.filter((p) => !p.busy);

  return (
    <div className="panel stack">
      <div className="online-head">
        <h2>Jouer en ligne</h2>
        <button className="btn btn-sm" onClick={onOpenFriends}>
          🤝 Mes amis
        </button>
      </div>
      <p className="subtitle">
        Defie un joueur connecte, ou cree un salon et partage le code.
      </p>

      {incoming && (
        <div className="challenge-toast">
          <span>
            <strong>{incoming.fromName}</strong> vous defie ({incoming.mode === "chaos" ? "Chaos" : "Duel"}) !
          </span>
          <span className="row">
            <button className="btn btn-primary" onClick={acceptChallenge}>
              Accepter
            </button>
            <button className="btn btn-ghost" onClick={declineChallenge}>
              Refuser
            </button>
          </span>
        </div>
      )}
      {notice && <p className="pill">{notice}</p>}

      <label className="online-field">
        <span>Votre pseudo</span>
        <input
          className="select"
          maxLength={16}
          value={name}
          placeholder="Amiral"
          onChange={(e) => remember(e.target.value)}
        />
      </label>

      <div className="mode-switch">
        <button
          className={`mode-opt${mode === "duel" ? " on" : ""}`}
          onClick={() => setMode("duel")}
        >
          Duel 1v1 <small>pouvoirs + obstacles</small>
        </button>
        <button
          className={`mode-opt${mode === "chaos" ? " on" : ""}`}
          onClick={() => setMode("chaos")}
        >
          Chaos 2-4 <small>chacun pour soi</small>
        </button>
      </div>

      <div className="map-setup">
        <div className="map-setup-head">
          <h3 className="diff-heading">Carte (si vous creez / defiez)</h3>
          <button className="btn map-random" onClick={randomizeMap}>
            🎲 Aleatoire
          </button>
        </div>
        <div className="map-row">
          <span className="map-label">Grille</span>
          <div className="map-chips">
            {SIZES.map((s) => (
              <button
                key={s}
                className={`map-chip${boardSize === s ? " on" : ""}`}
                onClick={() => setBoardSize(s)}
              >
                {s}x{s}
              </button>
            ))}
          </div>
        </div>
        <div className="map-row">
          <span className="map-label">Obstacles</span>
          <div className="map-chips">
            {OBS.map((o) => (
              <button
                key={o.id}
                className={`map-chip${obstacles === o.id ? " on" : ""}`}
                onClick={() => setObstacles(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lobby-players">
        <div className="lobby-players-head">Joueurs en ligne ({players.length})</div>
        {players.length === 0 && <div className="lobby-empty">Personne d'autre pour l'instant...</div>}
        {players.map((p) => {
          const known = friendIds.has(p.id) || pendingAdd.has(p.id);
          return (
            <div key={p.id} className={`lobby-player${p.busy ? " busy" : ""}`}>
              <span className="lobby-dot" />
              <span className="lobby-name">{p.name}</span>
              <span className="lobby-status">{p.busy ? "en partie" : "libre"}</span>
              {!known && (
                <button className="btn btn-ghost btn-sm" onClick={() => addFriend(p)}>
                  + Ami
                </button>
              )}
              <button
                className="btn btn-primary btn-sm"
                disabled={p.busy}
                onClick={() => challengePlayer(p)}
              >
                Defier
              </button>
            </div>
          );
        })}
        {free.length > 0 && mode === "chaos" && (
          <p className="lobby-hint">
            Pour un Chaos a 3-4, cree un salon et partage le code : chacun rejoint avec le meme code.
          </p>
        )}
      </div>

      {liveGames.length > 0 && <LiveGamesList games={liveGames} onSpectate={onSpectate} />}

      <div className="online-actions">
        <div className="online-card">
          <h3>Creer un salon</h3>
          <p>Genere un code a partager. Mode : {mode === "chaos" ? "Chaos 2-4" : "Duel 1v1"}.</p>
          <button
            className="btn btn-primary btn-block"
            onClick={() => onStart(generateCode(4), "host", name.trim() || "Hote", mode, map)}
          >
            Creer
          </button>
        </div>
        <div className="online-card">
          <h3>Rejoindre un salon</h3>
          <input
            className="select online-code-input"
            placeholder="CODE"
            value={joinCode}
            maxLength={6}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button
            className="btn btn-primary btn-block"
            disabled={code.length < 4}
            onClick={() => onStart(code, "guest", name.trim() || "Invite", mode, map)}
          >
            Rejoindre ({mode === "chaos" ? "Chaos" : "Duel"})
          </button>
        </div>
      </div>

      <button className="btn btn-ghost" onClick={onBack}>
        Retour au menu
      </button>
    </div>
  );
}
