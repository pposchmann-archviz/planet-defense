import { describe, it, expect } from 'vitest';
import { getSkillNode, SKILL_NODE_IDS } from '../../src/content/skilltree';

const M4_PASSIVE_IDS = ['p_erzrate', 'p_planethp', 'p_starterz', 'p_stromcap', 'p_turmschaden'];

describe('Skilltree-Content (M4 Passive)', () => {
  it('hat genau die 10 Knoten (5 M4-Passive + 2 M5-Unlocks + 3 M6-Unlocks)', () => {
    expect(SKILL_NODE_IDS.sort()).toEqual(
      ['p_erzrate', 'p_planethp', 'p_starterz', 'p_stromcap', 'p_turmschaden', 'u_artillerie', 'u_flak', 'u_frost', 'u_laser', 'u_railgun'],
    );
  });
  it('enthält die 5 M4-Passiv-Knoten als Teilmenge', () => {
    for (const id of M4_PASSIVE_IDS) expect(SKILL_NODE_IDS).toContain(id);
  });
  it('alle Passiv-Knoten haben maxStufe>=1, base-Kosten>0, einem Stat', () => {
    for (const id of M4_PASSIVE_IDS) {
      const n = getSkillNode(id);
      expect(n.typ).toBe('passiv');
      expect(n.maxStufe).toBeGreaterThanOrEqual(1);
      expect(n.kostenTp).toBeGreaterThan(0);
      expect(n.effekt).toBeTruthy();
    }
  });
  it('deckt alle 5 Run-Stats ab', () => {
    const stats = M4_PASSIVE_IDS.map((id) => getSkillNode(id).effekt!.stat).sort();
    expect(stats).toEqual(['erzRate', 'planetHp', 'startErz', 'stromCap', 'turmSchaden']);
  });
  it('getSkillNode wirft bei unbekannt', () => {
    expect(() => getSkillNode('nope')).toThrow();
  });
});

describe('Unlock-Knoten (M5)', () => {
  it('u_artillerie / u_laser sind Unlock-Knoten mit gebaeudeId', () => {
    const a = getSkillNode('u_artillerie');
    expect(a.typ).toBe('unlock');
    expect(a.unlocks?.gebaeudeId).toBe('artillery');
    expect(getSkillNode('u_laser').unlocks?.gebaeudeId).toBe('laser');
  });
});

describe('Unlock-Knoten (M6)', () => {
  it('u_railgun / u_frost / u_flak sind Unlock-Knoten mit gebaeudeId', () => {
    const r = getSkillNode('u_railgun');
    expect(r.typ).toBe('unlock');
    expect(r.maxStufe).toBe(1);
    expect(r.unlocks?.gebaeudeId).toBe('railgun');
    const f = getSkillNode('u_frost');
    expect(f.typ).toBe('unlock');
    expect(f.unlocks?.gebaeudeId).toBe('frost');
    const k = getSkillNode('u_flak');
    expect(k.typ).toBe('unlock');
    expect(k.unlocks?.gebaeudeId).toBe('flak');
  });
});
