import React from "react";
import { ArenaDef, arenaRankForRound } from "../game/arena";
import { useApp } from "../context/AppContext";

interface ArenaResultProps {
  reachedRound: number;
  arenaDef: ArenaDef;
  onRetry: () => void;
  onMenu: () => void;
}

export function ArenaResult({ reachedRound, arenaDef, onRetry, onMenu }: ArenaResultProps) {
  const { stats, sfx } = useApp();
  const rounds = Math.max(0, reachedRound - 1);
  const best = stats.arenaBestByMode[arenaDef.id] ?? 0;
  const isNewBest = rounds >= best && rounds > 0;

  return (
    <div className="panel stack center">
      <span style={{ fontSize: 52 }}>{arenaDef.icon}</span>
      <h1>Votre flotte a coule</h1>
      <p className="subtitle">
        {arenaDef.name} &mdash; vous avez tenu <strong>{rounds}</strong> round{rounds > 1 ? "s" : ""} et
        atteint le rang <strong>{arenaRankForRound(Math.max(1, rounds))}</strong>.
      </p>
      {isNewBest ? (
        <p className="pill">Nouveau record sur cette arene !</p>
      ) : (
        <p className="pill">Record sur cette arene : {best}</p>
      )}
      <div className="row" style={{ justifyContent: "center", marginTop: 10 }}>
        <button
          className="btn btn-primary"
          onClick={() => {
            sfx("click");
            onRetry();
          }}
        >
          Retenter {arenaDef.name}
        </button>
        <button className="btn btn-ghost" onClick={onMenu}>
          Menu principal
        </button>
      </div>
    </div>
  );
}
