import type { GameState } from '../core/GameState';
import { M2_WAVE, getEnemy } from '../../content/enemies';

// Spawnt alle Gegner, die laut Schedule bis wave.elapsedS fällig sind.
export function spawnDueEnemies(state: GameState): void {
  const w = state.wave;
  for (let g = 0; g < M2_WAVE.length; g++) {
    const group = M2_WAVE[g];
    const already = w.spawnedPerGroup[g] ?? 0;
    let count = already;
    for (let i = already; i < group.count; i++) {
      const dueAt = group.startDelayS + i * group.spacingS;
      if (w.elapsedS + 1e-9 >= dueAt) {
        const def = getEnemy(group.enemyId);
        // Spawn-Winkel deterministisch über goldenen Winkel verteilt (kein RNG nötig).
        const angle = ((state.nextEid * 2.399963) % (Math.PI * 2));
        state.enemies.push({
          eid: state.nextEid++,
          defId: def.id,
          hp: def.baseHp,
          maxHp: def.baseHp,
          angle,
          progress: 0,
          alive: true,
        });
        count = i + 1;
      } else {
        break; // spätere Spawns dieser Gruppe sind noch nicht fällig
      }
    }
    w.spawnedPerGroup[g] = count;
  }
}

// Bewegt lebende Gegner nach innen; Durchbruch bei progress>=1.
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
