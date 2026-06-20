// Reine, deterministische Spielformeln. Kein Zustand, keine I/O.
import { BALANCE } from '../content/balance';
import type { EnemyDef } from '../content/types';
import type { SkillNode } from '../content/skilltree';

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

// Tech-Punkte am Run-Ende.
export function techPunkte(besteRunde: number, bosseBesiegt: number, neueBestmarke: boolean): number {
  const { techBase, techDiv, techExp, techBossBonus, techRecordBonus } = BALANCE;
  const basis = besteRunde <= 0 ? 0 : Math.floor(techBase * Math.pow(besteRunde / techDiv, techExp));
  return basis + bosseBesiegt * techBossBonus + (neueBestmarke ? techRecordBonus : 0);
}

// Kosten, um einen Passiv-Knoten von currentLevel auf currentLevel+1 zu heben.
export function nodeCost(node: SkillNode, currentLevel: number): number {
  return Math.floor(node.kostenTp * Math.pow(BALANCE.passiveCostGrowth, currentLevel));
}
