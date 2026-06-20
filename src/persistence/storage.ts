import { SAVE_KEY, SCHEMA_VERSION, defaultSave, type SaveState } from './schema';

// --- Reine, testbare Funktionen (kein localStorage) ---

export function loadSave(raw: string | null): SaveState {
  if (!raw) return defaultSave();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultSave();
  }
  if (!parsed || typeof parsed !== 'object') return defaultSave();
  const sv = (parsed as { schemaVersion?: unknown }).schemaVersion;
  // M0: keine Migrations-Kette. Unbekannte/fehlende Version → frischer Default.
  if (sv !== SCHEMA_VERSION) return defaultSave();
  return mergeDefaults(parsed as Partial<SaveState>);
}

export function mergeDefaults(partial: Partial<SaveState>): SaveState {
  const d = defaultSave();
  return {
    schemaVersion: SCHEMA_VERSION,
    savedAt: partial.savedAt ?? d.savedAt,
    meta: { ...d.meta, ...(partial.meta ?? {}) },
    settings: { ...d.settings, ...(partial.settings ?? {}) },
  };
}

export function serializeSave(save: SaveState, now: number): string {
  return JSON.stringify({ ...save, schemaVersion: SCHEMA_VERSION, savedAt: now });
}

// --- Dünne Browser-Wrapper (nicht unit-getestet; try/catch gegen Quota/Privatmodus) ---

export function readSave(): SaveState {
  try {
    return loadSave(localStorage.getItem(SAVE_KEY));
  } catch {
    return defaultSave();
  }
}

export function writeSave(save: SaveState, now: number): void {
  try {
    localStorage.setItem(SAVE_KEY, serializeSave(save, now));
  } catch {
    // Quota/Privatmodus → in M0 still ignorieren.
  }
}
