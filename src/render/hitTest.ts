import { surfacePoint, buildingLonLat, enemyScreen, type PlanetView } from './globeProjection';

// Vorderseiten-Gebäude, dessen projizierter Punkt dem Klick am nächsten liegt (depth > 0.1), sonst null.
export function pickFrontBuilding(
  buildings: { iid: number; slot?: number }[],
  timeS: number,
  view: PlanetView,
  mx: number,
  my: number,
): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const b of buildings) {
    const ll = buildingLonLat(b);
    const p = surfacePoint(ll.lon, ll.lat, timeS, view);
    if (p.depth <= 0.1) continue; // nur Vorderseite klickbar
    const size = 6 + 7 * Math.max(0, p.depth); // identisch zum Renderer-Trefferkreis
    const d = Math.hypot(p.x - mx, p.y - my);
    if (d <= size + 8 && d < bestD) { bestD = d; best = b.iid; }
  }
  return best;
}

// Lebender Gegner, dessen projizierter Punkt dem Klick am nächsten liegt (<= 24 px), sonst null.
export function pickEnemy(
  enemies: { eid: number; angle: number; progress: number; alive: boolean }[],
  view: PlanetView,
  w: number,
  h: number,
  mx: number,
  my: number,
): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const e of enemies) {
    if (!e.alive) continue;
    const s = enemyScreen(e.angle, e.progress, view, w, h);
    const d = Math.hypot(s.x - mx, s.y - my);
    if (d <= 24 && d < bestD) { bestD = d; best = e.eid; }
  }
  return best;
}
