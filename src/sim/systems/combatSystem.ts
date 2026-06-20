import type { GameState, BuildingInstance, Enemy } from '../core/GameState';
import { getBuilding } from '../../content/buildings';
import { pathPosition, towerPosition, dist } from '../core/geometry';
import { spawnProjectile } from './projectileSystem';
import { applyDamage } from './damage';

const EPS = 1e-6;

// Zielwahl: Fokus-Mark (falls aktiv + in Reichweite) sonst 'first' (höchster progress in Reichweite).
export function selectTarget(state: GameState, turret: BuildingInstance): Enemy | null {
  const def = getBuilding(turret.defId);
  if (def.category !== 'weapon') return null;
  const range = def.range;
  const tpos = towerPosition(turret.slot ?? 0);
  const inRange = (e: Enemy): boolean => {
    if (!e.alive) return false;
    return dist(tpos, pathPosition(e.angle, e.progress)) <= range;
  };
  if (state.focusEid !== null && state.focusTimerS > 0) {
    const focused = state.enemies.find((e) => e.eid === state.focusEid && inRange(e));
    if (focused) return focused;
  }
  let best: Enemy | null = null;
  for (const e of state.enemies) {
    if (!inRange(e)) continue;
    if (!best || e.progress > best.progress || (e.progress === best.progress && e.eid < best.eid)) best = e;
  }
  return best;
}

// Ein Combat-Tick: jeder Turm feuert, sobald sein Cooldown abläuft. Coverage drosselt die Feuerrate.
export function tickCombatTurrets(state: GameState, dt: number): void {
  const coverage = state.power.coverage;
  for (const t of state.buildings) {
    const def = getBuilding(t.defId);
    if (def.category !== 'weapon') continue;
    t.cooldown = (t.cooldown ?? 0) - dt;
    if (t.cooldown > 0) continue;
    const target = selectTarget(state, t);
    if (!target) { t.cooldown = 0; continue; }
    const effFireRate = def.fireRate * coverage;
    if (effFireRate <= EPS) { t.cooldown = 0; continue; } // total ausgefallen
    t.cooldown += 1 / effFireRate;
    const damageType = def.damageType;
    if (def.projectileSpeed !== undefined) {
      // Ballistisch: Projektil spawnen, Einschlag/Splash erst bei Ankunft.
      spawnProjectile(state, towerPosition(t.slot ?? 0), pathPosition(target.angle, target.progress), {
        damage: def.baseDamage,
        damageType,
        level: t.level,
        splashRadius: def.splashRadius ?? 0,
        speed: def.projectileSpeed,
      });
    } else {
      // Hitscan: Sofort-Treffer (applyDamage kapselt Schild-Skip + Kill/Reward).
      applyDamage(state, target, def.baseDamage, damageType, t.level);
    }
  }
}
