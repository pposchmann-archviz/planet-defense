import { describe, it, expect } from 'vitest';
import { loadSave, mergeDefaults, serializeSave } from '../../src/persistence/storage';
import { defaultSave, SCHEMA_VERSION } from '../../src/persistence/schema';

describe('Save-Stub', () => {
  it('liefert Default bei null', () => {
    expect(loadSave(null).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('liefert Default bei kaputtem JSON', () => {
    expect(loadSave('{ nicht valide').meta.techPoints).toBe(0);
  });

  it('verwirft unbekannte schemaVersion → Default', () => {
    const raw = JSON.stringify({ schemaVersion: 999, meta: { techPoints: 50 } });
    expect(loadSave(raw).meta.techPoints).toBe(0);
  });

  it('round-trip erhält Meta + savedAt', () => {
    const save = defaultSave();
    save.meta.techPoints = 42;
    const raw = serializeSave(save, 1000);
    const loaded = loadSave(raw);
    expect(loaded.meta.techPoints).toBe(42);
    expect(loaded.savedAt).toBe(1000);
  });

  it('mergeDefaults füllt fehlende Felder defensiv', () => {
    const merged = mergeDefaults({ meta: { techPoints: 5 } as never });
    expect(merged.settings.locale).toBe('de');
    expect(merged.meta.unlockedPlanets).toContain('p1');
  });
});
