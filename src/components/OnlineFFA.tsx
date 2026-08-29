import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { generateObstacles } from "../game/board";
import { getFleetForSize } from "../game/fleet";
import { BoardState } from "../types/game";
import { NetEvent, Room, RoomMember } from "../net/room";
import {
  FFAAction,
  FFAConfig,
  FFAState,
  FFAView,
  FSeat,
  createFFAState,
  ffaResolve,
  ffaViewFor,
} from "../game/onlineFFA";
import { AnchorIcon } from "../assets/icons";
import { CellData, Grid } from "./Grid";
import { ShipPlacement } from "./ShipPlacement";
import { ChatPanel, ChatMsg } from "./ChatPanel";
import { EmoteBar, FloatingEmote } from "./EmoteBar";
import { emoteById } from "../game/emotes";

interface Props {
  code: string;
  name: string;
  map?: { boardSize: number; obstacles: "aucun" | "peu" | "beaucoup" };
  onExit: () => void;
}

type Phase = "connecting" | "lobby" | "placing" | "battle" | "ended" | "error";
const MAX_PLAYERS = 4;

export function OnlineFFA({ code, name, map, onExit }: Props) {
  const { settings, sfx, recordShot, recordGameEnd } = useApp();

  const roomRef = useRef<Room | null>(null);
  const stateRef = useRef<FFAState | null>(null);
  const cfgRef = useRef<FFAConfig | null>(null);
  const myBoardRef = useRef<BoardState | null>(null);
  const boardsRef = useRef<Record<FSeat, BoardState>>({});
  const selfKeyRef = useRef<string>("");
  const membersRef = useRef<RoomMember[]>([]);
  const endRecordedRef = useRef(false);
  const prevTrackRef = useRef<Record<string, string[][]>>({});
  const dropTimerRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>("connecting");
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [cfg, setCfg] = useState<FFAConfig | null>(null);
  const [view, setView] = useState<FFAView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<FSeat | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [emoteBurst, setEmoteBurst] = useState<{ id: string; ts: number; from: string } | null>(null);

  const pushChat = (m: ChatMsg) => setChat((c) => [...c, m].slice(-50));

  const isHost = () => membersRef.current[0]?.key === selfKeyRef.current;

  function pushViews(st: FFAState) {
    stateRef.current = st;
    setView(ffaViewFor(st, selfKeyRef.current));
    const bySeat: Record<string, FFAView> = {};
    for (const seat of st.cfg.seats) {
      if (seat !== selfKeyRef.current) bySeat[seat] = ffaViewFor(st, seat);
    }
    roomRef.current?.send("resolution", { bySeat });
    if (st.phase === "over") setPhase("ended");
  }

  function maybeStart() {
    if (!isHost() || stateRef.current) return;
    const cf = cfgRef.current;
    if (!cf) return;
    if (!cf.seats.every((s) => boardsRef.current[s])) return;
    pushViews(createFFAState(cf, boardsRef.current));
    setPhase("battle");
  }

  function hostBeginMatch() {
    if (!isHost()) return;
    const seats = membersRef.current.map((m) => m.key);
    if (seats.length < 2) return;
    const names: Record<FSeat, string> = {};
    membersRef.current.forEach((m) => (names[m.key] = m.name));
    const size = map?.boardSize ?? settings.boardSize;
    const obs = map?.obstacles ?? settings.obstacles;
    const cf: FFAConfig = {
      boardSize: size,
      obstacles: obs === "aucun" ? [] : generateObstacles(size, obs),
      fireAgainOnHit: settings.fireAgainOnHit,
      seats,
      names,
    };
    cfgRef.current = cf;
    setCfg(cf);
    boardsRef.current = {};
    roomRef.current?.send("config", cf);
    setPhase("placing");
  }

  function handleMessage(event: NetEvent, data: any) {
    if (event === "config") {
      cfgRef.current = data as FFAConfig;
      setCfg(data as FFAConfig);
      boardsRef.current = {};
      myBoardRef.current = null;
      endRecordedRef.current = false;
      prevTrackRef.current = {};
      setView(null);
      setPhase("placing");
    } else if (event === "placed") {
      const seat = data?.seat as FSeat;
      if (isHost() && seat && data?.board) {
        boardsRef.current[seat] = data.board as BoardState;
        maybeStart();
      }
    } else if (event === "action") {
      if (isHost() && stateRef.current) {
        const seat = data?.seat as FSeat;
        pushViews(ffaResolve(stateRef.current, seat, data.action as FFAAction));
      }
    } else if (event === "resolution") {
      const v = (data?.bySeat ?? {})[selfKeyRef.current] as FFAView | undefined;
      if (v) {
        setView(v);
        setPhase(v.phase === "over" ? "ended" : "battle");
      }
    } else if (event === "rematch") {
      myBoardRef.current = null;
      endRecordedRef.current = false;
      setView(null);
      setPhase("lobby");
    } else if (event === "chat") {
      pushChat({ from: data?.name || "Joueur", text: String(data?.text ?? "") });
    } else if (event === "emote") {
      const em = emoteById(data?.id);
      if (em) {
        setEmoteBurst({ id: em.id, ts: Date.now(), from: data?.name || "Joueur" });
        pushChat({ from: data?.name || "Joueur", text: em.glyph, kind: "emote" });
      }
    } else if (event === "bye") {
      // handled via presence
    }
  }

  function sendChat(text: string) {
    roomRef.current?.send("chat", { seat: selfKeyRef.current, name, text });
    pushChat({ from: "Vous", text, mine: true });
  }

  function sendEmote(id: string) {
    const em = emoteById(id);
    if (!em) return;
    roomRef.current?.send("emote", { seat: selfKeyRef.current, id, name });
    setEmoteBurst({ id: em.id, ts: Date.now(), from: name || "Vous" });
    pushChat({ from: "Vous", text: em.glyph, kind: "emote", mine: true });
  }

  const cb = useRef({ handleMessage, isHost, maybeStart });
  useEffect(() => {
    cb.current = { handleMessage, isHost, maybeStart };
  });

  useEffect(() => {
    const room = new Room(code, name, "host", {
      onOpen: () => setPhase((p) => (p === "connecting" ? "lobby" : p)),
      onMembers: (m, selfKey) => {
        selfKeyRef.current = selfKey;
        membersRef.current = m;
        setMembers(m);
        // A player vanished mid-game -> eliminate them, but wait out presence
        // flicker (reconnects) first.
        const st = stateRef.current;
        if (st && cb.current.isHost() && st.phase === "playing") {
          if (dropTimerRef.current) clearTimeout(dropTimerRef.current);
          dropTimerRef.current = window.setTimeout(() => {
            const cur = stateRef.current;
            if (!cur || cur.phase !== "playing") return;
            const present = new Set(membersRef.current.map((x) => x.key));
            const alive = { ...cur.alive };
            let changed = false;
            for (const seat of cur.cfg.seats) {
              if (alive[seat] && !present.has(seat)) {
                alive[seat] = false;
                changed = true;
              }
            }
            if (!changed) return;
            const remaining = cur.cfg.seats.filter((s) => alive[s]);
            pushViews({
              ...cur,
              alive,
              phase: remaining.length <= 1 ? "over" : cur.phase,
              winner: remaining.length <= 1 ? remaining[0] ?? cur.winner : cur.winner,
              turn: alive[cur.turn] ? cur.turn : remaining[0] ?? cur.turn,
              log: ["Un joueur a quitte la partie.", ...cur.log].slice(0, 40),
            });
          }, 3500);
        }
      },
      onError: (msg) => {
        setError(msg);
        setPhase("error");
      },
      onMessage: (e, d) => cb.current.handleMessage(e, d),
    });
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (!cancelled) {
        roomRef.current = room;
        room.connect();
      }
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(t);
      if (dropTimerRef.current) clearTimeout(dropTimerRef.current);
      room.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePlacementConfirm(board: BoardState) {
    myBoardRef.current = board;
    if (isHost()) {
      boardsRef.current[selfKeyRef.current] = board;
      maybeStart();
      if (!stateRef.current) setPhase("battle");
    } else {
      roomRef.current?.send("placed", { seat: selfKeyRef.current, board });
      setPhase("battle");
    }
  }

  function fire(seat: FSeat, r: number, c: number) {
    if (!view?.yourTurn) return;
    const action: FFAAction = { target: seat, r, c };
    sfx("fire");
    if (isHost() && stateRef.current) {
      pushViews(ffaResolve(stateRef.current, selfKeyRef.current, action));
    } else {
      roomRef.current?.send("action", { seat: selfKeyRef.current, action });
    }
  }

  function rematch() {
    if (!isHost()) return;
    hostBeginMatchReset();
  }
  function hostBeginMatchReset() {
    stateRef.current = null;
    roomRef.current?.send("rematch", {});
    hostBeginMatch();
  }

  // stats
  useEffect(() => {
    if (!view) return;
    for (const opp of view.opponents) {
      const prev = prevTrackRef.current[opp.seatId];
      const cur = opp.tracking.map((row) => row.map((x) => x.visual as string));
      if (prev) {
        for (let r = 0; r < cur.length; r++)
          for (let c = 0; c < cur[r].length; c++) {
            const was = prev[r]?.[c];
            const now = cur[r][c];
            if (was === now) continue;
            if ((now === "hit" || now === "sunk") && !(was === "hit" || was === "sunk")) recordShot(true);
            else if (now === "miss" && !(was === "miss" || was === "hit" || was === "sunk")) recordShot(false);
          }
      }
      prevTrackRef.current[opp.seatId] = cur;
    }
    if ((phase === "ended" || view.phase === "over") && !endRecordedRef.current) {
      endRecordedRef.current = true;
      recordGameEnd(view.result === "win");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, phase]);

  const fleet = useMemo(
    () => (cfg ? getFleetForSize(cfg.boardSize) : getFleetForSize(settings.boardSize)),
    [cfg, settings.boardSize]
  );

  // ---- render ----
  const chatUi = phase === "error" ? null : <ChatPanel log={chat} onSend={sendChat} />;

  if (phase === "error") {
    return (
      <div className="panel stack center">
        <h2>Chaos en ligne</h2>
        <p className="subtitle">{error}</p>
        <button className="btn btn-primary" onClick={onExit}>
          Retour au menu
        </button>
      </div>
    );
  }

  if (phase === "connecting" || phase === "lobby") {
    const host = members[0]?.key === selfKeyRef.current;
    return (
      <>
      <div className="panel stack center">
        <h2>Salon Chaos</h2>
        <div className="online-code-box">
          <span className="online-code-label">Code d'equipe</span>
          <span className="online-code">{code}</span>
        </div>
        <p className="subtitle">
          2 a 4 joueurs. Chacun contre tous, derniere flotte a flot gagne.
        </p>
        <div className="ffa-members">
          {members.map((m, i) => (
            <div key={m.key} className={`ffa-member${m.key === selfKeyRef.current ? " me" : ""}`}>
              <span className="ffa-member-badge">{i + 1}</span>
              {m.name}
              {i === 0 && <span className="ffa-host-tag">hote</span>}
            </div>
          ))}
          {members.length < MAX_PLAYERS &&
            Array.from({ length: MAX_PLAYERS - members.length }).map((_, i) => (
              <div key={`e${i}`} className="ffa-member empty">
                En attente...
              </div>
            ))}
        </div>
        {host ? (
          <button
            className="btn btn-primary"
            disabled={members.length < 2}
            onClick={() => {
              sfx("click");
              hostBeginMatch();
            }}
          >
            {members.length < 2 ? "Au moins 2 joueurs" : `Lancer (${members.length} joueurs)`}
          </button>
        ) : (
          <p className="subtitle">En attente que l'hote lance la partie...</p>
        )}
        <button className="btn btn-ghost" onClick={onExit}>
          Quitter
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
        fleet={fleet}
        noTouchRule={settings.noTouchRule}
        blocked={cfg?.obstacles ?? []}
        title="Chaos - Placez votre flotte"
        subtitle={`${members.length} joueurs dans l'arene`}
        onConfirm={handlePlacementConfirm}
        onBack={onExit}
      />
      {chatUi}
      </>
    );
  }

  if (!view) {
    return (
      <>
      <div className="panel stack center">
        <h2>Chaos</h2>
        <p className="subtitle">En attente des autres flottes...</p>
        <div className="online-spinner" aria-hidden="true" />
        <button className="btn btn-ghost" onClick={onExit}>
          Quitter
        </button>
      </div>
      {chatUi}
      </>
    );
  }

  const canFire = view.yourTurn && !view.eliminated && phase !== "ended";
  const activeTarget = target && view.opponents.find((o) => o.seatId === target && o.alive) ? target : null;

  return (
    <>
    <div className="panel stack">
      {emoteBurst && (
        <div className="emote-burst" key={emoteBurst.ts}>
          <FloatingEmote id={emoteBurst.id} from={emoteBurst.from} />
        </div>
      )}
      <div className={`turn-indicator ${view.yourTurn ? "you" : "enemy"}`}>
        {phase === "ended"
          ? view.result === "win"
            ? "Vous gagnez le chaos !"
            : "Vous etes coule"
          : view.eliminated
          ? `Elimine - ${view.turnName} joue...`
          : view.yourTurn
          ? "A vous : choisissez une cible puis une case"
          : `Tour de ${view.turnName}...`}
      </div>

      {phase !== "ended" && (
        <div className="emote-row">
          <EmoteBar onEmote={sendEmote} />
        </div>
      )}

      <div className="ffa-boards">
        {view.opponents.map((opp) => (
          <div
            key={opp.seatId}
            className={`board-block board-frame enemy${opp.alive ? "" : " dead"}${
              activeTarget === opp.seatId ? " targeted" : ""
            }`}
          >
            <div className="board-hud enemy">
              <span className="board-hud-emblem">
                <span className="board-hud-radar">
                  <span className="board-hud-radar-sweep" />
                </span>
              </span>
              <div className="board-hud-plate">
                <span className="board-hud-title">{opp.name}</span>
                <span className="board-hud-sub enemy">
                  {opp.alive ? `${opp.fleet.filter((f) => !f.sunk).length} navires` : "Elimine"}
                </span>
              </div>
            </div>
            <Grid
              size={view.boardSize}
              data={opp.tracking.map((row, r) =>
                row.map((cell, c) => ({
                  ...cell,
                  clickable:
                    canFire &&
                    opp.alive &&
                    cell.visual !== "hit" &&
                    cell.visual !== "sunk" &&
                    cell.visual !== "miss" &&
                    !cell.blocked,
                }))
              )}
              ships={opp.trackingShips}
              variant="enemy"
              onCellClick={
                canFire && opp.alive
                  ? (r, c) => {
                      setTarget(opp.seatId);
                      fire(opp.seatId, r, c);
                    }
                  : undefined
              }
              onCellEnter={() => setTarget(opp.seatId)}
            />
          </div>
        ))}

        <div className="board-block board-frame own">
          <div className="board-hud own">
            <span className="board-hud-emblem">
              <AnchorIcon size={26} />
            </span>
            <div className="board-hud-plate">
              <span className="board-hud-title">Votre flotte</span>
              <span className="board-hud-sub">
                {view.ownFleet.filter((f) => !f.sunk).length}/{view.ownFleet.length}
              </span>
            </div>
          </div>
          <Grid size={view.boardSize} data={view.own} ships={view.ownShips} variant="own" />
        </div>
      </div>

      <div className="message-log">
        {view.log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      {phase === "ended" ? (
        <div className="row" style={{ justifyContent: "center", gap: 12 }}>
          <div className={`end-banner ${view.result === "win" ? "win" : "loss"}`}>
            {view.result === "win" ? "Victoire" : "Defaite"}
          </div>
          {members[0]?.key === selfKeyRef.current && (
            <button className="btn btn-primary" onClick={rematch}>
              Nouvelle manche
            </button>
          )}
          <button className="btn btn-ghost" onClick={onExit}>
            Quitter
          </button>
        </div>
      ) : (
        <button className="btn btn-ghost" onClick={onExit}>
          Abandonner
        </button>
      )}
    </div>
    {chatUi}
    </>
  );
}
