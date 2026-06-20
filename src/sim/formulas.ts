// Reine, deterministische Spielformeln. Kein Zustand, keine I/O.
import { BALANCE } from '../content/balance';
import type { EnemyDef } from '../content/types';

// Ganzzahlige Kosten der n-ten Anschaffung: base * growth^n, abgerundet.
export function nextCost(base: number, growth: number, n: number): number {
  return Math.floor(base * Math.pow(growth, n));
}

// HP-Skalierung pro Runde (1-basiert): enemyHpGrowth^(round-1).
export function enemyHpMul(round: number): number {
  return Math.pow(BALANCE.enemyHpGrowth, Math.max(0, round - 1));
}

// Skalierte Spawn-HP eines Gegners in einer Runde (Boss inkl. bossHpMult). EINE Quelle für Spawn + Vorschau.
export function scaledEnemyHp(def: EnemyDef, round: number): number {
  const base = def.isBoss ? def.baseHp * BALANCE.bossHpMult : def.baseHp;
  return Math.floor(base * enemyHpMul(round));
}
