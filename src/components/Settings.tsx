import React from "react";
import { useApp } from "../context/AppContext";

interface SettingsProps {
  onBack: () => void;
  backLabel?: string;
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button className={`toggle ${on ? "on" : ""}`} onClick={onClick} aria-pressed={on}>
      <span className="knob" />
    </button>
  );
}

export function Settings({ onBack, backLabel = "Retour au menu" }: SettingsProps) {
  const { settings, updateSettings, resetStats, sfx } = useApp();

  function set<K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) {
    sfx("click");
    updateSettings({ [key]: value } as Partial<typeof settings>);
  }

  return (
    <div className="panel stack">
      <h2>Parametres</h2>

      <div className="settings-row">
        <div>
          <div className="label">Taille de la grille</div>
          <div className="hint">Une grille plus grande allonge les parties.</div>
        </div>
        <select
          className="select"
          value={settings.boardSize}
          onChange={(e) => set("boardSize", Number(e.target.value))}
        >
          <option value={8}>8 x 8 (flotte reduite)</option>
          <option value={10}>10 x 10 (classique)</option>
          <option value={12}>12 x 12 (grande flotte)</option>
        </select>
      </div>

      <div className="settings-row">
        <div>
          <div className="label">Theme</div>
          <div className="hint">Adapte l'interface a votre confort visuel.</div>
        </div>
        <select
          className="select"
          value={settings.theme}
          onChange={(e) => set("theme", e.target.value as "sombre" | "clair")}
        >
          <option value="sombre">Sombre</option>
          <option value="clair">Clair</option>
        </select>
      </div>

      <div className="settings-row">
        <div>
          <div className="label">Sons</div>
          <div className="hint">Effets sonores de tirs, touches et victoires.</div>
        </div>
        <Toggle on={settings.soundOn} onClick={() => set("soundOn", !settings.soundOn)} />
      </div>

      <div className="settings-row">
        <div>
          <div className="label">Musique d'ambiance</div>
          <div className="hint">Nappe navale et sonar, generee en continu.</div>
        </div>
        <Toggle on={settings.musicOn} onClick={() => set("musicOn", !settings.musicOn)} />
      </div>

      <div className="settings-row">
        <div>
          <div className="label">Animations</div>
          <div className="hint">Petites animations lors des impacts.</div>
        </div>
        <Toggle on={settings.animationsOn} onClick={() => set("animationsOn", !settings.animationsOn)} />
      </div>

      <div className="settings-row">
        <div>
          <div className="label">Pouvoirs speciaux</div>
          <div className="hint">Drone, sonar, tir de barrage, torpille et mine (contre un bot et en arene).</div>
        </div>
        <Toggle on={settings.powersOn} onClick={() => set("powersOn", !settings.powersOn)} />
      </div>

      <div className="settings-row">
        <div>
          <div className="label">Obstacles</div>
          <div className="hint">Rochers et iles infranchissables, identiques sur les deux grilles.</div>
        </div>
        <select
          className="select"
          value={settings.obstacles}
          onChange={(e) => set("obstacles", e.target.value as "aucun" | "peu" | "beaucoup")}
        >
          <option value="aucun">Aucun</option>
          <option value="peu">Quelques-uns</option>
          <option value="beaucoup">Beaucoup</option>
        </select>
      </div>

      <div className="settings-row">
        <div>
          <div className="label">Brouillard de guerre</div>
          <div className="hint">La grille adverse est masquee ; vous decouvrez la carte au fil de vos tirs.</div>
        </div>
        <Toggle on={settings.fogOfWar} onClick={() => set("fogOfWar", !settings.fogOfWar)} />
      </div>

      <div className="settings-row">
        <div>
          <div className="label">Rejouer apres un tir reussi</div>
          <div className="hint">Regle classique : un coup au but donne un tir supplementaire.</div>
        </div>
        <Toggle on={settings.fireAgainOnHit} onClick={() => set("fireAgainOnHit", !settings.fireAgainOnHit)} />
      </div>

      <div className="settings-row">
        <div>
          <div className="label">Navires ne se touchent pas</div>
          <div className="hint">Interdit de placer deux navires sur des cases adjacentes.</div>
        </div>
        <Toggle on={settings.noTouchRule} onClick={() => set("noTouchRule", !settings.noTouchRule)} />
      </div>

      <div className="settings-row">
        <div>
          <div className="label">Reinitialiser les statistiques</div>
          <div className="hint">Efface votre historique de parties et votre serie dans l'Arene.</div>
        </div>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (confirm("Reinitialiser toutes les statistiques ?")) {
              resetStats();
              sfx("click");
            }
          }}
        >
          Reinitialiser
        </button>
      </div>

      <button className="btn btn-ghost" onClick={onBack}>
        {backLabel}
      </button>
    </div>
  );
}
