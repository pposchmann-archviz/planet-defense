import type { GameState } from '../core/GameState';
import { TERRA1_WAVES, getEnemy } from '../../content/enemies';
import { enemyHpMul } from '../formulas';
import { BALANCE } from '../../content/balance';

export function spawnDueEnemies(state: GameState): void {
  const w = state.wave;
  const wave = TERRA1_WAVES[state.currentRound - 1];
  if (!wave) return;
  const mul = enemyHpMul(state.currentRound);
  for (let g = 0; g < wave.length; g++) {
    const group = wave[g];
    const already = w.spawnedPerGroup[g] ?? 0;
    let count = already;
    for (let i = already; i < group.count; i++) {
      const dueAt = group.startDelayS + i * group.spacingS;
      if (w.elapsedS + 1e-9 >= dueAt) {
        const def = getEnemy(group.enemyId);
        const baseHp = def.isBoss ? def.baseHp * BALANCE.bossHpMult : def.baseHp;
        const hp = Math.floor(baseHp * mul);
        const angle = (state.nextEid * 2.399963) % (Math.PI * 2);
        state.enemies.push({
          eid: state.nextEid++,
          defId: def.id,
          hp,
          maxHp: hp,
          angle,
          progress: 0,
          alive: true,
          ...(def.isBoss
            ? { isBoss: true, bossPhase: 'vulnerable' as const, bossPhaseTimerS: BALANCE.bossShieldIntervalS }
            : {}),
        });
        count = i + 1;
      } else {
        break;
      }
    }
    w.spawnedPerGroup[g] = count;
  }
}

export function moveEnemies(state: GameState, dt: number): void {
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const def = getEnemy(e.defId);
    e.progress += def.speed * dt;
    if (e.progress >= 1) {
      state.planet.hp = Math.max(0, state.planet.hp - def.planetDamage);
      e.alive = false;
    }
  }
}
