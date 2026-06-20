import type { GameState } from '../core/GameState';
import { getBuilding } from '../../content/buildings';
import type { BuildingDef } from '../../content/types';
import { BALANCE } from '../../content/balance';
import { nextCost } from '../formulas';
import { recomputePower } from '../systems/ecoSystem';

export type UICommand =
  | { t: 'build'; buildingId: string }
  | { t: 'upgrade'; iid: number };

export type CommandReason =
  | 'wrongPhase'
  | 'notEnoughOre'
  | 'maxLevel'
  | 'noSuchBuilding'
  | 'unknownBuilding';

export interface CommandResult {
  ok: boolean;
  reason?: CommandReason;
}

const ok = (): CommandResult => ({ ok: true });
const fail = (reason: CommandReason): CommandResult => ({ ok: false, reason });

export function applyCommand(state: GameState, cmd: UICommand): CommandResult {
  switch (cmd.t) {
    case 'build': {
      if (state.phase !== 'BUILD') return fail('wrongPhase');
      let def: BuildingDef;
      try {
        def = getBuilding(cmd.buildingId);
      } catch {
        return fail('unknownBuilding');
      }
      const count = state.buildings.filter((b) => b.defId === def.id).length;
      const cost = nextCost(def.baseCost, BALANCE.costGrowth, count);
      if (state.ore < cost) return fail('notEnoughOre');
      // KEIN harter Strom-Block: Über-Draw ist erlaubt und senkt nur die Coverage.
      state.ore -= cost;
      state.buildings.push({ iid: state.nextIid++, defId: def.id, level: 1 });
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
  }
}
