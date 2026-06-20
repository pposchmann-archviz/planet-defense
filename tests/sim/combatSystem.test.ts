import { describe, it, expect } from 'vitest';
import { createInitialState, type GameState, type Enemy } from '../../src/sim/core/GameState';
import { tickCombatTurrets, selectTarget } from '../../src/sim/systems/combatSystem';

function combatState(): GameState {
  const s = createInitialState(1);
  s.phase = 'COMBAT';
  s.power.coverage = 1;
  return s;
}
function addTurret(s: GameState, slot: number): void {
  s.buildings.push({ iid: s.nextIid++, defId: 'geschuetz', level: 1, slot, cooldown: 0 });
}
function addEnemy(s: GameState, eid: number, progress: number, hp = 50, defId: Enemy['defId'] = 'laeufer'): void {
  s.enemies.push({ eid, defId, hp, maxHp: hp, angle: 0, progress, alive: true });
}

describe('selectTarget (first)', () => {
  it('wählt den Gegner mit höchstem progress in Reichweite', () => {
    const s = combatState();
    addTurret(s, 0);
    addEnemy(s, 1, 0.9); // gleicher Sektor wie Turm (Slot 0), in Reichweite
    addEnemy(s, 2, 0.95);
    const t = s.buildings[0];
    const target = selectTarget(s, t);
    expect(target?.eid).toBe(2);
  });
});

describe('tickCombatTurrets', () => {
  it('Geschütz trifft Läufer (light) mit 1.5x: 6*1.5=9 Schaden', () => {
    const s = combatState();
    addTurret(s, 0);
    addEnemy(s, 1, 0.95, 50);
    s.buildings[0].cooldown = 0;
    tickCombatTurrets(s, 1 / 30);
    // ein Schuss bei cooldown 0 → 9 Schaden
    expect(s.enemies[0].hp).toBe(41);
  });

  it('Coverage drosselt die Feuerrate (weniger Schüsse pro Zeit)', () => {
    const full = combatState(); addTurret(full, 0); addEnemy(full, 1, 0.95, 100000);
    const half = combatState(); half.power.coverage = 0.5; addTurret(half, 0); addEnemy(half, 1, 0.95, 100000);
    // simuliere 2 s in 1/30-Schritten
    for (let i = 0; i < 60; i++) { tickCombatTurrets(full, 1 / 30); tickCombatTurrets(half, 1 / 30); }
    const dmgFull = 100000 - full.enemies[0].hp;
    const dmgHalf = 100000 - half.enemies[0].hp;
    expect(dmgHalf).toBeLessThan(dmgFull);
    expect(dmgHalf).toBeGreaterThan(0);
  });

  it('Fokus-Mark überschreibt das Ziel', () => {
    const s = combatState();
    addTurret(s, 0);
    addEnemy(s, 1, 0.95, 50); // wäre first
    addEnemy(s, 2, 0.7, 50);  // weiter weg, aber noch in Reichweite
    s.focusEid = 2; s.focusTimerS = 3;
    s.buildings[0].cooldown = 0;
    tickCombatTurrets(s, 1 / 30);
    expect(s.enemies.find((e) => e.eid === 2)!.hp).toBe(41); // fokussierter wurde getroffen
    expect(s.enemies.find((e) => e.eid === 1)!.hp).toBe(50);
  });

  it('tote Gegner werden nicht anvisiert', () => {
    const s = combatState();
    addTurret(s, 0);
    addEnemy(s, 1, 0.95, 50); s.enemies[0].alive = false;
    s.buildings[0].cooldown = 0;
    tickCombatTurrets(s, 1 / 30);
    expect(s.enemies[0].hp).toBe(50);
  });
});

describe('tickCombatTurrets: Boss-Schild', () => {
  it('Schaden wird ignoriert während der Schild-Phase', () => {
    const s = combatState();
    addTurret(s, 0);
    s.enemies.push({ eid: 9, defId: 'zitadelle', hp: 1000, maxHp: 1000, angle: 0, progress: 0.95, alive: true, isBoss: true, bossPhase: 'shield', bossPhaseTimerS: 1 });
    s.buildings[0].cooldown = 0;
    tickCombatTurrets(s, 1 / 30);
    expect(s.enemies.find((e) => e.eid === 9)!.hp).toBe(1000); // kein Schaden
  });
  it('Schaden wirkt wenn Boss verwundbar', () => {
    const s = combatState();
    addTurret(s, 0);
    s.enemies.push({ eid: 9, defId: 'zitadelle', hp: 1000, maxHp: 1000, angle: 0, progress: 0.95, alive: true, isBoss: true, bossPhase: 'vulnerable', bossPhaseTimerS: 1 });
    s.buildings[0].cooldown = 0;
    tickCombatTurrets(s, 1 / 30);
    // kinetic vs heavy 0.6: 6*0.6=3.6 → hp 996.4
    expect(s.enemies.find((e) => e.eid === 9)!.hp).toBeCloseTo(996.4, 4);
  });
});
