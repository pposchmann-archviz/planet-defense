import type { UiSnapshot } from '../stores/gameStore.svelte';
import { getBuilding } from '../../content/buildings';
import { BALANCE } from '../../content/balance';
import { nextCost } from '../../sim/formulas';
import type { BuildingId } from '../../content/types';

export interface BuildTile {
  id: BuildingId;
  nameDe: string;
  cost: number;
  powerGen: number;
  powerCost: number;
  producesOre: number; // nur Eco, sonst 0
  damage: number;      // nur Waffe, sonst 0
  range: number;       // nur Waffe, sonst 0
  tags: string[];      // z.B. ['Slow'], ['Anti-Luft']
  isWeapon: boolean;
  locked: boolean;
  affordable: boolean;
  buildable: boolean;  // !locked && affordable && Phase BUILD
}

export function buildTile(snap: UiSnapshot, id: BuildingId): BuildTile {
  const def = getBuilding(id);
  const count = snap.buildings.filter((b) => b.defId === id).length;
  const cost = nextCost(def.baseCost, BALANCE.costGrowth, count);
  const isWeapon = def.category === 'weapon';
  const locked = def.category === 'weapon' && def.unlockNode != null && !snap.unlockedBuildings.includes(def.id);
  const affordable = snap.ore >= cost;
  const tags: string[] = [];
  if (def.category === 'weapon') {
    if (def.slowMult != null) tags.push('Slow');
    if (def.canHitAir) tags.push('Anti-Luft');
  }
  return {
    id,
    nameDe: def.nameDe,
    cost,
    powerGen: def.powerGen,
    powerCost: def.powerCost,
    producesOre: def.category === 'eco' ? def.producesOrePerTick : 0,
    damage: def.category === 'weapon' ? def.baseDamage : 0,
    range: def.category === 'weapon' ? def.range : 0,
    tags,
    isWeapon,
    locked,
    affordable,
    buildable: !locked && affordable && snap.phase === 'BUILD',
  };
}

export interface PopoverModel {
  iid: number;
  nameDe: string;
  level: number;
  maxLevel: number;
  maxed: boolean;
  isWeapon: boolean;
  damage: number;
  range: number;
  producesOre: number;
  upgradeCost: number;
  canUpgrade: boolean;
}

export function popoverModel(snap: UiSnapshot, iid: number): PopoverModel | null {
  const b = snap.buildings.find((x) => x.iid === iid);
  if (!b) return null;
  const def = getBuilding(b.defId);
  const maxed = b.level >= def.maxLevel;
  const upgradeCost = nextCost(def.baseCost, BALANCE.costGrowth, b.level);
  return {
    iid,
    nameDe: def.nameDe,
    level: b.level,
    maxLevel: def.maxLevel,
    maxed,
    isWeapon: def.category === 'weapon',
    damage: def.category === 'weapon' ? def.baseDamage : 0,
    range: def.category === 'weapon' ? def.range : 0,
    producesOre: def.category === 'eco' ? def.producesOrePerTick : 0,
    upgradeCost,
    canUpgrade: !maxed && snap.ore >= upgradeCost && snap.phase === 'BUILD',
  };
}
