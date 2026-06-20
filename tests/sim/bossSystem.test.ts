import { describe, it, expect } from 'vitest';
import { createInitialState, type GameState, type Enemy } from '../../src/sim/core/GameState';
import { tickBossPhases } from '../../src/sim/systems/bossSystem';
import { BALANCE } from '../../src/content/balance';

function bossState(): { s: GameState; boss: Enemy } {
  const s = createInitialState(1);
  s.phase = 'COMBAT';
  const boss: Enemy = { eid: 1, defId: 'zitadelle', hp: 1000, maxHp: 1000, angle: 0, progress: 0.5, alive: true, isBoss: true, bossPhase: 'vulnerable', bossPhaseTimerS: BALANCE.bossShieldIntervalS };
  s.enemies.push(boss);
  return { s, boss };
}

describe('tickBossPhases', () => {
  it('vulnerable → telegraph nach Intervall', () => {
    const { s, boss } = bossState();
    tickBossPhases(s, BALANCE.bossShieldIntervalS); // Timer abgelaufen
    expect(boss.bossPhase).toBe('telegraph');
    expect(boss.bossPhaseTimerS).toBeCloseTo(BALANCE.bossTelegraphS, 6);
  });
  it('telegraph → shield → vulnerable', () => {
    const { s, boss } = bossState();
    boss.bossPhase = 'telegraph'; boss.bossPhaseTimerS = 0.0001;
    tickBossPhases(s, 0.1);
    expect(boss.bossPhase).toBe('shield');
    boss.bossPhaseTimerS = 0.0001;
    tickBossPhases(s, 0.1);
    expect(boss.bossPhase).toBe('vulnerable');
  });
  it('ignoriert Nicht-Boss-Gegner', () => {
    const s = createInitialState(1); s.phase = 'COMBAT';
    s.enemies.push({ eid: 2, defId: 'laeufer', hp: 50, maxHp: 50, angle: 0, progress: 0.5, alive: true });
    expect(() => tickBossPhases(s, 1)).not.toThrow();
    expect(s.enemies[0].bossPhase).toBeUndefined();
  });
});
