import type { GameState, BuildingInstance, Enemy } from '../core/GameState';
import { getBuilding } from '../../content/buildings';
import { getEnemy } from '../../content/enemies';
import { DAMAGE_MATRIX } from '../../content/damageMatrix';
import { BALANCE } from '../../content/balance';
import { pathPosition, towerPosition, dist } from '../core/geometry';

const EPS = 1e-6;

// Zielwahl: Fokus-Mark (falls aktiv + in Reichweite) sonst 'first' (höchster progress in Reichweite).
export function selectTarget(state: GameState, turret: BuildingInstance): Enemy | null {
  const def = getBuilding(turret.defId);
  const range = def.range ?? 0;
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
    const effFireRate = (def.fireRate ?? 1) * coverage;
    if (effFireRate <= EPS) { t.cooldown = 0; continue; } // total ausgefallen
    t.cooldown += 1 / effFireRate;
    const enemyDef = getEnemy(target.defId);
    const levelMult = Math.pow(BALANCE.towerLevelDamageMult, t.level - 1);
    const dmg = (def.baseDamage ?? 0) * DAMAGE_MATRIX[def.damageType ?? 'kinetic'][enemyDef.armor] * levelMult;
    target.hp -= dmg;
    if (target.hp <= 0) { target.alive = false; state.ore = Math.min(state.oreStorageCap, state.ore + enemyDef.reward); }
  }
}
