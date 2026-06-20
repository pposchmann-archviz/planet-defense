import { createRng, type RngState } from './rng';
import { BALANCE } from '../../content/balance';
import type { BuildingId, EnemyId } from '../../content/types';

export type RunPhase = 'BUILD' | 'COMBAT' | 'RUN_OVER' | 'RUN_WON';

export interface PlanetState { x: number; y: number; hp: number; maxHp: number; radius: number; }

export interface BuildingInstance {
  iid: number;
  defId: BuildingId;
  level: number;
  slot?: number;     // nur weapon: Ring-Platz
  cooldown?: number; // nur weapon: Sekunden bis nächster Schuss
}

export interface Enemy {
  eid: number;
  defId: EnemyId;
  hp: number;
  maxHp: number;
  angle: number;     // Spawn-Winkel (radians)
  progress: number;  // 0..1
  alive: boolean;
  isBoss?: boolean;
  bossPhase?: 'vulnerable' | 'telegraph' | 'shield';
  bossPhaseTimerS?: number; // Sekunden bis zum nächsten Phasenwechsel
}

export interface PowerState { gen: number; draw: number; coverage: number; }
export interface EcoMetaMods { oreMult: number; powerGenMult: number; startOreBonus: number; }

export interface WaveState {
  active: boolean;
  elapsedS: number;     // Zeit seit Wellenstart
  spawnedPerGroup: number[]; // wie viele jeder M2_WAVE-Gruppe schon gespawnt sind
}

export interface GameState {
  seed: number;
  rng: RngState;
  phase: RunPhase;
  tick: number;
  timeS: number;
  ore: number;
  oreStorageCap: number;
  power: PowerState;
  buildings: BuildingInstance[];
  nextIid: number;
  meta: EcoMetaMods;
  planet: PlanetState;
  // Combat:
  enemies: Enemy[];
  nextEid: number;
  wave: WaveState;
  focusEid: number | null;  // markiertes Ziel
  focusTimerS: number;      // verbleibende Fokus-Zeit
  focusUsed: boolean;       // 1×/Welle
  currentRound: number;        // 1-basiert
  highestRoundCleared: number;
  bossesKilledThisRun: number;
}

export function createInitialState(seed: number): GameState {
  const meta: EcoMetaMods = { oreMult: 1, powerGenMult: 1, startOreBonus: 0 };
  return {
    seed,
    rng: createRng(seed),
    phase: 'BUILD',
    tick: 0,
    timeS: 0,
    ore: BALANCE.startOre + meta.startOreBonus,
    oreStorageCap: BALANCE.oreStorageCapBase,
    power: { gen: BALANCE.startPowerGen * meta.powerGenMult, draw: 0, coverage: 1 },
    buildings: [],
    nextIid: 1,
    meta,
    planet: { x: 0, y: 0, hp: BALANCE.planetHpBase, maxHp: BALANCE.planetHpBase, radius: BALANCE.R_PLANET },
    enemies: [],
    nextEid: 1,
    wave: { active: false, elapsedS: 0, spawnedPerGroup: [] },
    focusEid: null,
    focusTimerS: 0,
    focusUsed: false,
    currentRound: 1,
    highestRoundCleared: 0,
    bossesKilledThisRun: 0,
  };
}
