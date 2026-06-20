import type { GameState } from '../core/GameState';
import { BALANCE } from '../../content/balance';

// Boss-Phasen-Zyklus: vulnerable --(Intervall)--> telegraph --(Telegraph)--> shield --(Schild)--> vulnerable.
export function tickBossPhases(state: GameState, dt: number): void {
  for (const e of state.enemies) {
    if (!e.alive || !e.isBoss || !e.bossPhase) continue;
    // Single-Step-Annahme: ein Phasenwechsel pro Aufruf (ok bei festem COMBAT_STEP 1/30 << Phasendauern).
    e.bossPhaseTimerS = (e.bossPhaseTimerS ?? 0) - dt;
    if (e.bossPhaseTimerS > 0) continue;
    switch (e.bossPhase) {
      case 'vulnerable':
        e.bossPhase = 'telegraph';
        e.bossPhaseTimerS = BALANCE.bossTelegraphS;
        break;
      case 'telegraph':
        e.bossPhase = 'shield';
        e.bossPhaseTimerS = BALANCE.bossShieldDurationS;
        break;
      case 'shield':
        e.bossPhase = 'vulnerable';
        e.bossPhaseTimerS = BALANCE.bossShieldIntervalS;
        break;
    }
  }
}
