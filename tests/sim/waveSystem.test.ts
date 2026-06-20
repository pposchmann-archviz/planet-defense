import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/sim/core/GameState';
import { startWave, tickWave } from '../../src/sim/systems/waveSystem';
import { TERRA1_WAVES } from '../../src/content/enemies';

describe('startWave', () => {
  it('wechselt von BUILD nach COMBAT und initialisiert die Welle', () => {
    const s = createInitialState(1);
    const ok = startWave(s);
    expect(ok).toBe(true);
    expect(s.phase).toBe('COMBAT');
    expect(s.wave.active).toBe(true);
    expect(s.wave.spawnedPerGroup).toEqual(TERRA1_WAVES[s.currentRound - 1].map(() => 0));
    expect(s.focusUsed).toBe(false);
  });
  it('startet nicht außerhalb von BUILD', () => {
    const s = createInitialState(1); s.phase = 'COMBAT';
    expect(startWave(s)).toBe(false);
  });
});

describe('tickWave', () => {
  it('läuft weiter solange Gegner leben oder noch nicht alle gespawnt sind', () => {
    const s = createInitialState(1); startWave(s);
    tickWave(s, 1 / 30); // t klein, noch am Spawnen
    expect(s.phase).toBe('COMBAT');
    expect(s.enemies.length).toBeGreaterThan(0);
  });
  it('zählt den Fokus-Timer runter', () => {
    const s = createInitialState(1); startWave(s);
    s.focusEid = 1; s.focusTimerS = 0.05;
    tickWave(s, 1 / 30);
    expect(s.focusTimerS).toBeLessThan(0.05);
    // läuft ab → focusEid wird null
    tickWave(s, 1);
    expect(s.focusEid).toBeNull();
  });
});

describe('tickWave: Runden-Fortschritt', () => {
  it('Wellensieg in Runde < 10 erhöht die Runde und geht zu BUILD', () => {
    const s = createInitialState(1); startWave(s); // Runde 1
    s.wave.spawnedPerGroup = TERRA1_WAVES[0].map((g) => g.count);
    s.wave.elapsedS = 999; s.enemies = [];
    tickWave(s, 1 / 30);
    expect(s.phase).toBe('BUILD');
    expect(s.currentRound).toBe(2);
    expect(s.highestRoundCleared).toBe(1);
  });
  it('Sieg in Runde 10 (Boss-Runde geräumt) → RUN_WON', () => {
    const s = createInitialState(1);
    s.currentRound = 10; startWave(s);
    s.wave.spawnedPerGroup = TERRA1_WAVES[9].map((g) => g.count);
    s.wave.elapsedS = 999; s.enemies = [];
    tickWave(s, 1 / 30);
    expect(s.phase).toBe('RUN_WON');
    expect(s.highestRoundCleared).toBe(10);
  });
  it('Niederlage: Planet-HP 0 → RUN_OVER (jederzeit)', () => {
    const s = createInitialState(1); startWave(s);
    s.planet.hp = 0;
    tickWave(s, 1 / 30);
    expect(s.phase).toBe('RUN_OVER');
  });
});
