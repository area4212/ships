import React from "react";
import { ShipSilhouette } from "../assets/ShipSilhouette";
import { Loadout, cosmeticImage, equippedDef } from "../game/cosmetics";

/**
 * Small hexagonal portrait of the player's equipped flagship (hull artwork).
 * Falls back to the generic ship silhouette when the equipped hull has no image.
 */
export function FlagshipPortrait({ loadout, size = 40 }: { loadout: Loadout; size?: number }) {
  const hull = equippedDef(loadout, "hull");
  const img = cosmeticImage(hull);
  return (
    <span className="flagship-portrait" style={{ width: size, height: size }} aria-hidden="true">
      {img ? <img src={img} alt="" /> : <ShipSilhouette />}
    </span>
  );
}

/** Equipped emblem as an image badge, or null when it's a plain SVG-shape emblem. */
export function EmblemImage({ loadout, size = 28 }: { loadout: Loadout; size?: number }) {
  const img = cosmeticImage(equippedDef(loadout, "emblem"));
  if (!img) return null;
  return (
    <span className="emblem-image" style={{ width: size, height: size }} aria-hidden="true">
      <img src={img} alt="" />
    </span>
  );
}
