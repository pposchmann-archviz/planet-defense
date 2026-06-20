import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/sim/core/GameState';
import { tickCombatTurrets } from '../../src/sim/systems/combatSystem';
import { deriveMetaMods } from '../../src/sim/meta';
import { BALANCE } from '../../src/content/balance';

describe('createInitialState mit Mods', () => {
  it('ohne Mods = Basiswerte', () => {
    const s = createInitialState(1);
    expect(s.ore).toBe(BALANCE.startOre);
    expect(s.power.gen).toBe(BALANCE.startPowerGen);
    expect(s.planet.maxHp).toBe(BALANCE.planetHpBase);
    expect(s.meta.turmSchadenMult).toBe(1);
  });
  it('wendet Start-Erz, Strom-Mult, Planet-HP-Mult an', () => {
    const mods = deriveMetaMods({ p_starterz: 1, p_stromcap: 1, p_planethp: 1 });
    const s = createInitialState(1, mods);
    expect(s.ore).toBe(BALANCE.startOre + 50);
    expect(s.power.gen).toBeCloseTo(BALANCE.startPowerGen * 1.3, 6);
    expect(s.planet.maxHp).toBe(Math.floor(BALANCE.planetHpBase * 1.35));
    expect(s.planet.hp).toBe(s.planet.maxHp);
  });
});

describe('Turm-Schaden-Mult im Combat', () => {
  it('verdoppelt nahezu den Schaden bei +30% (Stufe 1)', () => {
    const mods = deriveMetaMods({ p_turmschaden: 1 }); // turmSchadenMult 1.3
    const s = createInitialState(1, mods);
    s.phase = 'COMBAT'; s.power.coverage = 1;
    s.buildings.push({ iid: s.nextIid++, defId: 'geschuetz', level: 1, slot: 0, cooldown: 0 });
    s.enemies.push({ eid: 1, defId: 'laeufer', hp: 100, maxHp: 100, angle: 0, progress: 0.95, alive: true });
    tickCombatTurrets(s, 1 / 30);
    // 6 * 1.5 (kinetic/light) * 1.0 (level) * 1.3 (mods) = 11.7 → hp 88.3
    expect(s.enemies[0].hp).toBeCloseTo(88.3, 4);
  });
});
