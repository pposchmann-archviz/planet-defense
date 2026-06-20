import { describe, it, expect } from 'vitest';
import { createInitialState, type GameState } from '../../src/sim/core/GameState';
import { spawnProjectile, tickProjectiles } from '../../src/sim/systems/projectileSystem';
import { pathPosition } from '../../src/sim/core/geometry';

function combat(): GameState {
  const s = createInitialState(1);
  s.phase = 'COMBAT';
  return s;
}

describe('spawnProjectile', () => {
  it('legt ein Projektil mit Zielpunkt an', () => {
    const s = combat();
    spawnProjectile(s, { x: 0, y: 0 }, { x: 100, y: 0 }, { damage: 18, damageType: 'explosive', level: 1, splashRadius: 60, speed: 500 });
    expect(s.projectiles).toHaveLength(1);
    expect(s.projectiles[0].alive).toBe(true);
    expect(s.projectiles[0].tx).toBe(100);
  });
});

describe('tickProjectiles', () => {
  it('bewegt Projektile zum Ziel und schlägt mit Splash ein', () => {
    const s = combat();
    // zwei Gegner nahe dem Einschlagpunkt (100,0): progress so wählen, dass Position ~ (100,0)? Test nutzt direkte Positionsnähe via Splash-Radius.
    s.enemies.push({ eid: 1, defId: 'schwarm', hp: 12, maxHp: 12, angle: 0, progress: 0.95, alive: true });
    s.enemies.push({ eid: 2, defId: 'schwarm', hp: 12, maxHp: 12, angle: 0, progress: 0.96, alive: true });
    // Zielpunkt = Position von Gegner 1
    const tp = pathPosition(0, 0.955);
    spawnProjectile(s, { x: tp.x + 700, y: tp.y }, tp, { damage: 18, damageType: 'explosive', level: 1, splashRadius: 200, speed: 100000 });
    tickProjectiles(s, 1); // große Geschwindigkeit → erreicht Ziel sofort
    expect(s.projectiles.some((p) => p.alive)).toBe(false); // eingeschlagen
    // explosive vs light(schwarm) 1.2 → 18*1.2=21.6 ≥ 12 → beide tot (im Splash)
    expect(s.enemies.every((e) => !e.alive)).toBe(true);
  });

  it('Boss in Schild-Phase nimmt keinen Splash-Schaden', () => {
    const s = combat();
    s.enemies.push({ eid: 9, defId: 'zitadelle', hp: 1000, maxHp: 1000, angle: 0, progress: 0.9, alive: true, isBoss: true, bossPhase: 'shield', bossPhaseTimerS: 1 });
    const tp = pathPosition(0, 0.9);
    spawnProjectile(s, { x: tp.x + 700, y: tp.y }, tp, { damage: 18, damageType: 'explosive', level: 1, splashRadius: 200, speed: 100000 });
    tickProjectiles(s, 1);
    expect(s.enemies[0].hp).toBe(1000);
  });
});
