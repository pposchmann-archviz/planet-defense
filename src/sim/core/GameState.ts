import { createRng, type RngState } from './rng';

export interface PlanetState {
  x: number; // Sim-Koordinate (Ursprung 0,0)
  y: number;
  hp: number;
  maxHp: number;
  radius: number; // Sim-Einheiten
}

export interface GameState {
  seed: number;
  rng: RngState;
  tick: number; // Anzahl ausgeführter Combat-Steps
  timeS: number; // akkumulierte Sim-Sekunden
  planet: PlanetState;
  demoPulse: number; // deterministischer RNG-getriebener Wert (macht den Golden-Test aussagekräftig)
}

export function createInitialState(seed: number): GameState {
  return {
    seed,
    rng: createRng(seed),
    tick: 0,
    timeS: 0,
    planet: { x: 0, y: 0, hp: 120, maxHp: 120, radius: 60 },
    demoPulse: 0,
  };
}
