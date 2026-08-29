import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { AnchorIcon } from "../assets/icons";
import { ShipSilhouette } from "../assets/ShipSilhouette";
import { CROSS, POWERS, PowerId, zone3x3 } from "../game/powers";
import { OnlineAction, OnlineConfig, SeatView, powerCost } from "../game/online";
import { cosmeticImage, equippedDef, liveryFor } from "../game/cosmetics";
import { CellData, Grid } from "./Grid";
import { EmoteBar, FloatingEmote } from "./EmoteBar";
import { EmblemImage, FlagshipPortrait } from "./FlagshipPortrait";

interface Props {
  view: SeatView;
  cfg: OnlineConfig;
  peerName: string;
  ended: boolean;
  canRematch: boolean;
  peerEmote?: { id: string; ts: number } | null;
  onEmote?: (id: string) => void;
  onAction: (a: OnlineAction) => void;
  onRematch: () => void;
  onExit: () => void;
}

const COL = "ABCDEFGHIJKLMNOP";

export function OnlineBattleView({
  view,
  cfg,
  peerName,
  ended,
  canRematch,
  peerEmote,
  onEmote,
  onAction,
  onRematch,
  onExit,
}: Props) {
  const { sfx, loadout } = useApp();
  const [power, setPower] = useState<PowerId | null>(null);
  const [axis, setAxis] = useState<"row" | "col">("row");
  const [hover, setHover] = useState<string | null>(null);
  const [myEmote, setMyEmote] = useState<{ id: string; ts: number } | null>(null);
  const ownLivery = liveryFor(loadout);
  const ownAura = equippedDef(loadout, "aura")?.aura;
  const ownFlag = equippedDef(loadout, "flag")?.flag;
  const fxTrail = equippedDef(loadout, "trail")?.trail;
  const gridTheme = equippedDef(loadout, "grid")?.grid;

  const my = view.yourTurn && !ended;

  const aimCells = useMemo(() => {
    if (!hover || !power) return new Set<string>();
    const [r, c] = hover.split(",").map(Number);
    if (power === "drone" || power === "sonar") return new Set(zone3x3(r, c, view.boardSize));
    if (power === "barrage")
      return new Set(
        CROSS.map(([dr, dc]) => `${r + dr},${c + dc}`).filter((k) => {
          const [rr, cc] = k.split(",").map(Number);
          return rr >= 0 && cc >= 0 && rr < view.boardSize && cc < view.boardSize;
        })
      );
    if (power === "torpille") {
      const s = new Set<string>();
      for (let i = 0; i < view.boardSize; i++) s.add(axis === "col" ? `${i},${c}` : `${r},${i}`);
      return s;
    }
    if (power === "mine") return new Set([hover]);
    return new Set<string>();
  }, [hover, power, axis, view.boardSize]);

  const tracking: CellData[][] = useMemo(
    () =>
      view.tracking.map((row, r) =>
        row.map((cell, c) => {
          const key = `${r},${c}`;
          const shot = cell.visual === "hit" || cell.visual === "sunk" || cell.visual === "miss";
          return {
            ...cell,
            clickable: my && !shot && !cell.blocked && (power === null || power !== "mine"),
            aim: power && power !== "mine" ? aimCells.has(key) : undefined,
          };
        })
      ),
    [view.tracking, my, power, aimCells]
  );

  const own: CellData[][] = useMemo(
    () =>
      view.own.map((row, r) =>
        row.map((cell, c) => {
          const key = `${r},${c}`;
          const shot = cell.visual === "hit" || cell.visual === "sunk" || cell.visual === "miss";
          return {
            ...cell,
            clickable: my && power === "mine" && !shot && !cell.mine && !cell.blocked,
            aim: power === "mine" ? aimCells.has(key) : undefined,
          };
        })
      ),
    [view.own, my, power, aimCells]
  );

  function clickEnemy(r: number, c: number) {
    if (!my) return;
    if (power && power !== "mine") {
      onAction({ kind: power, r, c, axis, power });
      sfx(power === "barrage" || power === "torpille" ? "fire" : "click");
    } else if (!power) {
      onAction({ kind: "shot", r, c });
      sfx("fire");
    }
    setPower(null);
    setHover(null);
  }

  function clickOwn(r: number, c: number) {
    if (!my || power !== "mine") return;
    onAction({ kind: "mine", r, c, power: "mine" });
    sfx("place");
    setPower(null);
    setHover(null);
  }

  const boardsVars = fxTrail ? ({ ["--fx-trail" as string]: fxTrail } as React.CSSProperties) : undefined;
  const ownVars = gridTheme
    ? ({
        ["--grid-water" as string]: gridTheme.water,
        ["--grid-cell" as string]: gridTheme.water,
        ["--grid-line" as string]: gridTheme.line,
      } as React.CSSProperties)
    : undefined;

  return (
    <div className="panel stack">
      <div className={`turn-indicator ${my ? "you" : "enemy"}`}>
        {ended ? "Partie terminee" : my ? "A vous de tirer" : `Tour de ${peerName}...`}
      </div>

      {onEmote && !ended && (
        <div className="emote-row">
          <EmoteBar onEmote={(id) => { setMyEmote({ id, ts: Date.now() }); onEmote(id); }} />
        </div>
      )}

      {cfg.energyStart >= 0 && (
        <div className="power-bar">
          <div className="energy-gauge">
            <span className="energy-label">Energie</span>
            <span className="energy-pips">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className={`energy-pip${i < view.energy ? " on" : ""}`} />
              ))}
            </span>
            <span className="energy-num">{view.energy}</span>
          </div>
          <div className="power-buttons">
            {POWERS.map((p) => {
              const cost = powerCost(cfg, p.id);
              return (
                <button
                  key={p.id}
                  className={`power-btn${power === p.id ? " active" : ""}`}
                  disabled={!my || view.energy < cost || (p.id === "mine" && view.mineCount >= cfg.mineLimit)}
                  title={`${p.name} - ${cost} energie`}
                  onClick={() => {
                    sfx("click");
                    setPower((cur) => (cur === p.id ? null : p.id));
                  }}
                >
                  <span className="power-icon">{p.icon}</span>
                  <span className="power-cost">{cost}</span>
                </button>
              );
            })}
            {view.repairLeft > 0 && (
              <button
                className="power-btn repair"
                disabled={!my}
                title={`Reparer (${view.repairLeft})`}
                onClick={() => onAction({ kind: "repair", r: 0, c: 0 })}
              >
                <span className="power-icon">🔧</span>
                <span className="power-cost">{view.repairLeft}</span>
              </button>
            )}
            {power === "torpille" && (
              <button className="power-axis" onClick={() => setAxis((a) => (a === "row" ? "col" : "row"))}>
                {axis === "row" ? "Ligne ⇄" : "Colonne ⇅"}
              </button>
            )}
          </div>
          {power && <div className="power-hint">{POWERS.find((p) => p.id === power)?.short}</div>}
        </div>
      )}

      <div className="boards-area" style={boardsVars}>
        <div className="board-block board-frame enemy">
          {peerEmote && <FloatingEmote key={peerEmote.ts} id={peerEmote.id} from={peerName} />}
          <div className="board-hud enemy">
            <span className="board-hud-emblem">
              <span className="board-hud-radar">
                <span className="board-hud-radar-sweep" />
              </span>
            </span>
            <div className="board-hud-plate">
              <span className="board-hud-title">Flotte adverse</span>
              <span className="board-hud-sub enemy">{peerName}</span>
            </div>
            <span className="board-hud-ship">
              <ShipSilhouette />
            </span>
          </div>
          <div className="grid-wrap">
            <Grid
              size={view.boardSize}
              data={tracking}
              ships={view.trackingShips}
              variant="enemy"
              onCellClick={my ? clickEnemy : undefined}
              onCellEnter={(r, c) => setHover(`${r},${c}`)}
              onCellLeave={() => setHover(null)}
            />
            <div className={`coord-readout${hover ? " show" : ""}`}>
              {hover ? `CIBLE ${COL[+hover.split(",")[1]] ?? ""}${+hover.split(",")[0] + 1}` : ""}
            </div>
          </div>
          <MiniFleet fleet={view.enemyFleet.map((s) => ({ ...s, hits: s.sunk ? s.size : 0 }))} hidden />
        </div>

        <div className="board-block board-frame own" style={ownVars}>
          {myEmote && <FloatingEmote key={myEmote.ts} id={myEmote.id} />}
          <div className="board-hud own">
            <span className="board-hud-emblem">
              {cosmeticImage(equippedDef(loadout, "emblem")) ? (
                <EmblemImage loadout={loadout} size={26} />
              ) : (
                <AnchorIcon size={26} />
              )}
            </span>
            <div className="board-hud-plate">
              <span className="board-hud-title">Votre flotte</span>
              <span className="board-hud-sub">Vous</span>
            </div>
            <span className="board-hud-ship">
              <FlagshipPortrait loadout={loadout} size={30} />
            </span>
          </div>
          <div className="grid-wrap">
            <Grid
              size={view.boardSize}
              data={own}
              ships={view.ownShips}
              variant="own"
              livery={ownLivery}
              flag={ownFlag}
              aura={ownAura?.fx}
              auraColor={ownAura?.color}
              onCellClick={my && power === "mine" ? clickOwn : undefined}
              onCellEnter={power === "mine" ? (r, c) => setHover(`${r},${c}`) : undefined}
              onCellLeave={power === "mine" ? () => setHover(null) : undefined}
            />
          </div>
          <MiniFleet fleet={view.ownFleet} />
        </div>
      </div>

      <div className="message-log">
        {view.log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      {ended ? (
        <div className="row" style={{ justifyContent: "center", gap: 12 }}>
          <div className={`end-banner ${view.result === "win" ? "win" : "loss"}`}>
            {view.result === "win" ? "Victoire !" : "Defaite"}
          </div>
          {canRematch && (
            <button className="btn btn-primary" onClick={onRematch}>
              Revanche
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
  );
}

function MiniFleet({
  fleet,
  hidden,
}: {
  fleet: { name: string; size: number; hits: number; sunk: boolean }[];
  hidden?: boolean;
}) {
  const sunk = fleet.filter((s) => s.sunk).length;
  return (
    <div className="fleet-status">
      <div className="fleet-status-head">
        <span>
          {fleet.length - sunk}/{fleet.length} navires
        </span>
      </div>
      <div className="fleet-status-list">
        {fleet.map((s, i) => (
          <div key={i} className={`fleet-ship${s.sunk ? " is-sunk" : ""}`}>
            <span className="fleet-ship-name">{hidden && !s.sunk ? "? ? ?" : s.name}</span>
            <span className="fleet-ship-pips">
              {Array.from({ length: s.size }).map((_, j) => (
                <span key={j} className={`pip${j < s.hits ? (s.sunk ? " dead" : " hit") : ""}`} />
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
