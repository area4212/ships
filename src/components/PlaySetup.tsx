import React, { useState } from "react";
import { Difficulty } from "../types/game";
import { useApp } from "../context/AppContext";
import { BotIcon, DuoIcon } from "../assets/setupArt";
import { MapPreview } from "./MapPreview";

export type MapSetup = {
  boardSize: number;
  obstacles: "aucun" | "peu" | "beaucoup";
  fog: boolean;
};

interface PlaySetupProps {
  onStart: (config: { mode: "pvp" | "bot"; difficulty?: Difficulty; map: MapSetup }) => void;
  onBack: () => void;
}

const MODES: { id: "bot" | "pvp"; Icon: typeof BotIcon; title: string; text: string }[] = [
  {
    id: "bot",
    Icon: BotIcon,
    title: "Contre un bot",
    text: "Affrontez l'intelligence artificielle, seul face a l'ocean.",
  },
  {
    id: "pvp",
    Icon: DuoIcon,
    title: "A deux, meme appareil",
    text: "Chacun place sa flotte a tour de role, avec un ecran de transition.",
  },
];

const DIFFICULTIES: { id: Difficulty; label: string; strength: number; accent: string; desc: string }[] = [
  { id: "facile", label: "Facile", strength: 1, accent: "#46d17a", desc: "Tirs entierement aleatoires. Ideal pour decouvrir le jeu." },
  { id: "moyen", label: "Moyen", strength: 2, accent: "#4ceaff", desc: "Vise les cases voisines apres un coup au but." },
  { id: "difficile", label: "Difficile", strength: 3, accent: "#ff9d2e", desc: "Recherche par quadrillage puis poursuit sur l'axe du navire." },
  { id: "expert", label: "Expert", strength: 4, accent: "#ff5a5a", desc: "Calcule les positions les plus probables a chaque tir." },
];

