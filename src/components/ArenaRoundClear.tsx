import React from "react";
import { arenaBotName, arenaRankForRound } from "../game/arena";
import { useApp } from "../context/AppContext";

interface ArenaRoundClearProps {
  clearedRound: number;
  onContinue: () => void;
}

export function ArenaRoundClear({ clearedRound, onContinue }: ArenaRoundClearProps) {
  const { sfx } = useApp();
  const nextRound = clearedRound + 1;

  return (
    <div className="panel stack center">
      <span style={{ fontSize: 46 }}>🎖️</span>
      <h1>Round {clearedRound} remporte !</h1>
      <p className="subtitle">
        Vous avez atteint le rang <strong>{arenaRankForRound(clearedRound)}</strong>. Le prochain
        adversaire vous attend : <strong>{arenaBotName(nextRound)}</strong>.
      </p>
      <button
        className="btn btn-primary btn-block"
        style={{ maxWidth: 320 }}
        onClick={() => {
          sfx("click");
          onContinue();
        }}
      >
        Affronter le round {nextRound}
      </button>
    </div>
  );
}
