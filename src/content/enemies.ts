import type { EnemyDef, EnemyId, WaveSpawn } from './types';

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  laeufer: { id: 'laeufer', nameDe: 'Läufer', baseHp: 50, speed: 0.06, armor: 'light', planetDamage: 1, reward: 4, shape: 'circle', colorVar: '#5AB0FF' },
  schwarm: { id: 'schwarm', nameDe: 'Schwarm', baseHp: 12, speed: 0.08, armor: 'light', planetDamage: 1, reward: 1, shape: 'cluster', colorVar: '#B5E853' },
  brocken: { id: 'brocken', nameDe: 'Brocken', baseHp: 320, speed: 0.035, armor: 'heavy', planetDamage: 3, reward: 14, shape: 'hexagon', colorVar: '#7A8AB0' },
  // Endboss (Runde 10). Schild-Phase wird im bossSystem behandelt.
  zitadelle: {
    id: 'zitadelle', nameDe: 'Zitadelle', baseHp: 600, speed: 0.03, armor: 'heavy',
    planetDamage: 999, reward: 0, shape: 'hexagon', colorVar: '#FF4D5E', isBoss: true,
  },
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

// Terra-1: 10 handgesetzte Runden (Geschütz-schaffbar getunt). HP wird zur Laufzeit
// per enemyHpMul(round) skaliert — hier nur Zusammensetzung/Timing.
export const TERRA1_WAVES: WaveSpawn[][] = [
  /* R1 */ [{ enemyId: 'laeufer', count: 6, spacingS: 0.9, startDelayS: 0 }],
  /* R2 */ [{ enemyId: 'laeufer', count: 8, spacingS: 0.8, startDelayS: 0 }],
  /* R3 */ [{ enemyId: 'laeufer', count: 6, spacingS: 0.8, startDelayS: 0 }, { enemyId: 'schwarm', count: 4, spacingS: 0.3, startDelayS: 5 }],
  /* R4 */ [{ enemyId: 'laeufer', count: 6, spacingS: 0.7, startDelayS: 0 }, { enemyId: 'schwarm', count: 6, spacingS: 0.3, startDelayS: 4 }],
  /* R5 */ [{ enemyId: 'laeufer', count: 8, spacingS: 0.6, startDelayS: 0 }, { enemyId: 'brocken', count: 1, spacingS: 1, startDelayS: 6 }],
  /* R6 */ [{ enemyId: 'schwarm', count: 10, spacingS: 0.25, startDelayS: 0 }, { enemyId: 'laeufer', count: 4, spacingS: 0.6, startDelayS: 4 }],
  /* R7 */ [{ enemyId: 'brocken', count: 2, spacingS: 1.5, startDelayS: 0 }, { enemyId: 'laeufer', count: 4, spacingS: 0.6, startDelayS: 3 }],
  /* R8 */ [{ enemyId: 'brocken', count: 2, spacingS: 1.5, startDelayS: 0 }, { enemyId: 'schwarm', count: 6, spacingS: 0.25, startDelayS: 4 }],
  /* R9 */ [{ enemyId: 'laeufer', count: 6, spacingS: 0.6, startDelayS: 0 }, { enemyId: 'schwarm', count: 6, spacingS: 0.25, startDelayS: 3 }, { enemyId: 'brocken', count: 2, spacingS: 1.5, startDelayS: 6 }],
  /* R10 */ [{ enemyId: 'laeufer', count: 4, spacingS: 0.8, startDelayS: 0 }, { enemyId: 'zitadelle', count: 1, spacingS: 1, startDelayS: 3 }],
];
