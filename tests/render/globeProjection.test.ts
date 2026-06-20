import { describe, it, expect } from 'vitest';
import { planetView, surfacePoint, buildingLonLat, enemyScreen, SPIN_RATE } from '../../src/render/globeProjection';

describe('planetView', () => {
  it('zentriert + Radius = 30% der kleineren Kante', () => {
    const v = planetView(800, 600);
    expect(v.cx).toBe(400);
    expect(v.cy).toBe(300);
    expect(v.R).toBeCloseTo(180, 6); // 0.3 * 600
  });
});

describe('surfacePoint', () => {
  it('lon0/lat0/timeS0 = Vorderseite mittig', () => {
    const v = planetView(800, 600);
    const p = surfacePoint(0, 0, 0, v);
    expect(p.x).toBeCloseTo(v.cx, 6);
    expect(p.depth).toBeCloseTo(1, 6); // vorne
  });
  it('lon=PI = Rückseite (depth negativ)', () => {
    const v = planetView(800, 600);
    expect(surfacePoint(Math.PI, 0, 0, v).depth).toBeCloseTo(-1, 6);
  });
  it('Spin verschiebt den Längengrad über die Zeit', () => {
    const v = planetView(800, 600);
    const a = surfacePoint(0, 0, 0, v);
    const b = surfacePoint(0, 0, 1, v); // +SPIN_RATE rad
    expect(b.depth).toBeLessThan(a.depth); // dreht aus der Frontmitte heraus
  });
});

describe('buildingLonLat', () => {
  it('Waffe nutzt Slot-Index als Längengrad', () => {
    expect(buildingLonLat({ slot: 0, iid: 1 }).lon).toBeCloseTo(0, 6);
  });
  it('Eco-Gebäude (kein Slot) bekommt deterministische Position', () => {
    const a = buildingLonLat({ iid: 3 });
    const b = buildingLonLat({ iid: 3 });
    expect(a).toEqual(b);
    expect(a.lat).not.toBe(buildingLonLat({ slot: 0, iid: 1 }).lat);
  });
});

describe('enemyScreen', () => {
  it('progress 1 = nahe am Planeten, progress 0 = weit im All', () => {
    const v = planetView(800, 600);
    const near = enemyScreen(0, 1, v, 800, 600);
    const far = enemyScreen(0, 0, v, 800, 600);
    const dNear = Math.hypot(near.x - v.cx, near.y - v.cy);
    const dFar = Math.hypot(far.x - v.cx, far.y - v.cy);
    expect(dNear).toBeLessThan(dFar);
    expect(dNear).toBeCloseTo(v.R * 1.05, 4);
  });
});

// SPIN_RATE referenziert (noUnusedLocals guard)
void SPIN_RATE;
