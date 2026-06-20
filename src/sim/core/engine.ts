import type { GameState } from './GameState';
import { nextFloat } from './rng';

// Ein fester Combat-Step. dt ist konstant (= BALANCE.COMBAT_STEP_S).
// Rein: keine I/O, kein Date.now()/Math.random(). Mutiert ausschließlich `state`.
export function tick(state: GameState, dt: number): void {
  state.tick += 1;
  state.timeS += dt;
  // RNG deterministisch ziehen, damit der Golden-Test echten Zustand prüft.
  state.demoPulse = (state.demoPulse + nextFloat(state.rng)) % 1000;
}
