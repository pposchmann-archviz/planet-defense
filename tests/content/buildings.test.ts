import { describe, it, expect } from 'vitest';
import { getBuilding, ECO_BUILDING_IDS } from '../../src/content/buildings';

describe('Gebäude-Registry', () => {
  it('enthält genau die M1-Eco-Gebäude', () => {
    expect(ECO_BUILDING_IDS).toEqual(['kraftwerk', 'erz_sammler']);
  });

  it('Kraftwerk erzeugt Strom, verbraucht keinen', () => {
    const k = getBuilding('kraftwerk');
    expect(k.powerGen).toBe(20);
    expect(k.powerCost).toBe(0);
    expect(k.producesOrePerTick).toBe(0);
  });

  it('Erz-Sammler verbraucht Strom und produziert Erz', () => {
    const s = getBuilding('erz_sammler');
    expect(s.powerGen).toBe(0);
    expect(s.powerCost).toBe(4);
    expect(s.producesOrePerTick).toBe(2);
  });

  it('getBuilding wirft bei unbekannter id', () => {
    expect(() => getBuilding('gibtsnicht')).toThrow();
  });

  it('alle Defs haben positive baseCost und maxLevel >= 1', () => {
    for (const id of ECO_BUILDING_IDS) {
      const d = getBuilding(id);
      expect(d.baseCost).toBeGreaterThan(0);
      expect(d.maxLevel).toBeGreaterThanOrEqual(1);
    }
  });
});
