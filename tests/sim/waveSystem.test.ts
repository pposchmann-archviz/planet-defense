import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/sim/core/GameState';
import { startWave, tickWave } from '../../src/sim/systems/waveSystem';
import { M2_WAVE } from '../../src/content/enemies';

describe('startWave', () => {
  it('wechselt von BUILD nach COMBAT und initialisiert die Welle', () => {
    const s = createInitialState(1);
    const ok = startWave(s);
    expect(ok).toBe(true);
    expect(s.phase).toBe('COMBAT');
    expect(s.wave.active).toBe(true);
    expect(s.wave.spawnedPerGroup).toEqual(M2_WAVE.map(() => 0));
    expect(s.focusUsed).toBe(false);
  });
  it('startet nicht außerhalb von BUILD', () => {
    const s = createInitialState(1); s.phase = 'COMBAT';
    expect(startWave(s)).toBe(false);
  });
});

describe('tickWave', () => {
  it('Niederlage: Planet-HP 0 → RUN_OVER', () => {
    const s = createInitialState(1); startWave(s);
    s.planet.hp = 0;
    tickWave(s, 1 / 30);
    expect(s.phase).toBe('RUN_OVER');
    expect(s.wave.active).toBe(false);
  });
  it('Sieg: alle gespawnt und keine lebenden Gegner → zurück zu BUILD', () => {
    const s = createInitialState(1); startWave(s);
    // alle Gruppen als komplett gespawnt markieren, keine lebenden Gegner
    s.wave.spawnedPerGroup = M2_WAVE.map((g) => g.count);
    s.wave.elapsedS = 999;
    s.enemies = [];
    tickWave(s, 1 / 30);
    expect(s.phase).toBe('BUILD');
    expect(s.wave.active).toBe(false);
  });
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
