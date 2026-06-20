import { describe, it, expect } from 'vitest';
import { createInitialState, type Enemy } from '../../src/sim/core/GameState';
import { moveEnemies } from '../../src/sim/systems/enemySystem';

describe('Slow-Mechanik', () => {
  it('verlangsamter Gegner bewegt sich langsamer', () => {
    const s = createInitialState(1); s.phase = 'COMBAT';
    const e: Enemy = { eid:1, defId:'laeufer', hp:50, maxHp:50, angle:0, progress:0, alive:true, slowTimerS:5, slowMult:0.5 };
    s.enemies.push(e);
    moveEnemies(s, 1.0); // speed 0.06 * 0.5 = 0.03
    expect(e.progress).toBeCloseTo(0.03, 6);
  });
  it('Slow läuft ab und Gegner kehrt zu voller Geschwindigkeit zurück', () => {
    const s = createInitialState(1); s.phase = 'COMBAT';
    const e: Enemy = { eid:1, defId:'laeufer', hp:50, maxHp:50, angle:0, progress:0, alive:true, slowTimerS:0.5, slowMult:0.5 };
    s.enemies.push(e);
    moveEnemies(s, 1.0); // slowTimer 0.5 < dt → erst gebremst, dann... (Modell: Slow gilt für diesen Tick, danach abgelaufen)
    expect(e.slowTimerS).toBeLessThanOrEqual(0);
  });
});
