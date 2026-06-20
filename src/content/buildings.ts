import type { BuildingDef, BuildingId } from './types';

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  kraftwerk: {
    id: 'kraftwerk',
    nameDe: 'Kraftwerk',
    category: 'eco',
    baseCost: 50,
    powerGen: 20,
    powerCost: 0,
    producesOrePerTick: 0,
    maxLevel: 8,
  },
  erz_sammler: {
    id: 'erz_sammler',
    nameDe: 'Erz-Sammler',
    category: 'eco',
    baseCost: 30,
    powerGen: 0,
    powerCost: 4,
    producesOrePerTick: 2,
    maxLevel: 8,
  },
};

// Bau-Reihenfolge in der UI (stabil, deterministisch).
export const ECO_BUILDING_IDS: BuildingId[] = ['kraftwerk', 'erz_sammler'];

export function getBuilding(id: string): BuildingDef {
  const def = (BUILDINGS as Record<string, BuildingDef>)[id];
  if (!def) throw new Error(`Unbekannte Gebäude-id: ${id}`);
  return def;
}
