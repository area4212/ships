import React, { useRef, useState } from "react";
import { ShipSilhouette } from "../assets/ShipSilhouette";
import { OceanWaveFill } from "../assets/icons";
import { useApp } from "../context/AppContext";

type MenuScreen =
  | "play-setup"
  | "arena-intro"
  | "online"
  | "friends"
  | "settings"
  | "stats"
  | "rules"
  | "arsenal";

interface MainMenuProps {
  onNavigate: (screen: MenuScreen) => void;
}

type Item = { screen: MenuScreen; icon: string; title: string; text: string };

// Secondary entries, revealed after clicking "Autres options".
const OPTION_ITEMS: Item[] = [
  {
    screen: "arsenal",
    icon: "⚙️",
    title: "Arsenal",
    text: "Depensez votre XP pour ameliorer pouvoirs et flotte.",
  },
  {
    screen: "settings",
    icon: "🎚️",
    title: "Parametres",
    text: "Taille de grille, son, theme et regles optionnelles.",
  },
  {
    screen: "stats",
    icon: "📊",
    title: "Statistiques",
    text: "Vos victoires, defaites et votre meilleure serie dans l'Arene.",
  },
  {
    screen: "rules",
    icon: "📖",
    title: "Regles",
    text: "Comment placer sa flotte et remporter la bataille.",
  },
];

export function MainMenu({ onNavigate }: MainMenuProps) {
  const { sfx } = useApp();
  const sceneRef = useRef<HTMLDivElement>(null);
  const raf = useRef<number>(0);
  const [showOptions, setShowOptions] = useState(false);

  function go(screen: MenuScreen) {
    sfx("click");
    onNavigate(screen);
  }

  function toggleOptions() {
    sfx("click");
    setShowOptions((v) => !v);
  }

  // Cinematic parallax: the pointer nudges each depth layer by a different
  // amount. Throttled to one update per animation frame.
  function handlePointer(e: React.PointerEvent<HTMLDivElement>) {
    const el = sceneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width - 0.5;
    const my = (e.clientY - rect.top) / rect.height - 0.5;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty("--mx", mx.toFixed(3));
      el.style.setProperty("--my", my.toFixed(3));
    });
  }

  function resetPointer() {
    const el = sceneRef.current;
    if (!el) return;
    el.style.setProperty("--mx", "0");
    el.style.setProperty("--my", "0");
  }

  return (
    <div
      className="panel ocean-scene"
      ref={sceneRef}
      onPointerMove={handlePointer}
      onPointerLeave={resetPointer}
    >
      <div className="ocean-sky" />
      <div className="ocean-stars" />
      <div className="ocean-godrays" aria-hidden="true" />

      {/* escadrille aerienne qui traverse le ciel */}
      <div className="sky-planes" aria-hidden="true">
        <span className="plane p1" />
        <span className="plane p2" />
        <span className="plane p3" />
      </div>

      {/* distant warship convoy crossing the horizon */}
      <div className="horizon-fleet" aria-hidden="true">
        <span className="hf-ship hf-1" />
        <span className="hf-ship hf-2" />
        <span className="hf-ship hf-3" />
      </div>

      {/* random distant cannon fire on the horizon */}
      <div className="cannon-flash cf-1" aria-hidden="true" />
      <div className="cannon-flash cf-2" aria-hidden="true" />

      <div className="radar-sweep">
        <span className="radar-blip b1" />
        <span className="radar-blip b2" />
      </div>

      <div className="ocean-waves">
        <div className="wave-layer l3">
          <OceanWaveFill color="#0a2033" />
        </div>
        <div className="wave-layer l2">
          <OceanWaveFill color="#0d3355" />
        </div>
        <div className="wave-layer l1">
          <OceanWaveFill color="#123f66" />
        </div>
      </div>

      {/* sea spray / embers drifting up */}
      <div className="sea-spray" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="spray-bit" style={{ ["--i" as string]: i }} />
        ))}
      </div>

      {/* targeting-HUD frame + scanline over the whole scene */}
      <div className="hud-frame" aria-hidden="true">
        <span className="hud-corner tl" />
        <span className="hud-corner tr" />
        <span className="hud-corner bl" />
        <span className="hud-corner br" />
        <span className="hud-scanline" />
      </div>

      <div className="ocean-content stack center">
        <div className="hero-wrap">
          <span className="hero-glow" aria-hidden="true" />
          <ShipSilhouette className="ship-hero" />
        </div>
        <h1 className="menu-title">
          <span className="mt-kicker">Feedlo</span>
          <span className="mt-main" data-text="Navale">Navale</span>
        </h1>
        <p className="subtitle menu-subtitle">La bataille navale, en solo, entre amis ou dans l'Arene.</p>

        {/* Action principale : JOUER */}
        <button className="play-cta" onClick={() => go("play-setup")}>
          <span className="menu-card-scan" aria-hidden="true" />
          <span className="play-cta-icon">🎯</span>
          <span className="play-cta-text">
            <span className="play-cta-title">Jouer</span>
            <span className="play-cta-sub">Joueur contre joueur ou contre un bot</span>
          </span>
          <span className="play-cta-chevron" aria-hidden="true">
            {"›"}
          </span>
        </button>

        {/* Raccourcis secondaires */}
        <div className="menu-secondary">
          <button
            className="menu-mini menu-card--in"
            style={{ ["--d" as string]: "0.06s" }}
            onClick={() => go("online")}
          >
            <span className="icon">🌐</span>
            <span>En ligne</span>
          </button>
          <button
            className="menu-mini menu-card--in"
            style={{ ["--d" as string]: "0.1s" }}
            onClick={() => go("arena-intro")}
          >
            <span className="icon">⚔️</span>
            <span>Arene</span>
          </button>
          <button
            className="menu-mini menu-card--in"
            style={{ ["--d" as string]: "0.14s" }}
            onClick={() => go("friends")}
          >
            <span className="icon">🤝</span>
            <span>Amis</span>
          </button>
          <button
            className={`menu-mini menu-card--in${showOptions ? " is-open" : ""}`}
            style={{ ["--d" as string]: "0.18s" }}
            onClick={toggleOptions}
            aria-expanded={showOptions}
          >
            <span className="icon">⚙️</span>
            <span>Autres options</span>
            <span className="menu-mini-caret" aria-hidden="true">
              {"▾"}
            </span>
          </button>
        </div>

        {/* Panneau des options, deploye au clic */}
        {showOptions && (
          <div className="menu-grid options-grid">
            {OPTION_ITEMS.map((item, i) => (
              <button
                key={item.screen}
                className="menu-card menu-card--in"
                style={{ ["--d" as string]: `${i * 0.07}s` }}
                onClick={() => go(item.screen)}
              >
                <span className="menu-card-scan" aria-hidden="true" />
                <span className="menu-card-icon">
                  <span className="icon">{item.icon}</span>
                </span>
                <span className="menu-card-body">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </span>
                <span className="menu-card-chevron" aria-hidden="true">
                  {"›"}
                </span>
              </button>
            ))}
          </div>
        )}

        <p className="footer-note">
          Feedlo Navale - jeu 100% hors-ligne apres installation, jouable directement dans le navigateur.
        </p>
      </div>
    </div>
  );
}
