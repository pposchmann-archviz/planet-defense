import { describe, it, expect } from 'vitest';
import { createInitialState, type GameState } from '../../src/sim/core/GameState';
import { spawnDueEnemies, moveEnemies } from '../../src/sim/systems/enemySystem';
import { TERRA1_WAVES } from '../../src/content/enemies';
import { enemyHpMul } from '../../src/sim/formulas';

function startedWave(round = 1): GameState {
  const s = createInitialState(1);
  s.phase = 'COMBAT';
  s.currentRound = round;
  s.wave = { active: true, elapsedS: 0, spawnedPerGroup: TERRA1_WAVES[round - 1].map(() => 0) };
  return s;
}

describe('spawnDueEnemies', () => {
  it('spawnt die erste Läufer-Gruppe gestaffelt (Runde 1)', () => {
    const s = startedWave(1);
    s.wave.elapsedS = 0;
    spawnDueEnemies(s);
    expect(s.enemies.length).toBe(1); // erster Läufer bei t=0
    s.wave.elapsedS = 0.9;
    spawnDueEnemies(s);
    expect(s.enemies.length).toBe(2); // zweiter nach spacing 0.9
  });
  it('respektiert startDelay der Schwarm-Gruppe (Runde 3)', () => {
    const s = startedWave(3);
    s.wave.elapsedS = 4.9; // vor Schwarm-Start (5)
    spawnDueEnemies(s);
    const schwarm = s.enemies.filter((e) => e.defId === 'schwarm');
    expect(schwarm.length).toBe(0);
    s.wave.elapsedS = 5.0;
    spawnDueEnemies(s);
    expect(s.enemies.filter((e) => e.defId === 'schwarm').length).toBe(1);
  });
  it('spawnt jede Gruppe höchstens count-mal (Runde 1)', () => {
    const s = startedWave(1);
    s.wave.elapsedS = 1000;
    spawnDueEnemies(s);
    const total = TERRA1_WAVES[0].reduce((n, g) => n + g.count, 0);
    expect(s.enemies.length).toBe(total);
  });
});

describe('Runden-Skalierung', () => {
  it('skaliert Läufer-HP mit der Runde', () => {
    const s = startedWave(3); // enemyHpMul(3) = 1.1^2 = 1.21
    s.wave.elapsedS = 0;
    spawnDueEnemies(s);
    const laeufer = s.enemies.find((e) => e.defId === 'laeufer')!;
    expect(laeufer.maxHp).toBe(Math.floor(50 * enemyHpMul(3)));
  });
  it('spawnt den Boss in Runde 10 mit Boss-Feldern + skaliertem Boss-HP', () => {
    const s = startedWave(10);
    s.wave.elapsedS = 1000;
    spawnDueEnemies(s);
    const boss = s.enemies.find((e) => e.defId === 'zitadelle')!;
    expect(boss.isBoss).toBe(true);
    expect(boss.bossPhase).toBe('vulnerable');
    expect(boss.maxHp).toBe(Math.floor(600 * enemyHpMul(10) * 3)); // baseHp*mul*bossHpMult(3)
  });
});

describe('moveEnemies', () => {
  it('bewegt Gegner nach innen', () => {
    const s = startedWave(1);
    s.enemies.push({ eid: 1, defId: 'laeufer', hp: 50, maxHp: 50, angle: 0, progress: 0, alive: true });
    moveEnemies(s, 1.0); // 1 s bei speed 0.06
    expect(s.enemies[0].progress).toBeCloseTo(0.06, 6);
  });
  it('Durchbruch: Gegner bei progress>=1 macht Planetenschaden und stirbt', () => {
    const s = startedWave(1);
    s.planet.hp = 10;
    s.enemies.push({ eid: 1, defId: 'brocken', hp: 1, maxHp: 320, angle: 0, progress: 0.999, alive: true });
    moveEnemies(s, 1.0);
    expect(s.planet.hp).toBe(7); // brocken planetDamage 3
    expect(s.enemies[0].alive).toBe(false);
  });
});
