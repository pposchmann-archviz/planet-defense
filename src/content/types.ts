export type BuildingId = 'kraftwerk' | 'erz_sammler' | 'geschuetz' | 'artillery' | 'laser';
export type BuildingCategory = 'eco' | 'weapon';
export type DamageType = 'kinetic' | 'explosive' | 'energy';
export type ArmorType = 'light' | 'heavy' | 'shield';
export type EnemyId = 'laeufer' | 'schwarm' | 'brocken' | 'zitadelle' | 'schild_drohne';

export interface BuildingDef {
  id: BuildingId;
  nameDe: string;
  category: BuildingCategory;
  baseCost: number;
  powerGen: number;
  powerCost: number;
  producesOrePerTick: number;
  maxLevel: number;
  // weapon-only (undefined für eco):
  damageType?: DamageType;
  baseDamage?: number;
  fireRate?: number; // Schuss/s
  range?: number; // Sim-Einheiten
  projectileSpeed?: number; // undefined = Hitscan
  splashRadius?: number; // Flächenschaden-Radius (ballistische Waffen)
  unlockNode?: string | null; // null = Basis (immer baubar); Skill-Knoten-id = Unlock nötig
}

export interface EnemyDef {
  id: EnemyId;
  nameDe: string;
  baseHp: number;
  speed: number; // progress/s
  armor: ArmorType;
  planetDamage: number;
  reward: number; // In-Run-Erz pro Kill
  shape: 'circle' | 'cluster' | 'hexagon';
  colorVar: string;
  isBoss?: boolean;        // true nur für Boss-Gegner
  bossHp?: number;         // optionaler Override; sonst baseHp * bossHpMult genutzt
}

export interface WaveSpawn {
  enemyId: EnemyId;
  count: number;
  spacingS: number; // Abstand zwischen Spawns dieser Gruppe
  startDelayS: number; // Verzögerung ab Wellenstart
}
