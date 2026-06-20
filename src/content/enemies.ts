import type { EnemyDef, EnemyId, WaveSpawn } from './types';

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  laeufer: { id: 'laeufer', nameDe: 'Läufer', baseHp: 50, speed: 0.06, armor: 'light', planetDamage: 1, reward: 4, shape: 'circle', colorVar: '#5AB0FF' },
  schwarm: { id: 'schwarm', nameDe: 'Schwarm', baseHp: 12, speed: 0.08, armor: 'light', planetDamage: 1, reward: 1, shape: 'cluster', colorVar: '#B5E853' },
  brocken: { id: 'brocken', nameDe: 'Brocken', baseHp: 320, speed: 0.035, armor: 'heavy', planetDamage: 3, reward: 14, shape: 'hexagon', colorVar: '#7A8AB0' },
};

export function getEnemy(id: string): EnemyDef {
  const def = (ENEMIES as Record<string, EnemyDef>)[id];
  if (!def) throw new Error(`Unbekannte Gegner-id: ${id}`);
  return def;
}

// Fixe, deterministische M2-Welle (lehrt: Grundtakt → Schwarm → Tank).
export const M2_WAVE: WaveSpawn[] = [
  { enemyId: 'laeufer', count: 6, spacingS: 0.8, startDelayS: 0 },
  { enemyId: 'schwarm', count: 5, spacingS: 0.35, startDelayS: 6 },
  { enemyId: 'brocken', count: 1, spacingS: 1, startDelayS: 10 },
];
