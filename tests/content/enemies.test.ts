import { describe, it, expect } from 'vitest';
import { ENEMIES, getEnemy, M2_WAVE } from '../../src/content/enemies';
import { DAMAGE_MATRIX } from '../../src/content/damageMatrix';
import { getBuilding } from '../../src/content/buildings';

describe('Gegner-Content', () => {
  it('hat die drei M2-Gegner', () => {
    expect(Object.keys(ENEMIES).sort()).toEqual(['brocken', 'laeufer', 'schwarm']);
  });
  it('Brocken ist heavy und zäh, Läufer light', () => {
    expect(getEnemy('brocken').armor).toBe('heavy');
    expect(getEnemy('brocken').baseHp).toBe(320);
    expect(getEnemy('laeufer').armor).toBe('light');
    expect(getEnemy('laeufer').baseHp).toBe(50);
  });
  it('getEnemy wirft bei unbekannt', () => {
    expect(() => getEnemy('nope')).toThrow();
  });
  it('M2-Welle ist nicht leer und referenziert gültige Gegner', () => {
    expect(M2_WAVE.length).toBeGreaterThan(0);
    for (const s of M2_WAVE) expect(() => getEnemy(s.enemyId)).not.toThrow();
  });
});

describe('Counter-Matrix', () => {
  it('kinetic schlägt light, ist schwach gegen heavy', () => {
    expect(DAMAGE_MATRIX.kinetic.light).toBe(1.5);
    expect(DAMAGE_MATRIX.kinetic.heavy).toBe(0.6);
  });
});

describe('Geschützturm', () => {
  it('ist ein weapon-Gebäude mit kinetic-Hitscan', () => {
    const g = getBuilding('geschuetz');
    expect(g.category).toBe('weapon');
    expect(g.damageType).toBe('kinetic');
    expect(g.baseDamage).toBe(6);
    expect(g.fireRate).toBe(2);
    expect(g.range).toBe(220);
    expect(g.projectileSpeed).toBeUndefined(); // Hitscan
  });
});
