import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/sim/core/GameState';
import { tick } from '../../src/sim/core/engine';
import { BALANCE } from '../../src/content/balance';

describe('engine.tick (Platzhalter bis Eco-System)', () => {
  it('zählt Ticks und Zeit deterministisch hoch', () => {
    const s = createInitialState(7);
    for (let i = 0; i < 30; i++) tick(s, BALANCE.COMBAT_STEP_S);
    expect(s.tick).toBe(30);
    expect(s.timeS).toBeCloseTo(1.0, 6);
  });

  it('zwei Läufe mit gleichem Seed sind byte-identisch', () => {
    const a = createInitialState(99);
    const b = createInitialState(99);
    for (let i = 0; i < 100; i++) {
      tick(a, BALANCE.COMBAT_STEP_S);
      tick(b, BALANCE.COMBAT_STEP_S);
    }
    expect(a).toEqual(b);
  });
});
