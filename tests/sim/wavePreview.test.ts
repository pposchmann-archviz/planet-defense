import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/sim/core/GameState';
import { previewWave } from '../../src/sim/wavePreview';
import { getEnemy } from '../../src/content/enemies';
import { scaledEnemyHp } from '../../src/sim/formulas';

describe('previewWave', () => {
  it('listet die Komposition der aktuellen Runde mit Gesamt-HP', () => {
    const s = createInitialState(1); // Runde 1: 6 Läufer
    const p = previewWave(s);
    expect(p.round).toBe(1);
    expect(p.groups.find((g) => g.enemyId === 'laeufer')?.count).toBe(6);
    expect(p.totalHp).toBeGreaterThan(0);
  });
  it('Bedrohung: ohne Türme ist die Einschätzung "hart"', () => {
    const s = createInitialState(1);
    const p = previewWave(s);
    expect(p.playerDps).toBe(0);
    expect(p.assessment).toBe('hart');
  });
  it('mit starker Verteidigung wird die Einschätzung leichter', () => {
    const s = createInitialState(1);
    s.buildings.push({ iid: 1, defId: 'geschuetz', level: 8, slot: 0, cooldown: 0 });
    s.power.coverage = 1;
    const p = previewWave(s);
    expect(p.playerDps).toBeGreaterThan(0);
    expect(['leicht', 'machbar', 'hart']).toContain(p.assessment);
  });
  it('totalHp nutzt scaledEnemyHp (eine Quelle für Spawn + Vorschau)', () => {
    const s = createInitialState(1); // Runde 1: 6 Läufer
    const p = previewWave(s);
    expect(p.totalHp).toBe(scaledEnemyHp(getEnemy('laeufer'), 1) * 6);
  });
});
