import type { GameState } from './GameState';

// Platzhalter-Tick bis Task 5 das Eco-System verdrahtet.
// Zählt nur Tick/Zeit hoch — deterministisch, mutiert nur `state`.
export function tick(state: GameState, dt: number): void {
  state.tick += 1;
  state.timeS += dt;
}
