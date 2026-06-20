import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/sim/core/GameState';
import { tick } from '../../src/sim/core/engine';
import { hashState } from '../../src/sim/core/hash';
import { BALANCE } from '../../src/content/balance';

describe('Golden / Determinismus', () => {
  it('produziert einen stabilen End-State-Hash (fixer Seed, 300 Ticks)', () => {
    const s = createInitialState(12345);
    for (let i = 0; i < 300; i++) tick(s, BALANCE.COMBAT_STEP_S);
    expect(hashState(s)).toMatchSnapshot();
  });

  it('gleicher Seed → gleicher Hash, anderer Seed → anderer Hash', () => {
    const run = (seed: number) => {
      const s = createInitialState(seed);
      for (let i = 0; i < 300; i++) tick(s, BALANCE.COMBAT_STEP_S);
      return hashState(s);
    };
    expect(run(12345)).toBe(run(12345));
    expect(run(12345)).not.toBe(run(54321));
  });
});
