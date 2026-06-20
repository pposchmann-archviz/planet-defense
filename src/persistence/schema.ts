export const SAVE_KEY = 'planet_defense_save_v1';
export const SCHEMA_VERSION = 1;

export interface SaveMeta {
  techPoints: number;
  skillNodes: Record<string, number>;
  unlockedPlanets: string[];
  clearedPlanets: string[];
  bestRound: Record<string, number>;
  failedAttempts: Record<string, number>;
}

export interface SaveSettings {
  masterVolume: number;
  reducedMotion: boolean;
  locale: 'de';
}

export interface SaveState {
  schemaVersion: number;
  savedAt: number;
  meta: SaveMeta;
  settings: SaveSettings;
}

export function defaultSave(): SaveState {
  return {
    schemaVersion: SCHEMA_VERSION,
    savedAt: 0,
    meta: {
      techPoints: 0,
      skillNodes: {},
      unlockedPlanets: ['p1'],
      clearedPlanets: [],
      bestRound: {},
      failedAttempts: {},
    },
    settings: { masterVolume: 1, reducedMotion: false, locale: 'de' },
  };
}
