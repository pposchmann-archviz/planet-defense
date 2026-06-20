import { describe, it, expect } from 'vitest';
import { Session } from '../../src/app/session';

// In-Memory-Persistenz-Doppel (kein localStorage im node-Test).
function makeStore() {
  let raw: string | null = null;
  return {
    read: () => raw,
    write: (s: string) => { raw = s; },
  };
}

describe('Session', () => {
  it('startet mit leerer Meta wenn kein Save', () => {
    const sess = new Session(makeStore());
    expect(sess.meta.techPoints).toBe(0);
  });
  it('vergibt am Run-Ende TP und persistiert', () => {
    const store = makeStore();
    const sess = new Session(store);
    const bd = sess.endRun({ highestRoundCleared: 10, bossesKilledThisRun: 1 });
    expect(bd.gained).toBe(24);
    expect(sess.meta.techPoints).toBe(24);
    // neue Session liest persistierte Meta
    const sess2 = new Session(store);
    expect(sess2.meta.techPoints).toBe(24);
  });
  it('kauft einen Knoten und persistiert', () => {
    const store = makeStore();
    const sess = new Session(store);
    sess.meta.techPoints = 10;
    const r = sess.buy('p_stromcap');
    expect(r.ok).toBe(true);
    const sess2 = new Session(store);
    expect(sess2.meta.skillNodes.p_stromcap).toBe(1);
    expect(sess2.meta.techPoints).toBe(6);
  });
  it('liefert die abgeleiteten Run-Mods', () => {
    const sess = new Session(makeStore());
    sess.meta.skillNodes = { p_turmschaden: 1 };
    expect(sess.runMods().turmSchadenMult).toBeCloseTo(1.3, 6);
  });

  // --- bestRound / newRecord (computed internally) ---
  it('berechnet newRecord intern aus persistierter bestRound', () => {
    const store = makeStore();
    const sess = new Session(store);
    // erster Run: Runde 10 ist ein neuer Rekord (bestRound default 0)
    const bd1 = sess.endRun({ highestRoundCleared: 10, bossesKilledThisRun: 0 });
    expect(bd1.newRecord).toBe(true);
    expect(bd1.recordBonus).toBe(5);
    expect(sess.bestRound).toBe(10);
    // zweiter Run: Runde 8 ist KEIN neuer Rekord
    const bd2 = sess.endRun({ highestRoundCleared: 8, bossesKilledThisRun: 0 });
    expect(bd2.newRecord).toBe(false);
    expect(bd2.recordBonus).toBe(0);
    expect(sess.bestRound).toBe(10);
  });
  it('persistiert bestRound über Sessions hinweg', () => {
    const store = makeStore();
    const sess = new Session(store);
    sess.endRun({ highestRoundCleared: 12, bossesKilledThisRun: 0 });
    const sess2 = new Session(store);
    expect(sess2.bestRound).toBe(12);
    // erneuter Run mit Runde 12 ist KEIN neuer Rekord (nicht strikt größer)
    const bd = sess2.endRun({ highestRoundCleared: 12, bossesKilledThisRun: 0 });
    expect(bd.newRecord).toBe(false);
  });
});
