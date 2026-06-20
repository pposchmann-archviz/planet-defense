import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/sim/core/GameState';
import { applyCommand } from '../../src/sim/commands/command';
import { recomputePower } from '../../src/sim/systems/ecoSystem';

describe('applyCommand: build', () => {
  it('baut ein Gebäude und zieht die Kosten ab', () => {
    const s = createInitialState(1); // ore 50
    const r = applyCommand(s, { t: 'build', buildingId: 'erz_sammler' });
    expect(r.ok).toBe(true);
    expect(s.ore).toBe(20); // 50 - 30
    expect(s.buildings).toHaveLength(1);
    expect(s.buildings[0].defId).toBe('erz_sammler');
    expect(s.buildings[0].level).toBe(1);
  });

  it('Folgekauf desselben Gebäudes wird teurer', () => {
    const s = createInitialState(1);
    s.ore = 1000;
    applyCommand(s, { t: 'build', buildingId: 'erz_sammler' }); // 30
    applyCommand(s, { t: 'build', buildingId: 'erz_sammler' }); // floor(30*1.12)=33
    expect(s.buildings).toHaveLength(2);
    expect(s.ore).toBe(1000 - 30 - 33);
  });

  it('lehnt Bau bei zu wenig Erz ab (State unverändert)', () => {
    const s = createInitialState(1); // ore 50
    s.ore = 10;
    const before = s.buildings.length;
    const r = applyCommand(s, { t: 'build', buildingId: 'erz_sammler' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('notEnoughOre');
    expect(s.ore).toBe(10);
    expect(s.buildings).toHaveLength(before);
  });

  it('erlaubt Über-Draw (kein harter Strom-Block), Coverage sinkt', () => {
    const s = createInitialState(1);
    s.ore = 100000;
    for (let i = 0; i < 6; i++) applyCommand(s, { t: 'build', buildingId: 'erz_sammler' });
    expect(s.buildings).toHaveLength(6); // alle gebaut trotz Strom-Defizit
    expect(s.power.coverage).toBeLessThan(1);
  });

  it('lehnt Bau außerhalb der BUILD-Phase ab', () => {
    const s = createInitialState(1);
    s.phase = 'COMBAT';
    const r = applyCommand(s, { t: 'build', buildingId: 'erz_sammler' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('wrongPhase');
  });

  it('lehnt Bau eines unbekannten Gebäudes ab', () => {
    const s = createInitialState(1);
    const r = applyCommand(s, { t: 'build', buildingId: 'gibtsnicht' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('unknownBuilding');
    expect(s.buildings).toHaveLength(0);
  });
});

describe('applyCommand: upgrade', () => {
  it('hebt das Level und zieht die Upgrade-Kosten ab', () => {
    const s = createInitialState(1);
    s.ore = 1000;
    applyCommand(s, { t: 'build', buildingId: 'erz_sammler' }); // L1, kostet 30
    const iid = s.buildings[0].iid;
    const r = applyCommand(s, { t: 'upgrade', iid }); // L1->L2, kostet floor(30*1.12^1)=33
    expect(r.ok).toBe(true);
    expect(s.buildings[0].level).toBe(2);
    expect(s.ore).toBe(1000 - 30 - 33);
  });

  it('lehnt Upgrade über maxLevel ab', () => {
    const s = createInitialState(1);
    s.ore = 1e9;
    applyCommand(s, { t: 'build', buildingId: 'erz_sammler' });
    const iid = s.buildings[0].iid;
    for (let i = 0; i < 7; i++) applyCommand(s, { t: 'upgrade', iid }); // L1 -> L8
    expect(s.buildings[0].level).toBe(8);
    const r = applyCommand(s, { t: 'upgrade', iid }); // L8 ist max
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('maxLevel');
  });

  it('lehnt Upgrade unbekannter Instanz ab', () => {
    const s = createInitialState(1);
    const r = applyCommand(s, { t: 'upgrade', iid: 999 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('noSuchBuilding');
  });
});

describe('applyCommand: Invarianten', () => {
  it('hält power nach jedem Command konsistent (recompute-on-write)', () => {
    const s = createInitialState(1);
    s.ore = 100000;
    applyCommand(s, { t: 'build', buildingId: 'kraftwerk' });
    applyCommand(s, { t: 'build', buildingId: 'erz_sammler' });
    applyCommand(s, { t: 'upgrade', iid: s.buildings[0].iid });
    const before = { ...s.power };
    recomputePower(s); // expliziter frischer Recompute darf nichts ändern
    expect(s.power).toEqual(before);
  });
});
