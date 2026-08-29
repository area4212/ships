import { ShipDef } from "../types/game";

export const FLEET: ShipDef[] = [
  { id: "porte-avions", name: "Porte-avions", size: 5 },
  { id: "croiseur", name: "Croiseur", size: 4 },
  { id: "contre-torpilleur", name: "Contre-torpilleur", size: 3 },
  { id: "sous-marin", name: "Sous-marin", size: 3 },
  { id: "torpilleur", name: "Torpilleur", size: 2 },
];

// A smaller fleet is used automatically for small board sizes (8x8) so that
// placement stays comfortable. See getFleetForSize below.
export const FLEET_SMALL: ShipDef[] = [
  { id: "porte-avions", name: "Porte-avions", size: 4 },
  { id: "croiseur", name: "Croiseur", size: 3 },
  { id: "contre-torpilleur", name: "Contre-torpilleur", size: 3 },
  { id: "torpilleur", name: "Torpilleur", size: 2 },
];

export function getFleetForSize(size: number): ShipDef[] {
  return size <= 8 ? FLEET_SMALL : FLEET;
}
