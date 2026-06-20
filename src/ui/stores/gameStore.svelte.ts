import type { GameState, BuildingInstance, RunPhase } from '../../sim/core/GameState';

// Kalter, serialisierbarer Snapshot des für die UI relevanten Zustands.
export interface UiSnapshot {
  phase: RunPhase;
  ore: number;
  oreStorageCap: number;
  power: { gen: number; draw: number; coverage: number };
  buildings: BuildingInstance[];
  timeS: number;
}

function emptySnapshot(): UiSnapshot {
  return {
    phase: 'BUILD',
    ore: 0,
    oreStorageCap: 0,
    power: { gen: 0, draw: 0, coverage: 1 },
    buildings: [],
    timeS: 0,
  };
}

// Svelte-5-Runes-Store: ein $state-Container, den die GameClock per push füttert.
class GameStore {
  snapshot = $state<UiSnapshot>(emptySnapshot());

  push(state: GameState): void {
    this.snapshot = {
      phase: state.phase,
      ore: state.ore,
      oreStorageCap: state.oreStorageCap,
      power: { ...state.power },
      buildings: state.buildings.map((b) => ({ ...b })),
      timeS: state.timeS,
    };
  }
}

export const gameStore = new GameStore();
