import { describe, it, expect } from 'vitest';
import { ENEMIES, getEnemy, TERRA1_WAVES } from '../../src/content/enemies';
import { DAMAGE_MATRIX } from '../../src/content/damageMatrix';
import { getBuilding } from '../../src/content/buildings';

describe('Gegner-Content', () => {
  it('hat die M2-Gegner (plus M3-Boss + M5-Schild-Drohne + M6-Flugdrohne)', () => {
    expect(Object.keys(ENEMIES).sort()).toEqual(['brocken', 'drohne_flug', 'laeufer', 'schild_drohne', 'schwarm', 'zitadelle']);
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
});

describe('Terra-1 Runden-Wellen', () => {
  it('hat genau 10 Runden', () => {
    expect(TERRA1_WAVES).toHaveLength(10);
  });
  it('jede Runde hat mindestens eine Spawn-Gruppe mit gültigen Gegnern', () => {
    for (const wave of TERRA1_WAVES) {
      expect(wave.length).toBeGreaterThan(0);
      for (const g of wave) expect(() => getEnemy(g.enemyId)).not.toThrow();
    }
  });
  it('Runde 10 enthält den Boss Zitadelle', () => {
    const r10 = TERRA1_WAVES[9];
    expect(r10.some((g) => g.enemyId === 'zitadelle')).toBe(true);
  });
});

describe('Boss Zitadelle', () => {
  it('ist als Boss markiert mit Schild-Fähigkeit', () => {
    const z = getEnemy('zitadelle');
    expect(z.isBoss).toBe(true);
    expect(z.armor).toBe('heavy');
    expect(z.baseHp).toBeGreaterThan(0);
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
    if (g.category !== 'weapon') throw new Error('geschuetz ist weapon');
    expect(g.damageType).toBe('kinetic');
    expect(g.baseDamage).toBe(6);
    expect(g.fireRate).toBe(2);
    expect(g.range).toBe(220);
    expect(g.projectileSpeed).toBeUndefined(); // Hitscan
  });
});

describe('Schild-Gegner', () => {
  it('schild_drohne hat shield-Rüstung', () => {
    expect(getEnemy('schild_drohne').armor).toBe('shield');
  });
});

describe('M5-Waffen (Artillerie + Laser)', () => {
  it('Artillerie hat Splash, Laser ist Hitscan', () => {
    const art = getBuilding('artillery');
    if (art.category !== 'weapon') throw new Error('artillery ist weapon');
    expect(art.splashRadius!).toBeGreaterThan(0);
    const las = getBuilding('laser');
    if (las.category !== 'weapon') throw new Error('laser ist weapon');
    expect(las.projectileSpeed).toBeUndefined();
  });
});

describe('Flug-Gegner', () => {
  it('drohne_flug ist flying', () => {
    expect(getEnemy('drohne_flug').flying).toBe(true);
  });
  it('erscheint in mittleren/späten Terra-1-Runden (R7 + R9)', () => {
    expect(TERRA1_WAVES[6].some((g) => g.enemyId === 'drohne_flug')).toBe(true);
    expect(TERRA1_WAVES[8].some((g) => g.enemyId === 'drohne_flug')).toBe(true);
  });
});

describe('M6-Waffen (Railgun + Frost + Flak)', () => {
  it('Frost verlangsamt, Flak trifft Luft, Railgun macht hohen Schaden', () => {
    const frost = getBuilding('frost');
    if (frost.category !== 'weapon') throw new Error('frost ist weapon');
    expect(frost.slowMult!).toBeGreaterThan(0);
    const flak = getBuilding('flak');
    if (flak.category !== 'weapon') throw new Error('flak ist weapon');
    expect(flak.canHitAir).toBe(true);
    const railgun = getBuilding('railgun');
    if (railgun.category !== 'weapon') throw new Error('railgun ist weapon');
    expect(railgun.baseDamage).toBeGreaterThanOrEqual(30);
  });
});
