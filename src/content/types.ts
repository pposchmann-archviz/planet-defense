export type BuildingId = 'kraftwerk' | 'erz_sammler' | 'geschuetz' | 'artillery' | 'laser';
export type BuildingCategory = 'eco' | 'weapon';
export type DamageType = 'kinetic' | 'explosive' | 'energy';
export type ArmorType = 'light' | 'heavy' | 'shield';
export type EnemyId = 'laeufer' | 'schwarm' | 'brocken' | 'zitadelle' | 'schild_drohne';

export interface BuildingBase {
  id: BuildingId;
  nameDe: string;
  baseCost: number;
  powerGen: number;   // 0 außer Kraftwerk
  powerCost: number;  // 0 außer Verbraucher
  maxLevel: number;
  unlockNode?: string | null; // null = Basis (immer baubar); Skill-Knoten-id = Unlock nötig
}
export interface EcoBuildingDef extends BuildingBase {
  category: 'eco';
  producesOrePerTick: number;
}
export interface WeaponDef extends BuildingBase {
  category: 'weapon';
  damageType: DamageType;
  baseDamage: number;
  fireRate: number; // Schuss/s
  range: number; // Sim-Einheiten
  splashRadius?: number; // Flächenschaden-Radius (ballistische Waffen)
  projectileSpeed?: number; // undefined = Hitscan
  canHitAir?: boolean;   // M6: Flak
  slowMult?: number;     // M6: Frost (z.B. 0.5)
  slowDurationS?: number;// M6: Frost
}
export type BuildingDef = EcoBuildingDef | WeaponDef;

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
