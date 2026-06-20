import type { GameState } from '../core/GameState';
import { TERRA1_WAVES } from '../../content/enemies';
import { BALANCE } from '../../content/balance';
import { spawnDueEnemies, moveEnemies } from './enemySystem';
import { tickCombatTurrets } from './combatSystem';
import { tickProjectiles } from './projectileSystem';
import { tickBossPhases } from './bossSystem';

export function startWave(state: GameState): boolean {
  if (state.phase !== 'BUILD') return false;
  const wave = TERRA1_WAVES[state.currentRound - 1];
  if (!wave) return false;
  state.phase = 'COMBAT';
  state.wave = { active: true, elapsedS: 0, spawnedPerGroup: wave.map(() => 0) };
  state.enemies = [];
  state.focusEid = null;
  state.focusTimerS = 0;
  state.focusUsed = false;
  return true;
}

function allSpawned(state: GameState): boolean {
  const wave = TERRA1_WAVES[state.currentRound - 1];
  return wave.every((g, i) => (state.wave.spawnedPerGroup[i] ?? 0) >= g.count);
}
function anyAlive(state: GameState): boolean {
  return state.enemies.some((e) => e.alive);
}

export function tickWave(state: GameState, dt: number): void {
  if (state.phase !== 'COMBAT' || !state.wave.active) return;

  state.wave.elapsedS += dt;

  if (state.focusTimerS > 0) {
    state.focusTimerS -= dt;
    if (state.focusTimerS <= 0) { state.focusTimerS = 0; state.focusEid = null; }
  }

  spawnDueEnemies(state);
  tickBossPhases(state, dt);
  moveEnemies(state, dt);
  tickCombatTurrets(state, dt);
  tickProjectiles(state, dt);
  state.enemies = state.enemies.filter((e) => e.alive);

  // Niederlage zuerst
  if (state.planet.hp <= 0) {
    state.phase = 'RUN_OVER';
    state.wave.active = false;
    return;
  }
  // Welle geräumt
  if (allSpawned(state) && !anyAlive(state)) {
    state.wave.active = false;
    if (state.currentRound > state.highestRoundCleared) state.highestRoundCleared = state.currentRound;
    if (state.currentRound >= BALANCE.TERRA1_ROUNDS) {
      state.phase = 'RUN_WON';
    } else {
      state.currentRound += 1;
      state.phase = 'BUILD';
    }
  }
}
