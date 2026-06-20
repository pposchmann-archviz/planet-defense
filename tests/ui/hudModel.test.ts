import { describe, it, expect } from 'vitest';
import { buildTile, popoverModel } from '../../src/ui/hud/model';
import type { UiSnapshot } from '../../src/ui/stores/gameStore.svelte';

function snap(over: Partial<UiSnapshot> = {}): UiSnapshot {
  return {
    phase: 'BUILD', ore: 1000, oreStorageCap: 600,
    power: { gen: 20, draw: 0, coverage: 1 },
    buildings: [], enemies: [], planetHp: 120, planetMaxHp: 120,
    focusEid: null, focusUsed: false, timeS: 0,
    currentRound: 1, highestRoundCleared: 0,
    unlockedBuildings: ['kraftwerk', 'erz_sammler', 'geschuetz'],
    preview: { round: 1, groups: [], totalHp: 0, playerDps: 0, ratio: 0, assessment: 'machbar' },
    ...over,
  };
}

describe('buildTile', () => {
  it('Eco-Kachel: Erz-Produktion, baubar bei genug Erz', () => {
    const t = buildTile(snap(), 'erz_sammler');
    expect(t.nameDe).toBe('Erz-Sammler');
    expect(t.isWeapon).toBe(false);
    expect(t.producesOre).toBe(2);
    expect(t.powerCost).toBe(4);
    expect(t.locked).toBe(false);
    expect(t.buildable).toBe(true);
  });

  it('gesperrte Waffe: locked + nicht baubar', () => {
    const t = buildTile(snap(), 'laser'); // unlockNode u_laser, nicht freigeschaltet
    expect(t.locked).toBe(true);
    expect(t.buildable).toBe(false);
  });

  it('zu wenig Erz: nicht baubar, aber nicht locked', () => {
    const t = buildTile(snap({ ore: 0 }), 'geschuetz');
    expect(t.locked).toBe(false);
    expect(t.affordable).toBe(false);
    expect(t.buildable).toBe(false);
  });

  it('falsche Phase: nicht baubar', () => {
    const t = buildTile(snap({ phase: 'COMBAT' }), 'kraftwerk');
    expect(t.buildable).toBe(false);
  });

  it('Waffen-Tags: Slow + Anti-Luft', () => {
    const frost = buildTile(snap({ unlockedBuildings: ['frost'] }), 'frost');
    expect(frost.tags).toContain('Slow');
    const flak = buildTile(snap({ unlockedBuildings: ['flak'] }), 'flak');
    expect(flak.tags).toContain('Anti-Luft');
  });

  it('Kosten steigen mit Anzahl gleicher Gebäude', () => {
    const base = buildTile(snap(), 'kraftwerk').cost;
    const withOne = buildTile(snap({ buildings: [{ iid: 1, defId: 'kraftwerk', level: 1 }] }), 'kraftwerk').cost;
    expect(withOne).toBeGreaterThan(base);
  });
});

describe('popoverModel', () => {
  it('null wenn iid nicht existiert', () => {
    expect(popoverModel(snap(), 999)).toBeNull();
  });

  it('Waffe: Level, Schaden, Upgrade-Kosten, canUpgrade', () => {
    const s = snap({ buildings: [{ iid: 5, defId: 'geschuetz', level: 1, slot: 0, cooldown: 0 }] });
    const m = popoverModel(s, 5)!;
    expect(m.nameDe).toBe('Geschützturm');
    expect(m.level).toBe(1);
    expect(m.isWeapon).toBe(true);
    expect(m.damage).toBe(6);
    expect(m.upgradeCost).toBeGreaterThan(0);
    expect(m.canUpgrade).toBe(true);
  });

  it('maxed: canUpgrade false', () => {
    const s = snap({ buildings: [{ iid: 5, defId: 'geschuetz', level: 8, slot: 0 }] });
    const m = popoverModel(s, 5)!;
    expect(m.maxed).toBe(true);
    expect(m.canUpgrade).toBe(false);
  });

  it('Eco-Gebäude ist ebenfalls upgradebar', () => {
    const s = snap({ buildings: [{ iid: 2, defId: 'kraftwerk', level: 1 }] });
    const m = popoverModel(s, 2)!;
    expect(m.isWeapon).toBe(false);
    expect(m.canUpgrade).toBe(true);
  });
});
