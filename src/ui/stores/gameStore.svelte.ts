import type { GameState, BuildingInstance, Enemy, RunPhase } from '../../sim/core/GameState';
import { previewWave, type WavePreview } from '../../sim/wavePreview';

export interface UiSnapshot {
  phase: RunPhase;
  ore: number;
  oreStorageCap: number;
  power: { gen: number; draw: number; coverage: number };
  buildings: BuildingInstance[];
  enemies: Enemy[];
  planetHp: number;
  planetMaxHp: number;
  focusEid: number | null;
  focusUsed: boolean;
  timeS: number;
  currentRound: number;
  highestRoundCleared: number;
  unlockedBuildings: string[];
  preview: WavePreview;
}

function emptySnapshot(): UiSnapshot {
  return {
    phase: 'BUILD', ore: 0, oreStorageCap: 0,
    power: { gen: 0, draw: 0, coverage: 1 },
    buildings: [], enemies: [], planetHp: 0, planetMaxHp: 0,
    focusEid: null, focusUsed: false, timeS: 0,
    currentRound: 1, highestRoundCleared: 0,
    unlockedBuildings: [],
    preview: { round: 1, groups: [], totalHp: 0, playerDps: 0, ratio: 0, assessment: 'machbar' },
  };
}

class GameStore {
  snapshot = $state<UiSnapshot>(emptySnapshot());

  push(state: GameState): void {
    this.snapshot = {
      phase: state.phase,
      ore: state.ore,
      oreStorageCap: state.oreStorageCap,
      power: { ...state.power },
      buildings: state.buildings.map((b) => ({ ...b })),
      enemies: state.enemies.map((e) => ({ ...e })),
      planetHp: state.planet.hp,
      planetMaxHp: state.planet.maxHp,
      focusEid: state.focusEid,
      focusUsed: state.focusUsed,
      timeS: state.timeS,
      currentRound: state.currentRound,
      highestRoundCleared: state.highestRoundCleared,
      unlockedBuildings: [...state.unlockedBuildings],
      preview: previewWave(state),
    };
  }
}

export const gameStore = new GameStore();
