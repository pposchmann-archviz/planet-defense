import type { GameState, Projectile } from '../core/GameState';
import type { DamageType } from '../../content/types';
import { pathPosition, dist } from '../core/geometry';
import { applyDamage } from './damage';

interface ShotSpec { damage: number; damageType: DamageType; level: number; splashRadius: number; speed: number; }

export function spawnProjectile(state: GameState, from: { x: number; y: number }, to: { x: number; y: number }, spec: ShotSpec): void {
  // Pool: wiederverwende ein totes Projektil, sonst neu.
  const dead = state.projectiles.find((p) => !p.alive);
  const p: Projectile = dead ?? ({} as Projectile);
  p.pid = dead ? p.pid : state.nextPid++;
  p.x = from.x; p.y = from.y; p.tx = to.x; p.ty = to.y;
  p.speed = spec.speed; p.damage = spec.damage; p.damageType = spec.damageType;
  p.level = spec.level; p.splashRadius = spec.splashRadius; p.alive = true;
  if (!dead) state.projectiles.push(p);
}

const ARRIVE = 6; // Sim-Einheiten Ankunftsschwelle

export function tickProjectiles(state: GameState, dt: number): void {
  for (const p of state.projectiles) {
    if (!p.alive) continue;
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= ARRIVE || step >= d) {
      // Einschlag am Zielpunkt
      p.x = p.tx; p.y = p.ty;
      explode(state, p);
      p.alive = false;
    } else {
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
  }
}

function explode(state: GameState, p: Projectile): void {
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const pos = pathPosition(e.angle, e.progress);
    if (dist({ x: p.x, y: p.y }, pos) > p.splashRadius) continue;
    // applyDamage kapselt Schild-Skip + Matrix×Level×Meta + Kill/Reward.
    applyDamage(state, e, p.damage, p.damageType, p.level);
  }
}
