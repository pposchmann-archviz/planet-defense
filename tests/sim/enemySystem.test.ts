import { describe, it, expect } from 'vitest';
import { createInitialState, type GameState } from '../../src/sim/core/GameState';
import { spawnDueEnemies, moveEnemies } from '../../src/sim/systems/enemySystem';
import { M2_WAVE } from '../../src/content/enemies';

function startedWave(): GameState {
  const s = createInitialState(1);
  s.phase = 'COMBAT';
  s.wave = { active: true, elapsedS: 0, spawnedPerGroup: M2_WAVE.map(() => 0) };
  return s;
}

describe('spawnDueEnemies', () => {
  it('spawnt die erste Läufer-Gruppe gestaffelt', () => {
    const s = startedWave();
    s.wave.elapsedS = 0;
    spawnDueEnemies(s);
    expect(s.enemies.length).toBe(1); // erster Läufer bei t=0
    s.wave.elapsedS = 0.8;
    spawnDueEnemies(s);
    expect(s.enemies.length).toBe(2); // zweiter nach spacing 0.8
  });
  it('respektiert startDelay der Schwarm-Gruppe', () => {
    const s = startedWave();
    s.wave.elapsedS = 5.9; // vor Schwarm-Start (6)
    spawnDueEnemies(s);
    const schwarm = s.enemies.filter((e) => e.defId === 'schwarm');
    expect(schwarm.length).toBe(0);
    s.wave.elapsedS = 6.0;
    spawnDueEnemies(s);
    expect(s.enemies.filter((e) => e.defId === 'schwarm').length).toBe(1);
  });
  it('spawnt jede Gruppe höchstens count-mal', () => {
    const s = startedWave();
    s.wave.elapsedS = 1000;
    spawnDueEnemies(s);
    const total = M2_WAVE.reduce((n, g) => n + g.count, 0);
    expect(s.enemies.length).toBe(total);
  });
});

describe('moveEnemies', () => {
  it('bewegt Gegner nach innen', () => {
    const s = startedWave();
    s.enemies.push({ eid: 1, defId: 'laeufer', hp: 50, maxHp: 50, angle: 0, progress: 0, alive: true });
    moveEnemies(s, 1.0); // 1 s bei speed 0.06
    expect(s.enemies[0].progress).toBeCloseTo(0.06, 6);
  });
  it('Durchbruch: Gegner bei progress>=1 macht Planetenschaden und stirbt', () => {
    const s = startedWave();
    s.planet.hp = 10;
    s.enemies.push({ eid: 1, defId: 'brocken', hp: 1, maxHp: 320, angle: 0, progress: 0.999, alive: true });
    moveEnemies(s, 1.0);
    expect(s.planet.hp).toBe(7); // brocken planetDamage 3
    expect(s.enemies[0].alive).toBe(false);
  });
});
