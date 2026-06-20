import { BALANCE } from '../../content/balance';

export interface Vec2 { x: number; y: number; }

export function radiusAt(progress: number): number {
  return BALANCE.R_SPAWN + (BALANCE.R_PLANET - BALANCE.R_SPAWN) * progress;
}

export function pathPosition(angle: number, progress: number): Vec2 {
  const r = radiusAt(progress);
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}

export function towerPosition(slot: number): Vec2 {
  const a = slot * ((Math.PI * 2) / BALANCE.TOWER_SLOTS);
  return { x: Math.cos(a) * BALANCE.R_TOWERS, y: Math.sin(a) * BALANCE.R_TOWERS };
}

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
