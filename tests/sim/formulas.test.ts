import { describe, it, expect } from 'vitest';
import { nextCost, enemyHpMul, techPunkte, nodeCost } from '../../src/sim/formulas';
import { BALANCE } from '../../src/content/balance';
import { getSkillNode } from '../../src/content/skilltree';

describe('nextCost', () => {
  it('n=0 ist der Basispreis', () => {
    expect(nextCost(50, 1.12, 0)).toBe(50);
  });

  it('wächst geometrisch und wird abgerundet', () => {
    // 50 * 1.12^1 = 56
    expect(nextCost(50, 1.12, 1)).toBe(56);
    // 30 * 1.12^1 = 33.6 -> floor 33
    expect(nextCost(30, 1.12, 1)).toBe(33);
    // 30 * 1.12^2 = 37.632 -> floor 37
    expect(nextCost(30, 1.12, 2)).toBe(37);
  });

  it('ist monoton steigend', () => {
    let prev = nextCost(30, 1.12, 0);
    for (let n = 1; n < 10; n++) {
      const c = nextCost(30, 1.12, n);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });
});

describe('enemyHpMul', () => {
  it('Runde 1 = x1', () => {
    expect(enemyHpMul(1)).toBe(1);
  });
  it('wächst geometrisch mit enemyHpGrowth', () => {
    expect(enemyHpMul(2)).toBeCloseTo(BALANCE.enemyHpGrowth, 6);
    expect(enemyHpMul(3)).toBeCloseTo(BALANCE.enemyHpGrowth ** 2, 6);
  });
});

describe('techPunkte', () => {
  it('Basis nach besteRunde (BASE 3, DIV 2, EXP 0.7)', () => {
    // floor(3 * (10/2)^0.7) = floor(3 * 5^0.7) = floor(3*3.085) = 9
    expect(techPunkte(10, 0, false)).toBe(9);
  });
  it('addiert Boss-Bonus und Bestmarken-Bonus', () => {
    // 9 + 1*10 + 5 = 24
    expect(techPunkte(10, 1, true)).toBe(24);
  });
  it('Runde 0 gibt 0 Basis', () => {
    expect(techPunkte(0, 0, false)).toBe(0);
  });
});

describe('nodeCost', () => {
  it('Stufe 0->1 = Basispreis', () => {
    expect(nodeCost(getSkillNode('p_stromcap'), 0)).toBe(4);
  });
  it('wächst mit passiveCostGrowth 1.6', () => {
    // floor(4 * 1.6^1) = 6
    expect(nodeCost(getSkillNode('p_stromcap'), 1)).toBe(6);
  });
});
