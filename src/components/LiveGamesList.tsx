import React from "react";
import { LiveGame } from "../net/live";

interface Props {
  games: LiveGame[];
  friendNames?: Set<string>;
  onSpectate: (code: string) => void;
}

export function LiveGamesList({ games, friendNames, onSpectate }: Props) {
  return (
    <div className="live-games">
      <div className="lobby-players-head">Parties en direct ({games.length})</div>
      {games.length === 0 && <div className="lobby-empty">Aucune partie à regarder pour l'instant.</div>}
      {games.map((g) => {
        const withFriend =
          !!friendNames && (friendNames.has(g.a) || friendNames.has(g.b));
        return (
          <div key={g.code} className={`live-game-row${withFriend ? " friend" : ""}`}>
            {withFriend && <span className="live-star">★</span>}
            <span className="live-vs">
              <strong>{g.a}</strong> vs <strong>{g.b}</strong>
            </span>
            <button className="btn btn-primary btn-sm" onClick={() => onSpectate(g.code)}>
              👁 Regarder
            </button>
          </div>
        );
      })}
    </div>
  );
}
