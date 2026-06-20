import type { BuildingDef, BuildingId } from './types';

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  kraftwerk: {
    id: 'kraftwerk', nameDe: 'Kraftwerk', category: 'eco',
    baseCost: 50, powerGen: 20, powerCost: 0, producesOrePerTick: 0, maxLevel: 8,
  },
  erz_sammler: {
    id: 'erz_sammler', nameDe: 'Erz-Sammler', category: 'eco',
    baseCost: 30, powerGen: 0, powerCost: 4, producesOrePerTick: 2, maxLevel: 8,
  },
  geschuetz: {
    id: 'geschuetz', nameDe: 'Geschützturm', category: 'weapon',
    baseCost: 80, powerGen: 0, powerCost: 8, maxLevel: 8,
    damageType: 'kinetic', baseDamage: 6, fireRate: 2, range: 220, // projectileSpeed undefined = Hitscan
    unlockNode: null, // Basis, immer da
  },
  artillery: {
    id: 'artillery', nameDe: 'Artilleriegeschütz', category: 'weapon',
    baseCost: 130, powerGen: 0, powerCost: 14, maxLevel: 8,
    damageType: 'explosive', baseDamage: 18, fireRate: 0.6, range: 200, splashRadius: 60, projectileSpeed: 500,
    unlockNode: 'u_artillerie',
  },
  laser: {
    id: 'laser', nameDe: 'Laser-Emitter', category: 'weapon',
    baseCost: 150, powerGen: 0, powerCost: 12, maxLevel: 8,
    damageType: 'energy', baseDamage: 9, fireRate: 1.5, range: 200,
    unlockNode: 'u_laser', // projectileSpeed undefined = Hitscan
  },
  railgun: {
    id: 'railgun', nameDe: 'Railgun', category: 'weapon',
    baseCost: 200, powerGen: 0, powerCost: 16, maxLevel: 8,
    damageType: 'kinetic', baseDamage: 40, fireRate: 0.8, range: 280,
    unlockNode: 'u_railgun', // projectileSpeed undefined = Hitscan (Burst)
  },
  frost: {
    id: 'frost', nameDe: 'Frostturm', category: 'weapon',
    baseCost: 120, powerGen: 0, powerCost: 10, maxLevel: 8,
    damageType: 'energy', baseDamage: 4, fireRate: 1.5, range: 200,
    slowMult: 0.5, slowDurationS: 2,
    unlockNode: 'u_frost',
  },
  flak: {
    id: 'flak', nameDe: 'Flak-Geschütz', category: 'weapon',
    baseCost: 160, powerGen: 0, powerCost: 12, maxLevel: 8,
    damageType: 'explosive', baseDamage: 10, fireRate: 1.2, range: 240,
    canHitAir: true,
    unlockNode: 'u_flak',
  },
};

export const ECO_BUILDING_IDS: BuildingId[] = ['kraftwerk', 'erz_sammler'];
export const WEAPON_BUILDING_IDS: BuildingId[] = ['geschuetz', 'artillery', 'laser', 'railgun', 'frost', 'flak'];
export const BUILDABLE_IDS: BuildingId[] = [...ECO_BUILDING_IDS, ...WEAPON_BUILDING_IDS];

export function getBuilding(id: string): BuildingDef {
  const def = (BUILDINGS as Record<string, BuildingDef>)[id];
  if (!def) throw new Error(`Unbekannte Gebäude-id: ${id}`);
  return def;
}
