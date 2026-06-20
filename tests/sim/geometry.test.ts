import { describe, it, expect } from 'vitest';
import { radiusAt, pathPosition, dist, towerPosition } from '../../src/sim/core/geometry';
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
  it('towerPosition: Slots gleichmäßig auf dem Turm-Ring', () => {
    const p0 = towerPosition(0);
    expect(Math.hypot(p0.x, p0.y)).toBeCloseTo(BALANCE.R_TOWERS, 6); // auf dem Ring
    expect(p0.x).toBeCloseTo(BALANCE.R_TOWERS, 6); // Slot 0 bei Winkel 0 (+x)
    const p3 = towerPosition(3); // 3/12 = 90°
    expect(p3.x).toBeCloseTo(0, 6);
    expect(p3.y).toBeCloseTo(BALANCE.R_TOWERS, 6);
  });
});
