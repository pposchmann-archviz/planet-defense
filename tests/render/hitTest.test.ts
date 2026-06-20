import { describe, it, expect } from 'vitest';
import { pickFrontBuilding, pickEnemy } from '../../src/render/hitTest';
import { planetView, surfacePoint, buildingLonLat, enemyScreen } from '../../src/render/globeProjection';

const W = 640, H = 560;
const view = planetView(W, H);

describe('pickFrontBuilding', () => {
  it('trifft ein Vorderseiten-Gebäude bei Klick auf seinen Bildschirmpunkt', () => {
    const b = { iid: 7, slot: 0 };
    const ll = buildingLonLat(b);
    const p = surfacePoint(ll.lon, ll.lat, 0, view);
    expect(p.depth).toBeGreaterThan(0); // slot 0 ist bei timeS 0 vorne
    expect(pickFrontBuilding([b], 0, view, p.x, p.y)).toBe(7);
  });

  it('liefert null bei Klick weit weg', () => {
    const b = { iid: 7, slot: 0 };
    const ll = buildingLonLat(b);
    const p = surfacePoint(ll.lon, ll.lat, 0, view);
    expect(pickFrontBuilding([b], 0, view, p.x + 200, p.y + 200)).toBeNull();
  });

  it('ignoriert Rückseiten-Gebäude (depth <= 0.1)', () => {
    // Klick auf den projizierten Punkt eines Hinterseiten-Slots wird nicht getroffen.
    const b = { iid: 9, slot: 5 }; // ein Slot; finde eine Zeit, zu der es hinten ist
    const ll = buildingLonLat(b);
    // Zeit suchen, zu der depth < 0:
    let t = 0; let p = surfacePoint(ll.lon, ll.lat, t, view);
    for (let i = 0; i < 60 && p.depth > -0.2; i++) { t += 0.5; p = surfacePoint(ll.lon, ll.lat, t, view); }
    expect(p.depth).toBeLessThan(0.1);
    expect(pickFrontBuilding([b], t, view, p.x, p.y)).toBeNull();
  });
});

describe('pickEnemy', () => {
  it('trifft einen lebenden Gegner bei Klick auf seinen Bildschirmpunkt', () => {
    const e = { eid: 42, angle: 0, progress: 1, alive: true };
    const s = enemyScreen(e.angle, e.progress, view, W, H);
    expect(pickEnemy([e], view, W, H, s.x, s.y)).toBe(42);
  });

  it('ignoriert tote Gegner und ferne Klicks', () => {
    const dead = { eid: 1, angle: 0, progress: 1, alive: false };
    const s = enemyScreen(0, 1, view, W, H);
    expect(pickEnemy([dead], view, W, H, s.x, s.y)).toBeNull();
    const alive = { eid: 2, angle: 0, progress: 1, alive: true };
    expect(pickEnemy([alive], view, W, H, s.x + 100, s.y + 100)).toBeNull();
  });
});
