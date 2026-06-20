import { describe, it, expect } from 'vitest';
import { emptyMeta, deriveMetaMods, buyNode, awardTechPoints, deriveUnlocks } from '../../src/sim/meta';

describe('deriveMetaMods', () => {
  it('leere Meta = neutrale Mods', () => {
    const m = deriveMetaMods({});
    expect(m).toEqual({ oreMult: 1, powerGenMult: 1, turmSchadenMult: 1, planetHpMult: 1, startOreBonus: 0 });
  });
  it('p_stromcap Stufe 1 = +30% powerGenMult', () => {
    const m = deriveMetaMods({ p_stromcap: 1 });
    expect(m.powerGenMult).toBeCloseTo(1.3, 6);
  });
  it('p_stromcap Stufe 2 = +42% (30+12)', () => {
    const m = deriveMetaMods({ p_stromcap: 2 });
    expect(m.powerGenMult).toBeCloseTo(1.42, 6);
  });
  it('p_starterz Stufe 2 = +100 Start-Erz (flat)', () => {
    const m = deriveMetaMods({ p_starterz: 2 });
    expect(m.startOreBonus).toBe(100);
  });
});

describe('buyNode', () => {
  it('kauft einen Knoten und zieht TP ab', () => {
    const meta = { techPoints: 10, skillNodes: {} as Record<string, number> };
    const r = buyNode(meta, 'p_stromcap');
    expect(r.ok).toBe(true);
    expect(meta.techPoints).toBe(6); // 10 - 4
    expect(meta.skillNodes.p_stromcap).toBe(1);
  });
  it('lehnt ab bei zu wenig TP', () => {
    const meta = { techPoints: 2, skillNodes: {} as Record<string, number> };
    const r = buyNode(meta, 'p_stromcap');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('notEnoughTp');
  });
  it('lehnt ab bei maxStufe', () => {
    const meta = { techPoints: 1000, skillNodes: { p_planethp: 3 } }; // max 3
    const r = buyNode(meta, 'p_planethp');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('maxLevel');
  });
});

describe('deriveUnlocks', () => {
  it('leer = nur keine Extra-Unlocks', () => {
    expect(deriveUnlocks({})).toEqual([]);
  });
  it('gekaufter u_laser schaltet laser frei', () => {
    expect(deriveUnlocks({ u_laser: 1 })).toContain('laser');
  });
});

describe('awardTechPoints', () => {
  it('addiert TP auf das Konto und liefert die Aufschlüsselung', () => {
    const meta = emptyMeta();
    const res = awardTechPoints(meta, 10, 1, true);
    expect(res.gained).toBe(24); // 9 + 10 + 5
    expect(meta.techPoints).toBe(24);
    expect(res.basis).toBe(9);
    expect(res.bossBonus).toBe(10);
    expect(res.recordBonus).toBe(5);
  });
});
