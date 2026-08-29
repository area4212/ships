import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { AnchorIcon } from "../assets/icons";
import { ShipSilhouette } from "../assets/ShipSilhouette";
import {
  CATEGORY_LABELS,
  UPGRADES,
  UpgradeCategory,
  pointsAvailable,
  upgradeLevel,
  xpProgress,
} from "../game/progression";
import { UPGRADE_ART } from "../assets/upgradeArt";
import { Shipyard } from "./Shipyard";

interface ArsenalProps {
  onBack: () => void;
}

const CATEGORY_ORDER: UpgradeCategory[] = ["energie", "offensive", "defense", "reconnaissance"];

export function Arsenal({ onBack }: ArsenalProps) {
  const { stats, buyUpgrade, sfx } = useApp();
  const [tab, setTab] = useState<"upgrades" | "cosmetics">("upgrades");
  const prog = xpProgress(stats.xp);
  const points = Math.max(0, pointsAvailable(stats.xp, stats.upgrades));
  const pct = prog.span > 0 ? Math.min(100, Math.round((prog.into / prog.span) * 100)) : 100;

  return (
    <div className="panel stack">
      <div className="hud-header">
        <span className="hud-header-emblem left" aria-hidden="true">
          <ShipSilhouette />
        </span>
        <div className="hud-header-mid">
          <h2>⚙️ Arsenal</h2>
          <p className="subtitle">
            {tab === "upgrades"
              ? "Gagnez de l'XP en combat, montez de niveau, puis depensez vos points de commandement pour ameliorer vos pouvoirs."
              : "Gagnez des doublons en jouant, puis debloquez et equipez l'apparence de votre flotte."}
          </p>
        </div>
        <span className="hud-header-emblem right" aria-hidden="true">
          <AnchorIcon size={54} />
        </span>
      </div>

      <div className="arsenal-tabs">
        <button
          className={`arsenal-tab${tab === "upgrades" ? " active" : ""}`}
          onClick={() => {
            sfx("click");
            setTab("upgrades");
          }}
        >
          Ameliorations
        </button>
        <button
          className={`arsenal-tab${tab === "cosmetics" ? " active" : ""}`}
          onClick={() => {
            sfx("click");
            setTab("cosmetics");
          }}
        >
          Apparence
        </button>
      </div>

      {tab === "cosmetics" && <Shipyard />}

      {tab === "upgrades" && (
        <>
      <div className="arsenal-level">
        <div className="arsenal-rank">
          <span className="arsenal-rank-num">{prog.level}</span>
          <span className="arsenal-rank-lbl">Niveau</span>
        </div>
        <div className="arsenal-xp">
          <div className="arsenal-xp-bar">
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="arsenal-xp-text">
            Encore {Math.max(0, prog.span - prog.into)} XP pour atteindre le niveau {prog.level + 1}
            {" "}(chaque niveau = 1 point de commandement).
          </div>
        </div>
        <div className={`arsenal-points${points > 0 ? " has-points" : ""}`}>
          <span className="arsenal-points-num">{points}</span>
          <span className="arsenal-points-lbl">
            point{points > 1 ? "s" : ""} a depenser
          </span>
        </div>
      </div>

      {points === 0 && (
        <p className="arsenal-hint">
          Vous n'avez aucun point disponible : remportez des combats pour monter de niveau.
        </p>
      )}

      {CATEGORY_ORDER.map((cat) => {
        const list = UPGRADES.filter((u) => u.category === cat);
        if (list.length === 0) return null;
        return (
          <div key={cat} className="upgrade-section">
            <h3 className="upgrade-section-title">{CATEGORY_LABELS[cat]}</h3>
            <div className="upgrade-grid">
              {list.map((u) => {
                const lvl = upgradeLevel(stats.upgrades, u.id);
                const maxed = lvl >= u.maxLevel;
                const canBuy = !maxed && points >= 1;
                const Art = UPGRADE_ART[u.id];
                return (
                  <div key={u.id} className={`upgrade-card${lvl > 0 ? " owned" : ""}`}>
                    <div className="upgrade-head">
                      <span className="upgrade-icon" aria-hidden="true">
                        <Art size={52} />
                      </span>
                      <div className="upgrade-head-text">
                        <div className="upgrade-name">{u.name}</div>
                        <div className="upgrade-tagline">{u.tagline}</div>
                      </div>
                    </div>

                    <div className="upgrade-levelrow">
                      <span className="upgrade-lvl-badge">
                        {maxed ? "Niveau max" : `Niveau ${lvl} / ${u.maxLevel}`}
                      </span>
                      <span className="upgrade-pips">
                        {Array.from({ length: u.maxLevel }).map((_, i) => (
                          <span key={i} className={`u-pip${i < lvl ? " on" : ""}`} />
                        ))}
                      </span>
                    </div>

                    <div className="upgrade-effects">
                      <div className="upgrade-effect now">
                        <span className="upgrade-effect-lbl">Actuel</span>
                        <span>{u.describe(lvl)}</span>
                      </div>
                      {!maxed && (
                        <div className="upgrade-effect next">
                          <span className="upgrade-effect-lbl">Avec 1 point</span>
                          <span>{u.describe(lvl + 1)}</span>
                        </div>
                      )}
                    </div>

                    <button
                      className="btn btn-primary upgrade-buy"
                      disabled={!canBuy}
                      title={
                        maxed
                          ? "Amelioration au niveau maximum"
                          : points < 1
                            ? "Montez de niveau pour gagner un point"
                            : undefined
                      }
                      onClick={() => {
                        sfx("place");
                        buyUpgrade(u.id);
                      }}
                    >
                      {maxed
                        ? "Niveau max atteint"
                        : lvl > 0
                          ? "Ameliorer — 1 point"
                          : "Debloquer — 1 point"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="arsenal-xpguide">
        <h3 className="upgrade-section-title">Comment gagner de l'XP</h3>
        <ul>
          <li>
            <strong>+3 XP</strong> par tir qui touche un navire
          </li>
          <li>
            <strong>+90 XP</strong> pour une victoire contre un bot
          </li>
          <li>
            <strong>+45 XP</strong> par manche d'arene reussie
          </li>
        </ul>
        <p className="subtitle">
          Les ameliorations n'agissent qu'en solo (contre un bot) et en arene, quand les pouvoirs
          sont actives.
        </p>
      </div>
        </>
      )}

      <button className="btn btn-ghost" onClick={onBack}>
        Fermer
      </button>
    </div>
  );
}
