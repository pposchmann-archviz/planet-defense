import type { GameState } from '../core/GameState';
import { M2_WAVE } from '../../content/enemies';
import { spawnDueEnemies, moveEnemies } from './enemySystem';
import { tickCombatTurrets } from './combatSystem';

export function startWave(state: GameState): boolean {
  if (state.phase !== 'BUILD') return false;
  state.phase = 'COMBAT';
  state.wave = { active: true, elapsedS: 0, spawnedPerGroup: M2_WAVE.map(() => 0) };
  state.enemies = [];
  state.focusEid = null;
  state.focusTimerS = 0;
  state.focusUsed = false;
  return true;
}

function allSpawned(state: GameState): boolean {
  return M2_WAVE.every((g, i) => (state.wave.spawnedPerGroup[i] ?? 0) >= g.count);
}
function anyAlive(state: GameState): boolean {
  return state.enemies.some((e) => e.alive);
}

// Ein Combat-Tick der gesamten Welle: Zeit, Spawns, Bewegung, Türme, Fokus, Endbedingungen.
export function tickWave(state: GameState, dt: number): void {
  if (state.phase !== 'COMBAT' || !state.wave.active) return;

  state.wave.elapsedS += dt;

  // Fokus-Timer
  if (state.focusTimerS > 0) {
    state.focusTimerS -= dt;
    if (state.focusTimerS <= 0) { state.focusTimerS = 0; state.focusEid = null; }
  }

  spawnDueEnemies(state);
  moveEnemies(state, dt);
  tickCombatTurrets(state, dt);

  // tote Gegner entfernen (nach allen Sub-Systemen, stabile Reihenfolge)
  state.enemies = state.enemies.filter((e) => e.alive);

  // Endbedingungen
  if (state.planet.hp <= 0) {
    state.phase = 'RUN_OVER';
    state.wave.active = false;
    return;
  }
  if (allSpawned(state) && !anyAlive(state)) {
    state.phase = 'BUILD';
    state.wave.active = false;
  }
}
