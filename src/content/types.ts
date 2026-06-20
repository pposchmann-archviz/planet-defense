export type BuildingId = 'kraftwerk' | 'erz_sammler';
export type BuildingCategory = 'eco' | 'weapon'; // 'weapon' ab M2

export interface BuildingDef {
  id: BuildingId;
  nameDe: string;
  category: BuildingCategory;
  baseCost: number; // Erz
  powerGen: number; // > 0 nur Erzeuger; skaliert mit Level
  powerCost: number; // > 0 Verbraucher; konstant über Level
  producesOrePerTick: number; // Erz/Sekunde auf Level 1; skaliert mit Level
  maxLevel: number;
}
