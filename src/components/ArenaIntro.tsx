import React from "react";
import { ARENAS } from "../game/arena";
import { useApp } from "../context/AppContext";
import { AnchorIcon, TrophyIcon } from "../assets/icons";

interface ArenaIntroProps {
  onStart: (arenaId: string) => void;
  onBack: () => void;
}

export function ArenaIntro({ onStart, onBack }: ArenaIntroProps) {
  const { stats, sfx } = useApp();
  const globalRecord = stats.arenaBestStreak;

  return (
    <div className="panel stack arena-screen">
      <div className="arena-header">
        <div className="arena-header-left">
          <span className="arena-header-emblem" aria-hidden="true">
            <AnchorIcon size={30} />
          </span>
          <div>
            <h2 className="arena-header-title">Arenes</h2>
            <p className="subtitle">
              Placez votre flotte une fois, puis enchainez les combats.
              <br />
              La moindre defaite met fin a la serie. Chaque arene a ses regles et son propre record.
            </p>
          </div>
        </div>

        <div className="arena-record-card">
          <span className="arena-record-lbl">Votre record global</span>
          <div className="arena-record-row">
            <TrophyIcon size={26} className="arena-record-trophy" />
            <span className="arena-record-num">{globalRecord}</span>
            <span className="arena-record-unit">victoires</span>
          </div>
          <span className="arena-record-badge" aria-hidden="true">
            ★
          </span>
        </div>
      </div>

      <div className="arena-grid">
        {ARENAS.map((a) => {
          const best = stats.arenaBestByMode[a.id] ?? 0;
          return (
            <button
              key={a.id}
              className="arena-card"
              style={{ ["--arena-accent" as string]: a.accent } as React.CSSProperties}
              onClick={() => {
                sfx("click");
                onStart(a.id);
              }}
            >
              <span className="arena-card-scan" aria-hidden="true" />
              <div className={`arena-scene arena-scene--${a.id}`} aria-hidden="true">
                <span className="arena-scene-grad" />
                {/* Optional photo banner: drop <id>.jpg in public/arenas/.
                    If the file is missing the <img> hides itself and the
                    painted CSS scene shows through. */}
                <img
                  className="arena-scene-photo"
                  src={`${import.meta.env.BASE_URL}arenas/${a.id}.jpg`}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.parentElement?.classList.add("no-photo");
                  }}
                />
                <span className="arena-card-emblem">{a.icon}</span>
                <span className="arena-card-stars" title={`Difficulte ${a.stars}/5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={`arena-star${i < a.stars ? " on" : ""}`}>
                      ☠
                    </span>
                  ))}
                </span>
              </div>

              <div className="arena-card-body">
                <h3>{a.name}</h3>
                <p>{a.desc}</p>
                <div className="arena-card-foot">
                  <span className="arena-chip">
                    Grille <b>{a.boardSize}x{a.boardSize}</b>
                  </span>
                  {a.obstacles !== "aucun" && <span className="arena-chip">Obstacles</span>}
                  {a.fog && <span className="arena-chip">Brume</span>}
                  {a.noFireAgain && <span className="arena-chip">Sans tir bonus</span>}
                  {a.powerCostMod > 0 && (
                    <span className="arena-chip">Pouvoirs +{a.powerCostMod}</span>
                  )}
                  <span className="arena-chip arena-chip-record">
                    Record <b>{best}</b>
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button className="btn btn-ghost arena-back" onClick={onBack}>
        ← Retour au menu
      </button>
    </div>
  );
}
