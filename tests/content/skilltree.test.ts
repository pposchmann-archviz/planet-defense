import { describe, it, expect } from 'vitest';
import { getSkillNode, SKILL_NODE_IDS } from '../../src/content/skilltree';

describe('Skilltree-Content (M4 Passive)', () => {
  it('hat genau die 5 M4-Passiv-Knoten', () => {
    expect(SKILL_NODE_IDS.sort()).toEqual(['p_erzrate', 'p_planethp', 'p_starterz', 'p_stromcap', 'p_turmschaden']);
  });
  it('alle Knoten sind Passiv mit maxStufe>=1, base-Kosten>0, einem Stat', () => {
    for (const id of SKILL_NODE_IDS) {
      const n = getSkillNode(id);
      expect(n.typ).toBe('passiv');
      expect(n.maxStufe).toBeGreaterThanOrEqual(1);
      expect(n.kostenTp).toBeGreaterThan(0);
      expect(n.effekt).toBeTruthy();
    }
  });
  it('deckt alle 5 Run-Stats ab', () => {
    const stats = SKILL_NODE_IDS.map((id) => getSkillNode(id).effekt!.stat).sort();
    expect(stats).toEqual(['erzRate', 'planetHp', 'startErz', 'stromCap', 'turmSchaden']);
  });
  it('getSkillNode wirft bei unbekannt', () => {
    expect(() => getSkillNode('nope')).toThrow();
  });
});
