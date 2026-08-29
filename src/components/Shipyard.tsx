import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { ShipArt } from "../assets/shipArt";
import { EmblemGlyph } from "../assets/emblemArt";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  COSMETICS,
  Collection,
  CosmeticCategory,
  CosmeticDef,
  Loadout,
  cosmeticById,
  cosmeticImage,
  isOwned,
} from "../game/cosmetics";

function PreviewShip({ loadout, artFocus }: { loadout: Loadout; artFocus?: CosmeticDef }) {
  const hullDef = cosmeticById(loadout.hull);
  const livery = hullDef?.livery;
  const flag = cosmeticById(loadout.flag)?.flag;
  const grid = cosmeticById(loadout.grid)?.grid;
  const trail = cosmeticById(loadout.trail)?.trail;
  const emblem = cosmeticById(loadout.emblem)?.emblem;
  const emblemImg = cosmeticImage(cosmeticById(loadout.emblem));
  // Which hull illustration to feature: a hovered hull wins, else the equipped one.
  const shownHull = artFocus?.category === "hull" && artFocus.image ? artFocus : hullDef;
  const hero = cosmeticImage(shownHull);

  // pointer parallax: tilt the flagship illustration like a 3D turntable
  function tilt(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    e.currentTarget.style.setProperty("--tx", (x * 26).toFixed(1));
    e.currentTarget.style.setProperty("--ty", (-y * 16).toFixed(1));
  }
  function resetTilt(e: React.MouseEvent<HTMLDivElement>) {
    e.currentTarget.style.setProperty("--tx", "0");
    e.currentTarget.style.setProperty("--ty", "0");
  }

  return (
    <div
      className={`shipyard-preview${hero ? " has-hero" : ""}`}
      onMouseMove={hero ? tilt : undefined}
      onMouseLeave={hero ? resetTilt : undefined}
      style={
        {
          "--grid-water": grid?.water,
          "--grid-line": grid?.line,
        } as React.CSSProperties
      }
    >
      <div className="shipyard-preview-badges">
        {emblemImg ? (
          <span className="shipyard-badge img">
            <img src={emblemImg} alt="" />
          </span>
        ) : (
          emblem &&
          emblem.shape !== "none" && (
            <span className="shipyard-badge">
              <EmblemGlyph shape={emblem.shape} color={emblem.color} size={26} />
            </span>
          )
        )}
        {trail && <span className="shipyard-badge trail" style={{ background: trail }} />}
      </div>

      {hero ? (
        <>
          <div className="shipyard-preview-artwrap">
            <img className="shipyard-preview-art" src={hero} alt="" />
          </div>
          <div className="shipyard-preview-mini" title="Vos navires sur la grille">
            <ShipArt variant="destroyer" length={4} orientation="horizontal" uid="preview" livery={livery} flag={flag} />
          </div>
          <span className="shipyard-preview-caption">{shownHull?.name ?? "Apercu"}</span>
        </>
      ) : (
        <>
          <div className="shipyard-preview-hull">
            <ShipArt variant="destroyer" length={4} orientation="horizontal" uid="preview" livery={livery} flag={flag} />
          </div>
          <span className="shipyard-preview-caption">Apercu de votre flotte</span>
        </>
      )}
    </div>
  );
}

function Swatch({ def }: { def: CosmeticDef }) {
  const img = cosmeticImage(def);
  if (img) {
    return (
      <span className={`cos-swatch img${def.category === "hull" ? " wide" : ""}`}>
        <img src={img} alt="" width={def.category === "hull" ? 84 : 54} height={54} />
      </span>
    );
  }
  if (def.livery) {
    return (
      <span className="cos-swatch">
        <span style={{ background: def.livery.deckMid }} />
        <span style={{ background: def.livery.steel }} />
        <span style={{ background: def.livery.steelDark }} />
      </span>
    );
  }
  if (def.flag) {
    return (
      <span className="cos-swatch flag">
        {def.flag.length === 0 ? (
          <span className="cos-swatch-none">—</span>
        ) : (
          def.flag.map((c, i) => <span key={i} style={{ background: c }} />)
        )}
      </span>
    );
  }
  if (def.emblem) {
    return (
      <span className="cos-swatch emblem">
        {def.emblem.shape === "none" ? (
          <span className="cos-swatch-none">—</span>
        ) : (
          <EmblemGlyph shape={def.emblem.shape} color={def.emblem.color} size={22} />
        )}
      </span>
    );
  }
  if (def.trail) {
    return <span className="cos-swatch solid" style={{ background: def.trail }} />;
  }
  if (def.grid) {
    return (
      <span className="cos-swatch grid" style={{ background: def.grid.water }}>
        <span style={{ borderColor: def.grid.line }} />
      </span>
    );
  }
  return null;
}

