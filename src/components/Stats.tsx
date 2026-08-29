import React from "react";
import { useApp } from "../context/AppContext";
import { ShipSilhouette } from "../assets/ShipSilhouette";
import { AnchorIcon } from "../assets/icons";

interface StatsProps {
  onBack: () => void;
  backLabel?: string;
}

export function Stats({ onBack, backLabel = "Retour au menu" }: StatsProps) {
  const { stats } = useApp();
  const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;

  const tiles: { icon: string; value: string; label: string; meter?: number; tone?: string }[] = [
    { icon: "🕹️", value: String(stats.gamesPlayed), label: "Parties jouees" },
    { icon: "🏆", value: String(stats.wins), label: "Victoires", tone: "ok" },
    { icon: "💀", value: String(stats.losses), label: "Defaites", tone: "danger" },
    { icon: "🎯", value: `${winRate}%`, label: "Taux de victoire", meter: winRate },
    { icon: "🎯", value: `${accuracy}%`, label: "Precision des tirs", meter: accuracy },
    { icon: "🔥", value: String(stats.arenaBestStreak), label: "Meilleure serie - Arene" },
  ];

  const diffs: { key: keyof typeof stats.winsByDifficulty; label: string }[] = [
    { key: "facile", label: "Facile" },
    { key: "moyen", label: "Moyen" },
    { key: "difficile", label: "Difficile" },
    { key: "expert", label: "Expert" },
  ];

  return (
    <div className="panel stack">
      <div className="hud-header">
        <span className="hud-header-emblem left" aria-hidden="true">
          <ShipSilhouette />
        </span>
        <div className="hud-header-mid">
          <h2>📊 Statistiques</h2>
          <p className="subtitle">Vos performances en bataille : bots, arene et parties en ligne.</p>
        </div>
        <span className="hud-header-emblem right" aria-hidden="true">
          <AnchorIcon size={54} />
        </span>
      </div>

      <div className="stat-grid">
        {tiles.map((t, i) => (
          <div
            key={t.label}
            className={`stat-card${t.tone ? ` tone-${t.tone}` : ""}`}
            style={{ ["--d" as string]: `${i * 0.06}s` }}
          >
            <span className="stat-card-scan" aria-hidden="true" />
            <span className="stat-icon" aria-hidden="true">{t.icon}</span>
            <div className="stat-body">
              <div className="stat-value">{t.value}</div>
              <div className="stat-label">{t.label}</div>
              {t.meter !== undefined && (
                <div className="stat-meter">
                  <span style={{ width: `${t.meter}%` }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <h3 className="hud-subhead">Victoires par difficulte</h3>
      <div className="diff-stat-row">
        {diffs.map((d) => (
          <div key={d.key} className="diff-stat">
            <span className={`badge badge-${d.key}`}>{d.label}</span>
            <span className="diff-stat-count">{stats.winsByDifficulty[d.key]}</span>
          </div>
        ))}
      </div>

      <button className="btn btn-ghost" onClick={onBack} style={{ marginTop: 10 }}>
        {backLabel}
      </button>
    </div>
  );
}
