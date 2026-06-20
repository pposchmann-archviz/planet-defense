import type { GameState } from './core/GameState';
import { TERRA1_WAVES, getEnemy } from '../content/enemies';
import { getBuilding } from '../content/buildings';
import { scaledEnemyHp } from './formulas';
import { BALANCE } from '../content/balance';

export interface WavePreviewGroup { enemyId: string; nameDe: string; count: number; isBoss: boolean; }
export interface WavePreview {
  round: number;
  groups: WavePreviewGroup[];
  totalHp: number;
  playerDps: number;
  ratio: number; // playerDps / (totalHp / referenzzeit)
  assessment: 'leicht' | 'machbar' | 'hart';
}

export function previewWave(state: GameState): WavePreview {
  const round = state.currentRound;
  const wave = TERRA1_WAVES[round - 1] ?? [];
  const groups: WavePreviewGroup[] = [];
  let totalHp = 0;
  for (const g of wave) {
    const def = getEnemy(g.enemyId);
    totalHp += scaledEnemyHp(def, round) * g.count;
    groups.push({ enemyId: def.id, nameDe: def.nameDe, count: g.count, isBoss: !!def.isBoss });
  }
  // Spieler-DPS (grobe Heuristik): Σ baseDamage * fireRate * levelMult * coverage über Waffen.
  let playerDps = 0;
  for (const b of state.buildings) {
    const def = getBuilding(b.defId);
    if (def.category !== 'weapon') continue;
    const levelMult = Math.pow(BALANCE.towerLevelDamageMult, b.level - 1);
    playerDps += (def.baseDamage ?? 0) * (def.fireRate ?? 0) * levelMult * state.power.coverage;
  }
  // Referenz: schaffe ich totalHp in ~20 s? ratio>1 = leicht.
  const REF_S = 20;
  const ratio = playerDps <= 0 ? 0 : playerDps / (totalHp / REF_S);
  const assessment = ratio >= 1.5 ? 'leicht' : ratio >= 0.8 ? 'machbar' : 'hart';
  return { round, groups, totalHp, playerDps, ratio, assessment };
}
