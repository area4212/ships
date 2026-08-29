import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { generateObstacles } from "../game/board";
import { getFleetForSize } from "../game/fleet";
import { upgradeLevel } from "../game/progression";
import { BoardState } from "../types/game";
import { NetEvent, NetRole, Room } from "../net/room";
import {
  HostState,
  OnlineAction,
  OnlineConfig,
  SeatView,
  SpectatorView,
  createHostState,
  resolveAction,
  spectatorView,
  viewFor,
} from "../game/online";
import { ShipPlacement } from "./ShipPlacement";
import { OnlineBattleView } from "./OnlineBattleView";
import { SpectatorBattleView } from "./SpectatorBattleView";
import { ChatPanel, ChatMsg } from "./ChatPanel";
import { emoteById } from "../game/emotes";
import { LiveGames } from "../net/live";

interface OnlineGameProps {
  code: string;
  role: NetRole;
  name: string;
  map?: { boardSize: number; obstacles: "aucun" | "peu" | "beaucoup" };
  onExit: () => void;
}

type Phase = "connecting" | "waiting" | "config-wait" | "placing" | "battle" | "ended" | "error";

export function OnlineGame({ code, role, name, map, onExit }: OnlineGameProps) {
  const { settings, stats, sfx, recordShot, recordGameEnd } = useApp();
  const roomRef = useRef<Room | null>(null);
  const hostStateRef = useRef<HostState | null>(null);
  const prevTrackRef = useRef<string[][] | null>(null);
  const endRecordedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("connecting");
  const [peerName, setPeerName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cfg, setCfg] = useState<OnlineConfig | null>(null);
  const [view, setView] = useState<SeatView | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [peerEmote, setPeerEmote] = useState<{ id: string; ts: number } | null>(null);
  const [specView, setSpecView] = useState<SpectatorView | null>(null);
  const liveRef = useRef<LiveGames | null>(null);

  const pushChat = (m: ChatMsg) => setChat((c) => [...c, m].slice(-50));

  const myBoardRef = useRef<BoardState | null>(null);
  const guestBoardRef = useRef<BoardState | null>(null);
  const iPlacedRef = useRef(false);
  const peerPlacedRef = useRef(false);
  const cfgRef = useRef<OnlineConfig | null>(null);

  const isHost = role === "host";
  const isSpectator = role === "spectator";

  function applyCfg(c: OnlineConfig) {
    cfgRef.current = c;
    setCfg(c);
  }

  function buildConfig(): OnlineConfig {
    const up = (id: Parameters<typeof upgradeLevel>[1]) =>
      settings.powersOn ? upgradeLevel(stats.upgrades, id) : 0;
    const size = map?.boardSize ?? settings.boardSize;
    const obs = map?.obstacles ?? settings.obstacles;
    return {
      boardSize: size,
      obstacles: obs === "aucun" ? [] : generateObstacles(size, obs),
      fireAgainOnHit: settings.fireAgainOnHit,
      energyStart: settings.powersOn ? 3 + up("reacteur") * 2 : 0,
      energyPerTurn: 1 + up("generateur"),
      powerDiscount: up("optimisation"),
      mineLimit: 1 + up("champMines"),
      scoutStart: up("eclaireur") * 2,
      repairStart: up("chantier"),
    };
  }

  function sendConfig() {
    if (!isHost) return;
    const c = cfgRef.current ?? buildConfig();
    applyCfg(c);
    roomRef.current?.send("config", c);
    setPhase((p) => (p === "battle" || p === "ended" ? p : "placing"));
  }

  // ---- host: push both views (+ the spectator feed) ----
  function pushViews(hs: HostState) {
    hostStateRef.current = hs;
    setView(viewFor(hs, "host"));
    roomRef.current?.send("resolution", viewFor(hs, "guest"));
    roomRef.current?.send(
      "spectate",
      spectatorView(hs, { host: name, guest: peerName ?? "Invite" })
    );
    setPhase(hs.phase === "over" ? "ended" : "battle");
  }

  function tryStartBattle() {
    if (!isHost || hostStateRef.current) return;
    if (!iPlacedRef.current || !peerPlacedRef.current) return;
    const c = cfgRef.current;
    if (!c || !myBoardRef.current || !guestBoardRef.current) return;
    const first: "host" | "guest" = Math.random() < 0.5 ? "host" : "guest";
    pushViews(createHostState(c, myBoardRef.current, guestBoardRef.current, first));
  }

  function handleMessage(event: NetEvent, data: any) {
    // ---- spectator: only cares about the feed + chat ----
    if (isSpectator) {
      if (event === "spectate") {
        const v = data as SpectatorView;
        setSpecView(v);
        setPhase(v.phase === "over" ? "ended" : "battle");
      } else if (event === "chat") {
        pushChat({ from: data?.name || "Joueur", text: String(data?.text ?? "") });
      } else if (event === "emote") {
        const em = emoteById(data?.id);
        if (em) pushChat({ from: data?.name || "Joueur", text: em.glyph, kind: "emote" });
      } else if (event === "bye") {
        setError("La partie est terminee (hote deconnecte).");
        setPhase("error");
      }
      return;
    }

    if (event === "hello" && isHost && data?.spectator) {
      // a spectator joined — hand them the current state immediately
      const hs = hostStateRef.current;
      if (hs) {
        roomRef.current?.send(
          "spectate",
          spectatorView(hs, { host: name, guest: peerName ?? "Invite" })
        );
      }
      return;
    }
    if (event === "hello" && isHost) {
      setPeerName(data?.name ?? "Invite");
      sendConfig();
    } else if (event === "config" && !isHost) {
      applyCfg(data as OnlineConfig);
      setPhase((p) => (p === "battle" || p === "ended" ? p : "placing"));
    } else if (event === "placed") {
      peerPlacedRef.current = true;
      if (isHost && data?.board) {
        guestBoardRef.current = data.board as BoardState;
        tryStartBattle();
      }
    } else if (event === "action" && isHost) {
      const hs = hostStateRef.current;
      if (hs) pushViews(resolveAction(hs, "guest", data as OnlineAction));
    } else if (event === "resolution" && !isHost) {
      const v = data as SeatView;
      setView(v);
      setPhase(v.phase === "over" ? "ended" : "battle");
    } else if (event === "rematch" && !isHost) {
      peerPlacedRef.current = false;
      iPlacedRef.current = false;
      myBoardRef.current = null;
      setView(null);
      setPhase("placing");
    } else if (event === "chat") {
      pushChat({ from: data?.name || peerName || "Adversaire", text: String(data?.text ?? "") });
    } else if (event === "emote") {
      const em = emoteById(data?.id);
      if (em) {
        setPeerEmote({ id: em.id, ts: Date.now() });
        pushChat({ from: data?.name || peerName || "Adversaire", text: em.glyph, kind: "emote" });
      }
    } else if (event === "bye") {
      setPhase((p) => {
        if (p === "battle" || p === "ended") {
          setError("L'autre joueur a quitte la partie.");
          return "error";
        }
        return "waiting";
      });
    }
  }

  function sendChat(text: string) {
    roomRef.current?.send("chat", { name, text });
    pushChat({ from: "Vous", text, mine: true });
  }

  function sendEmote(id: string) {
    const em = emoteById(id);
    if (!em) return;
    roomRef.current?.send("emote", { id, name });
    pushChat({ from: "Vous", text: em.glyph, kind: "emote", mine: true });
  }

  function handlePeerLeave() {
    setPeerName(null);
    setPhase((p) => {
      if (p === "battle" || p === "ended") {
        setError("L'autre joueur a quitte la partie.");
        return "error";
      }
      return "waiting";
    });
  }

  // Keep the live handlers reachable from the (once-created) Room callbacks.
  const cb = useRef({ handleMessage, handlePeerLeave, sendConfig, isHost, isSpectator, name });
  useEffect(() => {
    cb.current = { handleMessage, handlePeerLeave, sendConfig, isHost, isSpectator, name };
  });

  // ---- connect (once) ----
  useEffect(() => {
    const room = new Room(code, name, role, {
      onOpen: () => {
        setPhase((p) => (p === "connecting" ? "waiting" : p));
        if (cb.current.isSpectator) room.send("hello", { name: cb.current.name, spectator: true });
        else if (!cb.current.isHost) room.send("hello", { name: cb.current.name });
      },
      onPeerJoin: (n) => {
        if (cb.current.isSpectator) return;
        setPeerName(n);
        sfx("click");
        if (cb.current.isHost) cb.current.sendConfig();
      },
      onPeerLeave: () => cb.current.handlePeerLeave(),
      onError: (msg) => {
        setError(msg);
        setPhase("error");
      },
      onMessage: (event, data) => cb.current.handleMessage(event, data),
    });
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      roomRef.current = room;
      room.connect();
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(t);
      room.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePlacementConfirm(board: BoardState) {
    myBoardRef.current = board;
    iPlacedRef.current = true;
    roomRef.current?.send("placed", isHost ? { placed: true } : { board });
    if (isHost) {
      tryStartBattle();
      if (!peerPlacedRef.current) setPhase("battle"); // will show "waiting for opponent" via view=null
    } else {
      setPhase("battle");
    }
  }

  function sendAction(a: OnlineAction) {
    if (isHost) {
      const hs = hostStateRef.current;
      if (hs) pushViews(resolveAction(hs, "host", a));
    } else {
      roomRef.current?.send("action", a);
    }
  }

  function requestRematch() {
    if (!isHost) return;
    const c = buildConfig();
    applyCfg(c);
    iPlacedRef.current = false;
    peerPlacedRef.current = false;
    myBoardRef.current = null;
    guestBoardRef.current = null;
    hostStateRef.current = null;
    setView(null);
    roomRef.current?.send("rematch", {});
    roomRef.current?.send("config", c);
    prevTrackRef.current = null;
    endRecordedRef.current = false;
    setPhase("placing");
  }

  // ---- feed the real-time stats from each new view ----
  useEffect(() => {
    if (!view) return;
    const cur = view.tracking.map((row) => row.map((c) => c.visual as string));
    const prev = prevTrackRef.current;
    if (prev) {
      for (let r = 0; r < cur.length; r++) {
        for (let c = 0; c < cur[r].length; c++) {
          const was = prev[r]?.[c];
          const now = cur[r][c];
          if (was === now) continue;
          const wasResolved = was === "hit" || was === "sunk" || was === "miss";
          if ((now === "hit" || now === "sunk") && !(was === "hit" || was === "sunk")) {
            recordShot(true);
          } else if (now === "miss" && !wasResolved) {
            recordShot(false);
          }
        }
      }
    }
    prevTrackRef.current = cur;

    if ((phase === "ended" || view.phase === "over") && !endRecordedRef.current) {
      endRecordedRef.current = true;
      recordGameEnd(view.result === "win");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, phase]);

  // ---- advertise this battle so others can spectate it ----
  useEffect(() => {
    if (isSpectator || phase !== "battle" || !peerName) return;
    const live = new LiveGames(() => {}, { code, me: name, vs: peerName, host: isHost });
    liveRef.current = live;
    live.connect();
    return () => {
      live.leave();
      liveRef.current = null;
    };
  }, [isSpectator, phase, code, name, peerName, isHost]);

  const fleet = useMemo(() => (cfg ? getFleetForSize(cfg.boardSize) : []), [cfg]);

  // ---- render ----
  const chatUi = phase === "error" ? null : <ChatPanel log={chat} onSend={sendChat} />;

  if (phase === "error") {
    return (
      <div className="panel stack center">
        <h2>{isSpectator ? "Direct termine" : "Partie en ligne"}</h2>
        <p className="subtitle">{error}</p>
        <button className="btn btn-primary" onClick={onExit}>
          Retour au menu
        </button>
      </div>
    );
  }

  if (isSpectator) {
    if (!specView) {
      return (
        <>
          <div className="panel stack center">
            <h2>👁 Spectateur</h2>
            <p className="subtitle">Connexion au flux de la partie…</p>
            <div className="online-spinner" aria-hidden="true" />
            <button className="btn btn-ghost" onClick={onExit}>
              Quitter
            </button>
          </div>
          {chatUi}
        </>
      );
    }
    return (
      <>
        <SpectatorBattleView view={specView} onExit={onExit} />
        {chatUi}
      </>
    );
  }

  if (phase === "connecting" || phase === "waiting" || phase === "config-wait") {
    return (
      <>
      <div className="panel stack center">
        <h2>Salon en ligne</h2>
        <div className="online-code-box">
          <span className="online-code-label">Code d'equipe</span>
          <span className="online-code">{code}</span>
        </div>
        <p className="subtitle">
          {phase === "connecting"
            ? "Connexion au serveur..."
            : peerName
            ? `${peerName} a rejoint. Preparation...`
            : isHost
            ? "Transmettez ce code a votre adversaire et attendez qu'il rejoigne."
            : "En attente de l'hote..."}
        </p>
        <div className="online-spinner" aria-hidden="true" />
        <button className="btn btn-ghost" onClick={onExit}>
          Annuler
        </button>
      </div>
      {chatUi}
      </>
    );
  }

  if (phase === "placing") {
    return (
      <>
      <ShipPlacement
        boardSize={cfg?.boardSize ?? settings.boardSize}
        fleet={fleet.length ? fleet : getFleetForSize(settings.boardSize)}
        noTouchRule={settings.noTouchRule}
        blocked={cfg?.obstacles ?? []}
        title="Partie en ligne - Placez votre flotte"
        subtitle={peerName ? `Adversaire : ${peerName}` : "En ligne"}
        onConfirm={handlePlacementConfirm}
        onBack={onExit}
      />
      {chatUi}
      </>
    );
  }

  // battle / ended
  if (!view) {
    return (
      <>
      <div className="panel stack center">
        <h2>En ligne</h2>
        <p className="subtitle">En attente de l'adversaire pour demarrer la bataille...</p>
        <div className="online-spinner" aria-hidden="true" />
        <button className="btn btn-ghost" onClick={onExit}>
          Quitter
        </button>
      </div>
      {chatUi}
      </>
    );
  }

  return (
    <>
    <OnlineBattleView
      view={view}
      cfg={cfg!}
      peerName={peerName ?? "Adversaire"}
      ended={phase === "ended"}
      canRematch={isHost}
      peerEmote={peerEmote}
      onEmote={sendEmote}
      onAction={sendAction}
      onRematch={requestRematch}
      onExit={onExit}
    />
    {chatUi}
    </>
  );
}
