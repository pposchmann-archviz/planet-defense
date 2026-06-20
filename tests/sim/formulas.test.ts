import { describe, it, expect } from 'vitest';
import { nextCost } from '../../src/sim/formulas';

describe('nextCost', () => {
  it('n=0 ist der Basispreis', () => {
    expect(nextCost(50, 1.12, 0)).toBe(50);
  });

  it('wächst geometrisch und wird abgerundet', () => {
    // 50 * 1.12^1 = 56
    expect(nextCost(50, 1.12, 1)).toBe(56);
    // 30 * 1.12^1 = 33.6 -> floor 33
    expect(nextCost(30, 1.12, 1)).toBe(33);
    // 30 * 1.12^2 = 37.632 -> floor 37
    expect(nextCost(30, 1.12, 2)).toBe(37);
  });

  it('ist monoton steigend', () => {
    let prev = nextCost(30, 1.12, 0);
    for (let n = 1; n < 10; n++) {
      const c = nextCost(30, 1.12, n);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });
});