const COLLECTIONS: { id: Collection | "all"; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "standard", label: "Standard" },
  { id: "medieval", label: "Medieval" },
];

export function Shipyard() {
  const { stats, loadout, buyCosmetic, equipCosmetic, sfx } = useApp();
  const [cat, setCat] = useState<CosmeticCategory>("hull");
  const [coll, setColl] = useState<Collection | "all">("all");
  const [hover, setHover] = useState<string | null>(null);

  const items = COSMETICS.filter(
    (c) => c.category === cat && (coll === "all" || (c.collection ?? "standard") === coll)
  );
  // group by era (medieval items carry one; others fall under "")
  const groups = new Map<string, CosmeticDef[]>();
  for (const it of items) {
    const key = it.era ?? "";
    const arr = groups.get(key);
    if (arr) arr.push(it);
    else groups.set(key, [it]);
  }

  const hoverDef = hover ? cosmeticById(hover) : undefined;
  // preview reflects the hovered item if it belongs to the active category
  const previewLoadout: Loadout =
    hoverDef && hoverDef.category === cat ? { ...loadout, [cat]: hover! } : loadout;

  return (
    <div className="shipyard">
      <div className="shipyard-top">
        <PreviewShip loadout={previewLoadout} artFocus={hoverDef} />
        <div className="shipyard-wallet">
          <span className="shipyard-doublons">🪙 {stats.doublons}</span>
          <span className="shipyard-doublons-lbl">doublons</span>
          <p className="subtitle">
            Gagnez des doublons a chaque partie (+5), victoire (+15), manche d'arene (+20) et a votre
            premiere victoire du jour (+30). Les cosmetiques n'ont aucun effet sur le jeu.
          </p>
        </div>
      </div>

      <div className="shipyard-tabs">
        {CATEGORY_ORDER.map((c) => (
          <button
            key={c}
            className={`shipyard-tab${c === cat ? " active" : ""}`}
            onClick={() => {
              sfx("click");
              setCat(c);
              setHover(null);
            }}
          >
            {CATEGORY_META[c].label}
          </button>
        ))}
      </div>
      <p className="subtitle shipyard-cat-help">{CATEGORY_META[cat].help}</p>

      <div className="shipyard-colls">
        {COLLECTIONS.map((c) => (
          <button
            key={c.id}
            className={`shipyard-coll${coll === c.id ? " on" : ""}`}
            onClick={() => {
              sfx("click");
              setColl(c.id);
              setHover(null);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {[...groups.entries()].map(([era, defs]) => (
        <div key={era || "base"} className="cos-group">
          {era && <h4 className="cos-group-title">{era}</h4>}
          <div className="cos-grid">
            {defs.map((def) => {
              const owned = isOwned(stats.ownedCosmetics, def.id);
              const equipped = loadout[cat] === def.id;
              const affordable = stats.doublons >= def.price;
              return (
                <div
                  key={def.id}
                  className={`cos-card${equipped ? " equipped" : ""}${owned ? " owned" : ""} rar-${def.rarity}`}
                  onMouseEnter={() => setHover(def.id)}
                  onMouseLeave={() => setHover(null)}
                >
                  <Swatch def={def} />
                  <div className="cos-body">
                    <div className="cos-name">{def.name}</div>
                    <div className="cos-rarity">{def.rarity}</div>
                    {def.traitName && (
                      <div className="cos-trait" title="Actif contre un bot et en arene">
                        ⚔ {def.traitName} — {def.traitDesc}
                      </div>
                    )}
                  </div>
                  {equipped ? (
                    <span className="cos-tag equipped">Equipe</span>
                  ) : owned ? (
                    <button
                      className="btn btn-ghost cos-btn"
                      onClick={() => {
                        sfx("place");
                        equipCosmetic(def.id);
                      }}
                    >
                      Equiper
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary cos-btn"
                      disabled={!affordable}
                      title={affordable ? undefined : "Pas assez de doublons"}
                      onClick={() => {
                        sfx("place");
                        buyCosmetic(def.id);
                      }}
                    >
                      🪙 {def.price}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