const SIZES = [8, 10, 12];
const OBSTACLES: { id: MapSetup["obstacles"]; label: string }[] = [
  { id: "aucun", label: "Aucun" },
  { id: "peu", label: "Quelques-uns" },
  { id: "beaucoup", label: "Beaucoup" },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function PlaySetup({ onStart, onBack }: PlaySetupProps) {
  const { settings, sfx } = useApp();
  const [mode, setMode] = useState<"pvp" | "bot">("bot");
  const [difficulty, setDifficulty] = useState<Difficulty>("moyen");

  const [boardSize, setBoardSize] = useState<number>(settings.boardSize);
  const [obstacles, setObstacles] = useState<MapSetup["obstacles"]>(settings.obstacles);
  const [fog, setFog] = useState<boolean>(settings.fogOfWar);
  const [randomLast, setRandomLast] = useState(false);

  function pickMode(m: "pvp" | "bot") {
    if (m === mode) return;
    setMode(m);
    sfx("place");
  }

  function pickDifficulty(d: Difficulty) {
    if (d === difficulty) return;
    setDifficulty(d);
    sfx("place");
  }

  function randomizeMap() {
    sfx("place");
    setBoardSize(pick(SIZES));
    setObstacles(pick(OBSTACLES).id);
    setFog(Math.random() < 0.4);
    setRandomLast(true);
    window.setTimeout(() => setRandomLast(false), 500);
  }

  function start() {
    sfx("fire");
    const map: MapSetup = { boardSize, obstacles, fog };
    onStart(mode === "pvp" ? { mode, map } : { mode, difficulty, map });
  }

  const currentDiff = DIFFICULTIES.find((d) => d.id === difficulty);
  const obstaclesLabel = OBSTACLES.find((o) => o.id === obstacles)?.label ?? "Aucun";

  const briefing: { k: string; v: string }[] = [
    { k: "Adversaire", v: mode === "pvp" ? "2 joueurs" : "Bot" },
    ...(mode === "bot" ? [{ k: "Difficulte", v: currentDiff?.label ?? "" }] : []),
    { k: "Grille", v: `${boardSize}x${boardSize}` },
    { k: "Obstacles", v: obstaclesLabel },
    { k: "Brume", v: fog && mode === "bot" ? "Oui" : "Non" },
  ];

  return (
    <div className="panel stack setup-panel">
      <h2>Nouvelle partie</h2>
      <p className="subtitle">Choisissez votre adversaire et votre carte.</p>

      <div className="setup-modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`menu-card${mode === m.id ? " is-selected" : ""}`}
            aria-pressed={mode === m.id}
            onClick={() => pickMode(m.id)}
          >
            <span className="menu-card-scan" aria-hidden="true" />
            <span className="menu-card-icon">
              <m.Icon size={30} />
            </span>
            <span className="menu-card-body">
              <h3>{m.title}</h3>
              <p>{m.text}</p>
            </span>
            <span className="menu-card-check" aria-hidden="true">
              {mode === m.id ? "✓" : ""}
            </span>
          </button>
        ))}
      </div>

      <div className={`diff-reveal${mode === "bot" ? " open" : ""}`}>
        <div className="diff-reveal-inner">
          <h3 className="diff-heading">Difficulte du bot</h3>
          <div className="diff-grid">
            {DIFFICULTIES.map((d, i) => (
              <button
                key={d.id}
                className={`diff-card${difficulty === d.id ? " is-selected" : ""}`}
                style={{ ["--d" as string]: `${i * 0.05}s`, ["--diff-accent" as string]: d.accent }}
                aria-pressed={difficulty === d.id}
                onClick={() => pickDifficulty(d.id)}
              >
                <span className="diff-radio" aria-hidden="true" />
                <span className="diff-card-main">
                  <span className="diff-card-top">
                    <span className="diff-name">{d.label}</span>
                    <span className="diff-meter" aria-hidden="true">
                      {Array.from({ length: 4 }).map((_, b) => (
                        <span key={b} className={`diff-bar${b < d.strength ? " on" : ""}`} />
                      ))}
                    </span>
                  </span>
                  <span className="diff-desc">{d.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`map-setup${randomLast ? " rolled" : ""}`}>
        <div className="map-setup-head">
          <h3 className="diff-heading">Carte de la partie</h3>
          <button className="btn map-random" onClick={randomizeMap}>
            🎲 Carte aleatoire
          </button>
        </div>

        <div className="map-setup-body">
          <div className="map-controls">
            <div className="map-row">
              <span className="map-label">Grille</span>
              <div className="seg">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    className={`seg-opt${boardSize === s ? " on" : ""}`}
                    onClick={() => {
                      setBoardSize(s);
                      sfx("place");
                    }}
                  >
                    {s}x{s}
                  </button>
                ))}
              </div>
            </div>

            <div className="map-row">
              <span className="map-label">Obstacles</span>
              <div className="seg">
                {OBSTACLES.map((o) => (
                  <button
                    key={o.id}
                    className={`seg-opt${obstacles === o.id ? " on" : ""}`}
                    onClick={() => {
                      setObstacles(o.id);
                      sfx("place");
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="map-row">
              <span className="map-label">Brouillard de guerre</span>
              <button
                className={`setup-toggle${fog ? " on" : ""}`}
                role="switch"
                aria-checked={fog}
                onClick={() => {
                  setFog((v) => !v);
                  sfx("place");
                }}
              >
                <span className="setup-toggle-knob" />
                <span className="setup-toggle-txt">{fog ? "Oui" : "Non"}</span>
              </button>
            </div>

            {mode === "pvp" && fog && (
              <p className="map-hint">Le brouillard n'est actif que contre un bot.</p>
            )}
          </div>

          <MapPreview boardSize={boardSize} obstacles={obstacles} fog={fog && mode === "bot"} />
        </div>
      </div>

      <div className="setup-briefing" aria-live="polite">
        <span className="setup-recap-dot" />
        {briefing.map((b) => (
          <span key={b.k} className="briefing-chip">
            <span className="briefing-k">{b.k}</span>
            <span className="briefing-v">{b.v}</span>
          </span>
        ))}
      </div>

      <div className="row setup-actions">
        <button className="btn btn-ghost" onClick={onBack}>
          Retour au menu
        </button>
        <button className="btn btn-primary btn-launch" onClick={start}>
          Placer ma flotte
        </button>
      </div>
    </div>
  );
}
