import React from "react";
import { ShipSilhouette } from "../assets/ShipSilhouette";
import { SpectatorView } from "../game/online";
import { Grid } from "./Grid";

interface Props {
  view: SpectatorView;
  onExit: () => void;
}

export function SpectatorBattleView({ view, onExit }: Props) {
  const over = view.phase === "over";
  const turnName = view.turn === "host" ? view.hostName : view.guestName;
  const winName = view.winner === "host" ? view.hostName : view.guestName;

  return (
    <div className="panel stack">
      <div className="spectator-badge">👁 Spectateur</div>

      <div className={`turn-indicator ${over ? "enemy" : "you"}`}>
        {over ? `${winName} remporte la partie !` : `Tour de ${turnName}…`}
      </div>

      <div className="boards-area">
        {(
          [
            { name: view.hostName, own: view.hostOwn, ships: view.hostShips, fleet: view.hostFleet, active: view.turn === "host" },
            { name: view.guestName, own: view.guestOwn, ships: view.guestShips, fleet: view.guestFleet, active: view.turn === "guest" },
          ] as const
        ).map((side, i) => (
          <div key={i} className={`board-block board-frame own${side.active && !over ? " targeted" : ""}`}>
            <div className="board-hud own">
              <span className="board-hud-emblem">
                <ShipSilhouette />
              </span>
              <div className="board-hud-plate">
                <span className="board-hud-title">{side.name}</span>
                <span className="board-hud-sub">
                  {side.fleet.filter((f) => !f.sunk).length}/{side.fleet.length} navires
                </span>
              </div>
            </div>
            <div className="grid-wrap">
              <Grid size={view.boardSize} data={side.own} ships={side.ships} variant="own" />
            </div>
            <SpecFleet fleet={side.fleet} />
          </div>
        ))}
      </div>

      <div className="message-log">
        {view.log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      <button className="btn btn-ghost" onClick={onExit}>
        Quitter le direct
      </button>
    </div>
  );
}

function SpecFleet({ fleet }: { fleet: { name: string; size: number; hits: number; sunk: boolean }[] }) {
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
            <span className="fleet-ship-name">{s.name}</span>
            <span className="fleet-ship-pips">
              {Array.from({ length: s.size }).map((_, j) => (
                <span key={j} className={`pip${j < (s.sunk ? s.size : s.hits) ? (s.sunk ? " dead" : " hit") : ""}`} />
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
