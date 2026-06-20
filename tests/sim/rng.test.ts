import { describe, it, expect } from 'vitest';
import { createRng, nextFloat } from '../../src/sim/core/rng';

describe('mulberry32 RNG', () => {
  it('ist deterministisch für denselben Seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = [nextFloat(a), nextFloat(a), nextFloat(a)];
    const seqB = [nextFloat(b), nextFloat(b), nextFloat(b)];
    expect(seqA).toEqual(seqB);
  });

  it('liefert Werte in [0, 1)', () => {
    const r = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = nextFloat(r);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('unterscheidet sich bei verschiedenen Seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(nextFloat(a)).not.toEqual(nextFloat(b));
  });
});
