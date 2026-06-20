// Reine, deterministische Spielformeln. Kein Zustand, keine I/O.
import { BALANCE } from '../content/balance';

// Ganzzahlige Kosten der n-ten Anschaffung: base * growth^n, abgerundet.
export function nextCost(base: number, growth: number, n: number): number {
  return Math.floor(base * Math.pow(growth, n));
}

// HP-Skalierung pro Runde (1-basiert): enemyHpGrowth^(round-1).
export function enemyHpMul(round: number): number {
  return Math.pow(BALANCE.enemyHpGrowth, Math.max(0, round - 1));
}
