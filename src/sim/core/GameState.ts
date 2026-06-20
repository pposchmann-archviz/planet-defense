import { createRng, type RngState } from './rng';
import { BALANCE } from '../../content/balance';
import type { BuildingId } from '../../content/types';

export type RunPhase = 'BUILD' | 'COMBAT' | 'RUN_OVER' | 'RUN_WON';

export interface PlanetState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
}

export interface BuildingInstance {
  iid: number; // eindeutige Instanz-id (deterministisch hochgezählt)
  defId: BuildingId;
  level: number; // 1-basiert
}

export interface PowerState {
  gen: number;
  draw: number;
  coverage: number; // 0..1, abgeleitet
}

export interface EcoMetaMods {
  oreMult: number; // default 1.0
  powerGenMult: number; // default 1.0
  startOreBonus: number; // default 0
}

export interface GameState {
  seed: number;
  rng: RngState;
  phase: RunPhase;
  tick: number; // Anzahl Eco-Steps
  timeS: number;
  ore: number;
  oreStorageCap: number;
  power: PowerState;
  buildings: BuildingInstance[];
  nextIid: number;
  meta: EcoMetaMods;
  planet: PlanetState;
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
    planet: { x: 0, y: 0, hp: 120, maxHp: 120, radius: 60 },
  };
}
