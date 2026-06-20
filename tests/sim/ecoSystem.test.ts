import { describe, it, expect } from 'vitest';
import { createInitialState, type GameState, type BuildingInstance } from '../../src/sim/core/GameState';
import { recomputePower, tickEconomy } from '../../src/sim/systems/ecoSystem';
import { BALANCE } from '../../src/content/balance';

function withBuildings(seed: number, list: Array<[BuildingInstance['defId'], number]>): GameState {
  const s = createInitialState(seed);
  let iid = s.nextIid;
  for (const [defId, level] of list) s.buildings.push({ iid: iid++, defId, level });
  s.nextIid = iid;
  recomputePower(s);
  return s;
}

describe('recomputePower', () => {
  it('Sockel ohne Gebäude: gen = startPowerGen, draw 0, coverage 1', () => {
    const s = createInitialState(1);
    recomputePower(s);
    expect(s.power.gen).toBe(BALANCE.startPowerGen);
    expect(s.power.draw).toBe(0);
    expect(s.power.coverage).toBe(1);
  });

  it('Kraftwerk-Level skaliert gen, Sammler addiert draw', () => {
    const s = withBuildings(1, [['kraftwerk', 2], ['erz_sammler', 1]]);
    // gen = 20 (Sockel) + 20*2 (Kraftwerk L2) = 60; draw = 4
    expect(s.power.gen).toBe(60);
    expect(s.power.draw).toBe(4);
    expect(s.power.coverage).toBe(1);
  });

  it('Über-Draw senkt die Coverage unter 1', () => {
    // 6 Sammler L1 = draw 24 > gen 20 -> coverage 20/24
    const s = withBuildings(1, Array.from({ length: 6 }, () => ['erz_sammler', 1] as [BuildingInstance['defId'], number]));
    expect(s.power.draw).toBe(24);
    expect(s.power.coverage).toBeCloseTo(20 / 24, 6);
  });
});

describe('tickEconomy', () => {
  it('produziert Erz pro Sekunde nach Sammler-Level x Coverage', () => {
    const s = withBuildings(1, [['kraftwerk', 1], ['erz_sammler', 3]]); // gen 40, draw 4 -> coverage 1
    s.ore = 0;
    tickEconomy(s, BALANCE.ECO_STEP_S); // 1 s
    // produktion = 2 * 3 (Level) * 1 (coverage) = 6
    expect(s.ore).toBe(6);
  });

  it('drosselt die Produktion bei Strom-Defizit', () => {
    const s = withBuildings(1, Array.from({ length: 6 }, () => ['erz_sammler', 1] as [BuildingInstance['defId'], number]));
    // gen 20, draw 24 -> coverage 20/24; produktion = 2*6 * (20/24) = 10
    s.ore = 0;
    tickEconomy(s, BALANCE.ECO_STEP_S);
    expect(s.ore).toBeCloseTo(10, 6);
  });

  it('deckelt Erz am Lager-Cap', () => {
    const s = withBuildings(1, [['kraftwerk', 1], ['erz_sammler', 3]]);
    s.ore = s.oreStorageCap - 2; // knapp unter Cap
    tickEconomy(s, BALANCE.ECO_STEP_S); // würde +6 produzieren
    expect(s.ore).toBe(s.oreStorageCap); // gedeckelt
  });

  it('ist deterministisch und mutiert nur den State', () => {
    const a = withBuildings(5, [['erz_sammler', 2]]);
    const b = withBuildings(5, [['erz_sammler', 2]]);
    for (let i = 0; i < 50; i++) {
      tickEconomy(a, BALANCE.ECO_STEP_S);
      tickEconomy(b, BALANCE.ECO_STEP_S);
    }
    expect(a).toEqual(b);
  });
});
