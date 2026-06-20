import { BALANCE } from '../content/balance';

export const SPIN_RATE = (Math.PI * 2) / 30; // 1 Umdrehung / 30 s (ambient)
const R_FAR_FACTOR = 1.35;

export interface PlanetView { cx: number; cy: number; R: number; }
export interface SurfacePt { x: number; y: number; depth: number; }
export interface Vec2 { x: number; y: number; }

export function planetView(w: number, h: number): PlanetView {
  return { cx: w / 2, cy: h / 2, R: Math.min(w, h) * 0.3 };
}

// Oberflächenpunkt: lon/lat (Breite) zur Zeit timeS → Bildschirm + depth (>0 = Vorderseite).
export function surfacePoint(lon: number, lat: number, timeS: number, view: PlanetView): SurfacePt {
  const l = lon + timeS * SPIN_RATE;
  const cl = Math.cos(lat);
  return {
    x: view.cx + view.R * cl * Math.sin(l),
    y: view.cy - view.R * Math.sin(lat),
    depth: cl * Math.cos(l),
  };
}

// Gebäude → fixer Längengrad/Breitengrad (deterministisch, render-only).
export function buildingLonLat(b: { slot?: number; iid: number }): { lon: number; lat: number } {
  if (b.slot !== undefined) {
    return { lon: (b.slot / BALANCE.TOWER_SLOTS) * Math.PI * 2, lat: -0.15 + (b.slot % 2) * 0.3 };
  }
  return { lon: (b.iid * 2.399963) % (Math.PI * 2), lat: 0.55 };
}

// Gegner angle+progress → Bildschirmposition um den Globus (weit → nah).
export function enemyScreen(angle: number, progress: number, view: PlanetView, w: number, h: number): Vec2 {
  const rFar = Math.hypot(w, h) * 0.5 * R_FAR_FACTOR;
  const p = Math.max(0, Math.min(1, progress));
  const r = rFar + (view.R * 1.05 - rFar) * p;
  return { x: view.cx + Math.cos(angle) * r, y: view.cy + Math.sin(angle) * r };
}
