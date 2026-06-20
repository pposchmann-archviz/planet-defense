import type { GameState, Enemy } from '../core/GameState';
import type { DamageType } from '../../content/types';
import { getEnemy } from '../../content/enemies';
import { DAMAGE_MATRIX } from '../../content/damageMatrix';
import { BALANCE } from '../../content/balance';

// Gemeinsame Schadensanwendung für Hitscan (combatSystem) und Splash (projectileSystem).
// Kapselt: Schild-Skip (Boss unverwundbar), Matrix×Level×Meta, hp-=, Kill→Boss-Count+Reward.
export function applyDamage(
  state: GameState,
  enemy: Enemy,
  baseDamage: number,
  damageType: DamageType,
  level: number,
): void {
  // Boss in Schild-Phase ist unverwundbar.
  if (enemy.isBoss && enemy.bossPhase === 'shield') return;
  const enemyDef = getEnemy(enemy.defId);
  const levelMult = Math.pow(BALANCE.towerLevelDamageMult, level - 1);
  const dmg = baseDamage * DAMAGE_MATRIX[damageType][enemyDef.armor] * levelMult * state.meta.turmSchadenMult;
  enemy.hp -= dmg;
  if (enemy.hp <= 0) {
    enemy.alive = false;
    if (enemy.isBoss) state.bossesKilledThisRun += 1;
    state.ore = Math.min(state.oreStorageCap, state.ore + enemyDef.reward);
  }
}
