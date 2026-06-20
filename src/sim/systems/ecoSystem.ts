import type { GameState } from '../core/GameState';
import { getBuilding } from '../../content/buildings';
import { BALANCE } from '../../content/balance';

// Erzeuger skalieren gen mit Level; Verbraucher haben konstanten Draw.
export function recomputePower(state: GameState): void {
  let gen = BALANCE.startPowerGen;
  let draw = 0;
  for (const b of state.buildings) {
    const def = getBuilding(b.defId);
    gen += def.powerGen * b.level;
    draw += def.powerCost;
  }
  gen *= state.meta.powerGenMult;
  const coverage = draw <= 0 ? 1 : Math.min(1, gen / draw);
  state.power.gen = gen;
  state.power.draw = draw;
  state.power.coverage = coverage;
}

// Ein Eco-Tick (dt Sekunden). Produziert Erz, gedrosselt durch Coverage, gedeckelt am Lager.
export function tickEconomy(state: GameState, dt: number): void {
  recomputePower(state);
  let orePerSec = 0;
  for (const b of state.buildings) {
    const def = getBuilding(b.defId);
    if (def.category !== 'eco') continue;
    orePerSec += def.producesOrePerTick * b.level;
  }
  orePerSec *= state.power.coverage * state.meta.oreMult;
  state.ore = Math.min(state.oreStorageCap, state.ore + orePerSec * dt);
  state.tick += 1;
  state.timeS += dt;
}
