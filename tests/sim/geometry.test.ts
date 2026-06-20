import { describe, it, expect } from 'vitest';
import { radiusAt, pathPosition, dist } from '../../src/sim/core/geometry';
import { BALANCE } from '../../src/content/balance';

describe('Geometrie', () => {
  it('radiusAt: progress 0 = Rand, 1 = Planet', () => {
    expect(radiusAt(0)).toBe(BALANCE.R_SPAWN);
    expect(radiusAt(1)).toBe(BALANCE.R_PLANET);
  });
  it('pathPosition liegt auf dem erwarteten Radius', () => {
    const p = pathPosition(0, 0.5);
    const r = (BALANCE.R_SPAWN + BALANCE.R_PLANET) / 2;
    expect(p.x).toBeCloseTo(r, 6);
    expect(p.y).toBeCloseTo(0, 6);
  });
  it('dist ist euklidisch', () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
