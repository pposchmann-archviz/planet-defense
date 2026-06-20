import type { GameState } from '../core/GameState';
import type { BuildingDef } from '../../content/types';
import { getBuilding } from '../../content/buildings';
import { BALANCE } from '../../content/balance';
import { nextCost } from '../formulas';
import { recomputePower } from '../systems/ecoSystem';
import { startWave } from '../systems/waveSystem';

export type UICommand =
  | { t: 'build'; buildingId: string }
  | { t: 'upgrade'; iid: number }
  | { t: 'startWave' }
  | { t: 'focusMark'; eid: number };

export type CommandReason =
  | 'wrongPhase'
  | 'notEnoughOre'
  | 'maxLevel'
  | 'noSuchBuilding'
  | 'unknownBuilding'
  | 'noSlot'
  | 'locked'
  | 'focusUsed'
  | 'noSuchEnemy';

export interface CommandResult { ok: boolean; reason?: CommandReason; }
const ok = (): CommandResult => ({ ok: true });
const fail = (reason: CommandReason): CommandResult => ({ ok: false, reason });

function nextFreeSlot(state: GameState): number | null {
  const used = new Set(state.buildings.filter((b) => b.slot !== undefined).map((b) => b.slot));
  for (let i = 0; i < BALANCE.TOWER_SLOTS; i++) if (!used.has(i)) return i;
  return null;
}

export function applyCommand(state: GameState, cmd: UICommand): CommandResult {
  switch (cmd.t) {
    case 'build': {
      if (state.phase !== 'BUILD') return fail('wrongPhase');
      let def: BuildingDef;
      try { def = getBuilding(cmd.buildingId); } catch { return fail('unknownBuilding'); }
      // Unlock-Gate: Waffen mit unlockNode müssen freigeschaltet sein.
      // Basis-Gebäude (unlockNode null/undefined) passieren ungehindert.
      if (def.category === 'weapon' && def.unlockNode && !state.unlockedBuildings.includes(def.id)) {
        return fail('locked');
      }
      const count = state.buildings.filter((b) => b.defId === def.id).length;
      const cost = nextCost(def.baseCost, BALANCE.costGrowth, count);
      if (state.ore < cost) return fail('notEnoughOre');
      let slot: number | undefined;
      if (def.category === 'weapon') {
        const free = nextFreeSlot(state);
        if (free === null) return fail('noSlot');
        slot = free;
      }
      state.ore -= cost;
      state.buildings.push({
        iid: state.nextIid++, defId: def.id, level: 1,
        ...(slot !== undefined ? { slot, cooldown: 0 } : {}),
      });
      recomputePower(state);
      return ok();
    }
    case 'upgrade': {
      if (state.phase !== 'BUILD') return fail('wrongPhase');
      const b = state.buildings.find((x) => x.iid === cmd.iid);
      if (!b) return fail('noSuchBuilding');
      const def = getBuilding(b.defId);
      if (b.level >= def.maxLevel) return fail('maxLevel');
      const cost = nextCost(def.baseCost, BALANCE.costGrowth, b.level);
      if (state.ore < cost) return fail('notEnoughOre');
      state.ore -= cost;
      b.level += 1;
      recomputePower(state);
      return ok();
    }
    case 'startWave': {
      return startWave(state) ? ok() : fail('wrongPhase');
    }
    case 'focusMark': {
      if (state.phase !== 'COMBAT') return fail('wrongPhase');
      if (state.focusUsed) return fail('focusUsed');
      const e = state.enemies.find((x) => x.eid === cmd.eid && x.alive);
      if (!e) return fail('noSuchEnemy');
      state.focusEid = cmd.eid;
      state.focusTimerS = BALANCE.focusDurationS;
      state.focusUsed = true;
      return ok();
    }
  }
}
