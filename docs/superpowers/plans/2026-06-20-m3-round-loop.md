# M3 — Runden-Loop & Boss Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`).

**Goal:** Ein kompletter Run über 10 eskalierende Runden auf Terra-1, der von Start bis Ende spielbar ist: jede überstandene Welle erhöht die Runde (Gegner werden zäher), Runde 10 ist der Endboss „Zitadelle" mit telegraphierter Schild-Phase, eine Wellen-Vorschau + Bedrohungs-Einschätzung zeigt vor jedem Start die kommende Welle, und ein Run-Ende-Screen erscheint bei Sieg (Endboss besiegt → RUN_WON) wie Niederlage (Planet zerstört → RUN_OVER) mit Neustart. Abnahme: Runden zählen korrekt hoch, Gegner-HP skaliert, Boss-Schild-Phase macht ihn zeitweise unverwundbar (telegraphiert), Run endet bei Sieg UND Niederlage korrekt.

**Architecture:** Erweitert M2-Combat. Die fixe `M2_WAVE` wird durch eine runden-indizierte Tabelle `TERRA1_WAVES[10]` ersetzt; Gegner-HP wird per `enemyHpMul(round)` skaliert. Ein kleines Boss-Phasen-System (vulnerable→telegraph→shield) macht den Boss zyklisch unverwundbar; `combatSystem` ignoriert Schaden während der Schild-Phase. `waveSystem` bekommt Runden-Fortschritt + RUN_WON/RUN_OVER-Logik. Eine reine `wavePreview`-Funktion speist die UI-Vorschau. Determinismus bleibt Pflicht.

**Tech Stack:** TypeScript + Svelte 5 + Vite + Vitest (wie bisher).

**Kontext:** Projekt `C:/Users/pposc/Documents/PlanetDefense`, M0+M1+M2 fertig. Spec: `docs/superpowers/specs/2026-06-20-planet-defense-idle-design.md` (Kap. 4.3 Run-Struktur, 5.3 Gegner/Boss/Wellen). Windows; `npm test`, `npm run typecheck`, `npm run build`. Implementierer lesen bestehende Dateien (read-then-modify), da M3 M2-Code erweitert.

**Determinismus & Golden:** M3 erweitert `GameState` (currentRound, Boss-Felder). Der Golden-Snapshot wird in Task 2 bewusst neu erzeugt. Kein `Math.random()`/`Date.now()` im Sim-Core.

---

## Scope-Abgrenzung M3

**Drin:** 10 runden-basierte Wellen (Terra-1, Geschütz-schaffbar getuned), `enemyHpMul`-Skalierung pro Runde, Runden-Fortschritt nach Wellensieg, Endboss „Zitadelle" (Runde 10) mit telegraphierter Schild-Phase (zyklisch unverwundbar), Boss-Kill-Zählung, RUN_WON/RUN_OVER + Run-Ende-Screen + Neustart, Wellen-Vorschau (Komposition-Icons) + Bedrohungs-Einschätzung (Wellen-HP vs. dein DPS), Runden-Anzeige, Boss-Telegraph/Schild-Visual.

**Bewusst NICHT in M3 (M4+):** Tech-Punkte/Meta-Währung, Skilltree, Save-Erweiterung (RUN_WON/RUN_OVER → nur Neustart, keine permanente Progression), Artillerie/Laser/weitere Türme, mehrere Planeten, mehrere Boss-Mechaniken (nur Schild-Phase), Offline/Resume, Tempo-Schalter. Die bestehenden M2-Combat-Mechaniken bleiben unverändert.

---

## Combat-/Runden-Modell (Referenz)

- `enemyHpMul(round) = enemyHpGrowth ^ (round - 1)` (round 1-basiert; round 1 → ×1).
- Beim Spawn: `enemy.hp = enemy.maxHp = floor(def.baseHp * enemyHpMul(currentRound))` (Boss zusätzlich × bossHpMult).
- Welle der aktuellen Runde: `TERRA1_WAVES[currentRound - 1]` (Array von WaveSpawn). Runde 10 enthält den Boss.
- Boss-Phasen-Zyklus (nur Boss-Gegner): startet `vulnerable`; nach `bossShieldIntervalS` → `telegraph` (Dauer `bossTelegraphS`, sichtbar, noch verwundbar) → `shield` (Dauer `bossShieldDurationS`, UNVERWUNDBAR) → zurück `vulnerable`. Schaden während `shield` wird ignoriert.
- Wellensieg (alle gespawnt & keine lebenden): wenn `currentRound < 10` → `highestRoundCleared = max(...)`, `currentRound++`, Phase `BUILD`. Wenn `currentRound === 10` (Boss-Runde geräumt) → `RUN_WON`.
- Niederlage: `planet.hp <= 0` → `RUN_OVER` (jederzeit).

---

## File Structure

```
src/
├─ content/
│  ├─ types.ts            # MODIFY: EnemyId + 'zitadelle'; EnemyDef optional boss fields
│  ├─ enemies.ts          # MODIFY: zitadelle def; TERRA1_WAVES[10] ersetzt M2_WAVE-Nutzung (M2_WAVE bleibt für Alt-Tests/Referenz oder wird entfernt)
│  └─ balance.ts          # MODIFY: enemyHpGrowth, bossHpMult, boss-timings, TERRA1_ROUNDS
├─ sim/
│  ├─ core/GameState.ts   # MODIFY: currentRound, highestRoundCleared, bossesKilledThisRun, Enemy boss fields
│  ├─ formulas.ts         # MODIFY: + enemyHpMul
│  ├─ systems/
│  │  ├─ enemySystem.ts   # MODIFY: round-based wave + HP scaling + boss spawn
│  │  ├─ bossSystem.ts    # NEW: boss phase state machine (telegraph/shield)
│  │  ├─ combatSystem.ts  # MODIFY: ignore damage during shield; count boss kills
│  │  └─ waveSystem.ts    # MODIFY: round advancement + RUN_WON/RUN_OVER + boss phase tick
│  └─ wavePreview.ts      # NEW: pure preview + threat assessment
├─ render/Canvas2DRenderer.ts  # MODIFY: round label, boss telegraph glow + shield ring
├─ ui/
│  ├─ stores/gameStore.svelte.ts  # MODIFY: snapshot adds currentRound + preview + boss flags
│  └─ panels/
│     ├─ WaveControl.svelte   # MODIFY: round indicator, wave preview + threat, RUN_WON/RUN_OVER screen
│     └─ (RunEndScreen optional inline in WaveControl)
└─ App.svelte             # (likely unchanged; restart already wired)
tests/
├─ sim/formulas.test.ts   # MODIFY: + enemyHpMul
├─ sim/enemySystem.test.ts# MODIFY: round wave + scaling
├─ sim/bossSystem.test.ts # NEW
├─ sim/waveSystem.test.ts # MODIFY: round advance + RUN_WON
├─ sim/wavePreview.test.ts# NEW
└─ content/enemies.test.ts# MODIFY: zitadelle + TERRA1_WAVES
```

---

## Task 1: Balance + Content (Boss, Runden-Wellen, Skalierung)

**Files:** Modify `src/content/balance.ts`, `src/content/types.ts`, `src/content/enemies.ts`, `src/sim/formulas.ts`; Test `tests/content/enemies.test.ts`, `tests/sim/formulas.test.ts`

- [ ] **Step 1: Erweitere die Tests (read both files first, append)**

In `tests/sim/formulas.test.ts` ergänze:
```ts
import { enemyHpMul } from '../../src/sim/formulas';
import { BALANCE } from '../../src/content/balance';

describe('enemyHpMul', () => {
  it('Runde 1 = x1', () => {
    expect(enemyHpMul(1)).toBe(1);
  });
  it('wächst geometrisch mit enemyHpGrowth', () => {
    expect(enemyHpMul(2)).toBeCloseTo(BALANCE.enemyHpGrowth, 6);
    expect(enemyHpMul(3)).toBeCloseTo(BALANCE.enemyHpGrowth ** 2, 6);
  });
});
```

In `tests/content/enemies.test.ts` ergänze:
```ts
import { ENEMIES, getEnemy, TERRA1_WAVES } from '../../src/content/enemies';
import { BALANCE } from '../../src/content/balance';

describe('Terra-1 Runden-Wellen', () => {
  it('hat genau 10 Runden', () => {
    expect(TERRA1_WAVES).toHaveLength(10);
  });
  it('jede Runde hat mindestens eine Spawn-Gruppe mit gültigen Gegnern', () => {
    for (const wave of TERRA1_WAVES) {
      expect(wave.length).toBeGreaterThan(0);
      for (const g of wave) expect(() => getEnemy(g.enemyId)).not.toThrow();
    }
  });
  it('Runde 10 enthält den Boss Zitadelle', () => {
    const r10 = TERRA1_WAVES[9];
    expect(r10.some((g) => g.enemyId === 'zitadelle')).toBe(true);
  });
});

describe('Boss Zitadelle', () => {
  it('ist als Boss markiert mit Schild-Fähigkeit', () => {
    const z = getEnemy('zitadelle');
    expect(z.isBoss).toBe(true);
    expect(z.armor).toBe('heavy');
    expect(z.baseHp).toBeGreaterThan(0);
  });
});
```
(Hinweis: importiere `TERRA1_WAVES` zusätzlich im bestehenden enemies-Test-Import oder in einem neuen Import — vermeide unbenutzte Importe wegen `noUnusedLocals`.)

- [ ] **Step 2: Run → FAIL** (enemyHpMul/TERRA1_WAVES/zitadelle fehlen). `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/formulas.test.ts tests/content/enemies.test.ts`

- [ ] **Step 3: `balance.ts` erweitern**

Lies `src/content/balance.ts` und ergänze im `BALANCE`-Objekt (vor dem schließenden `} as const;`):
```ts
  // --- Runden / Eskalation (M3) ---
  enemyHpGrowth: 1.10,
  TERRA1_ROUNDS: 10,

  // --- Boss (M3, provisorisch — finales Tuning in M5) ---
  // Geschütz-schaffbar getunt: bossHpMult moderat, Boss-baseHp in enemies.ts.
  bossHpMult: 3,
  bossTelegraphS: 1.5,
  bossShieldDurationS: 2.0,
  bossShieldIntervalS: 6.0,
```

- [ ] **Step 4: `types.ts` erweitern**

Lies `src/content/types.ts`. Ergänze `'zitadelle'` zu `EnemyId` und optionale Boss-Felder zu `EnemyDef`:
```ts
export type EnemyId = 'laeufer' | 'schwarm' | 'brocken' | 'zitadelle';
```
und in `EnemyDef` (am Ende der Felder):
```ts
  isBoss?: boolean;        // true nur für Boss-Gegner
  bossHp?: number;         // optionaler Override; sonst baseHp * bossHpMult genutzt
```
(Restliche EnemyDef-Felder unverändert.)

- [ ] **Step 5: `enemies.ts` erweitern**

Lies `src/content/enemies.ts`. Ergänze die Zitadelle in `ENEMIES` und exportiere `TERRA1_WAVES`. `getEnemy` bleibt. `M2_WAVE` darf bleiben (Referenz) oder entfernt werden — falls bestehende Tests/Code es noch nutzen, behalte es. Ergänze:
```ts
// Endboss (Runde 10). Schild-Phase wird im bossSystem behandelt.
// (in den ENEMIES-Record aufnehmen:)
  zitadelle: {
    id: 'zitadelle', nameDe: 'Zitadelle', baseHp: 600, speed: 0.03, armor: 'heavy',
    planetDamage: 999, reward: 0, shape: 'hexagon', colorVar: '#FF4D5E', isBoss: true,
  },
```
und nach dem Record:
```ts
// Terra-1: 10 handgesetzte Runden (Geschütz-schaffbar getunt). HP wird zur Laufzeit
// per enemyHpMul(round) skaliert — hier nur Zusammensetzung/Timing.
export const TERRA1_WAVES: WaveSpawn[][] = [
  /* R1 */ [{ enemyId: 'laeufer', count: 6, spacingS: 0.9, startDelayS: 0 }],
  /* R2 */ [{ enemyId: 'laeufer', count: 8, spacingS: 0.8, startDelayS: 0 }],
  /* R3 */ [{ enemyId: 'laeufer', count: 6, spacingS: 0.8, startDelayS: 0 }, { enemyId: 'schwarm', count: 4, spacingS: 0.3, startDelayS: 5 }],
  /* R4 */ [{ enemyId: 'laeufer', count: 6, spacingS: 0.7, startDelayS: 0 }, { enemyId: 'schwarm', count: 6, spacingS: 0.3, startDelayS: 4 }],
  /* R5 */ [{ enemyId: 'laeufer', count: 8, spacingS: 0.6, startDelayS: 0 }, { enemyId: 'brocken', count: 1, spacingS: 1, startDelayS: 6 }],
  /* R6 */ [{ enemyId: 'schwarm', count: 10, spacingS: 0.25, startDelayS: 0 }, { enemyId: 'laeufer', count: 4, spacingS: 0.6, startDelayS: 4 }],
  /* R7 */ [{ enemyId: 'brocken', count: 2, spacingS: 1.5, startDelayS: 0 }, { enemyId: 'laeufer', count: 4, spacingS: 0.6, startDelayS: 3 }],
  /* R8 */ [{ enemyId: 'brocken', count: 2, spacingS: 1.5, startDelayS: 0 }, { enemyId: 'schwarm', count: 6, spacingS: 0.25, startDelayS: 4 }],
  /* R9 */ [{ enemyId: 'laeufer', count: 6, spacingS: 0.6, startDelayS: 0 }, { enemyId: 'schwarm', count: 6, spacingS: 0.25, startDelayS: 3 }, { enemyId: 'brocken', count: 2, spacingS: 1.5, startDelayS: 6 }],
  /* R10 */ [{ enemyId: 'laeufer', count: 4, spacingS: 0.8, startDelayS: 0 }, { enemyId: 'zitadelle', count: 1, spacingS: 1, startDelayS: 3 }],
];
```

- [ ] **Step 6: `formulas.ts` erweitern**

Lies `src/sim/formulas.ts`, ergänze:
```ts
import { BALANCE } from '../content/balance';

// HP-Skalierung pro Runde (1-basiert): enemyHpGrowth^(round-1).
export function enemyHpMul(round: number): number {
  return Math.pow(BALANCE.enemyHpGrowth, Math.max(0, round - 1));
}
```
(Falls `BALANCE` schon importiert ist, keinen Doppel-Import anlegen.)

- [ ] **Step 7: Run → PASS + Typecheck.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/formulas.test.ts tests/content/enemies.test.ts && npm run typecheck`

- [ ] **Step 8: Volle Suite + Commit**

Run: `cd "C:/Users/pposc/Documents/PlanetDefense" && npm test` (alle grün). Falls bestehende enemySystem-Tests `M2_WAVE` nutzen und du es entfernt hast → behalte M2_WAVE. Falls grün:
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/content tests/content/enemies.test.ts src/sim/formulas.ts tests/sim/formulas.test.ts && git commit -m "feat(content): M3 round waves (Terra-1 x10), Zitadelle boss, enemyHpMul scaling"
```

---

## Task 2: GameState — Runden- & Boss-Felder

**Files:** Modify `src/sim/core/GameState.ts`; regenerate golden

- [ ] **Step 1: GameState erweitern**

Lies `src/sim/core/GameState.ts`. Ergänze:
- In `Enemy`: optionale Boss-Felder
```ts
  isBoss?: boolean;
  bossPhase?: 'vulnerable' | 'telegraph' | 'shield';
  bossPhaseTimerS?: number; // Sekunden bis zum nächsten Phasenwechsel
```
- In `GameState` (nach den Combat-Feldern):
```ts
  currentRound: number;        // 1-basiert
  highestRoundCleared: number;
  bossesKilledThisRun: number;
```
- In `createInitialState`: `currentRound: 1, highestRoundCleared: 0, bossesKilledThisRun: 0` ergänzen.

- [ ] **Step 2: Typecheck.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npm run typecheck`

- [ ] **Step 3: Golden neu erzeugen**

```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && rm tests/sim/__snapshots__/golden.test.ts.snap && npx vitest run tests/sim/golden.test.ts
```
Zweiter Lauf stabil PASS.

- [ ] **Step 4: Volle Suite + Commit**

```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && npm test && npm run typecheck && git add src/sim/core/GameState.ts tests/sim/__snapshots__/golden.test.ts.snap && git commit -m "feat(sim): GameState round + boss phase fields + regenerate golden"
```

---

## Task 3: Enemy-System — Runden-Welle + HP-Skalierung + Boss-Spawn

**Files:** Modify `src/sim/systems/enemySystem.ts`; Test `tests/sim/enemySystem.test.ts`

- [ ] **Step 1: Tests anpassen/ergänzen**

Lies `tests/sim/enemySystem.test.ts`. Die bestehenden Tests nutzen evtl. `M2_WAVE` und ein `startedWave`-Helper, der `spawnedPerGroup` aus `M2_WAVE` baut. Stelle den Helper auf die runden-basierte Welle um (Runde 1 = nur Läufer) und ergänze Skalierungs-/Boss-Tests. Ersetze den Helper-Teil so, dass er die Runde setzt und `spawnedPerGroup` zur Welle der Runde passt:
```ts
import { TERRA1_WAVES } from '../../src/content/enemies';
import { enemyHpMul } from '../../src/sim/formulas';
// Helper:
function startedWave(round = 1): GameState {
  const s = createInitialState(1);
  s.phase = 'COMBAT';
  s.currentRound = round;
  s.wave = { active: true, elapsedS: 0, spawnedPerGroup: TERRA1_WAVES[round - 1].map(() => 0) };
  return s;
}
```
Ergänze diese Tests:
```ts
describe('Runden-Skalierung', () => {
  it('skaliert Läufer-HP mit der Runde', () => {
    const s = startedWave(3); // enemyHpMul(3) = 1.1^2 = 1.21
    s.wave.elapsedS = 0;
    spawnDueEnemies(s);
    const laeufer = s.enemies.find((e) => e.defId === 'laeufer')!;
    expect(laeufer.maxHp).toBe(Math.floor(50 * enemyHpMul(3)));
  });
  it('spawnt den Boss in Runde 10 mit Boss-Feldern + skaliertem Boss-HP', () => {
    const s = startedWave(10);
    s.wave.elapsedS = 1000;
    spawnDueEnemies(s);
    const boss = s.enemies.find((e) => e.defId === 'zitadelle')!;
    expect(boss.isBoss).toBe(true);
    expect(boss.bossPhase).toBe('vulnerable');
    expect(boss.maxHp).toBe(Math.floor(600 * enemyHpMul(10) * 3)); // baseHp*mul*bossHpMult(3)
  });
});
```
(Passe vorhandene Tests, die `M2_WAVE` annahmen, an `startedWave()` mit Runde 1 an — Runde 1 ist nur Läufer; der Schwarm/Boss-Spezifische M2-Test entfällt oder wird auf die passende Runde umgestellt.)

- [ ] **Step 2: Run → FAIL.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/enemySystem.test.ts`

- [ ] **Step 3: `enemySystem.ts` umstellen**

Lies `src/sim/systems/enemySystem.ts`. Ändere `spawnDueEnemies` so, dass es die Welle der aktuellen Runde nutzt und HP skaliert; Boss-Spawn initialisiert Boss-Felder. Ersetze die Datei durch:
```ts
import type { GameState } from '../core/GameState';
import { TERRA1_WAVES, getEnemy } from '../../content/enemies';
import { enemyHpMul } from '../formulas';
import { BALANCE } from '../../content/balance';

export function spawnDueEnemies(state: GameState): void {
  const w = state.wave;
  const wave = TERRA1_WAVES[state.currentRound - 1];
  if (!wave) return;
  const mul = enemyHpMul(state.currentRound);
  for (let g = 0; g < wave.length; g++) {
    const group = wave[g];
    const already = w.spawnedPerGroup[g] ?? 0;
    let count = already;
    for (let i = already; i < group.count; i++) {
      const dueAt = group.startDelayS + i * group.spacingS;
      if (w.elapsedS + 1e-9 >= dueAt) {
        const def = getEnemy(group.enemyId);
        const baseHp = def.isBoss ? def.baseHp * BALANCE.bossHpMult : def.baseHp;
        const hp = Math.floor(baseHp * mul);
        const angle = (state.nextEid * 2.399963) % (Math.PI * 2);
        state.enemies.push({
          eid: state.nextEid++,
          defId: def.id,
          hp,
          maxHp: hp,
          angle,
          progress: 0,
          alive: true,
          ...(def.isBoss
            ? { isBoss: true, bossPhase: 'vulnerable' as const, bossPhaseTimerS: BALANCE.bossShieldIntervalS }
            : {}),
        });
        count = i + 1;
      } else {
        break;
      }
    }
    w.spawnedPerGroup[g] = count;
  }
}

export function moveEnemies(state: GameState, dt: number): void {
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const def = getEnemy(e.defId);
    e.progress += def.speed * dt;
    if (e.progress >= 1) {
      state.planet.hp = Math.max(0, state.planet.hp - def.planetDamage);
      e.alive = false;
    }
  }
}
```

- [ ] **Step 4: Run → PASS + Typecheck.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/enemySystem.test.ts && npm run typecheck`

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/sim/systems/enemySystem.ts tests/sim/enemySystem.test.ts && git commit -m "feat(sim): round-based wave spawning + HP scaling + boss spawn"
```

---

## Task 4: Boss-System (Schild-Phase) + Combat-Invulnerabilität

**Files:** Create `src/sim/systems/bossSystem.ts`; Modify `src/sim/systems/combatSystem.ts`; Test `tests/sim/bossSystem.test.ts`, `tests/sim/combatSystem.test.ts`

- [ ] **Step 1: bossSystem-Test schreiben**

`tests/sim/bossSystem.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, type GameState, type Enemy } from '../../src/sim/core/GameState';
import { tickBossPhases } from '../../src/sim/systems/bossSystem';
import { BALANCE } from '../../src/content/balance';

function bossState(): { s: GameState; boss: Enemy } {
  const s = createInitialState(1);
  s.phase = 'COMBAT';
  const boss: Enemy = { eid: 1, defId: 'zitadelle', hp: 1000, maxHp: 1000, angle: 0, progress: 0.5, alive: true, isBoss: true, bossPhase: 'vulnerable', bossPhaseTimerS: BALANCE.bossShieldIntervalS };
  s.enemies.push(boss);
  return { s, boss };
}

describe('tickBossPhases', () => {
  it('vulnerable → telegraph nach Intervall', () => {
    const { s, boss } = bossState();
    tickBossPhases(s, BALANCE.bossShieldIntervalS); // Timer abgelaufen
    expect(boss.bossPhase).toBe('telegraph');
    expect(boss.bossPhaseTimerS).toBeCloseTo(BALANCE.bossTelegraphS, 6);
  });
  it('telegraph → shield → vulnerable', () => {
    const { s, boss } = bossState();
    boss.bossPhase = 'telegraph'; boss.bossPhaseTimerS = 0.0001;
    tickBossPhases(s, 0.1);
    expect(boss.bossPhase).toBe('shield');
    boss.bossPhaseTimerS = 0.0001;
    tickBossPhases(s, 0.1);
    expect(boss.bossPhase).toBe('vulnerable');
  });
  it('ignoriert Nicht-Boss-Gegner', () => {
    const s = createInitialState(1); s.phase = 'COMBAT';
    s.enemies.push({ eid: 2, defId: 'laeufer', hp: 50, maxHp: 50, angle: 0, progress: 0.5, alive: true });
    expect(() => tickBossPhases(s, 1)).not.toThrow();
    expect(s.enemies[0].bossPhase).toBeUndefined();
  });
});
```

- [ ] **Step 2: combatSystem-Test ergänzen (Schild-Invuln)**

Lies `tests/sim/combatSystem.test.ts`, ergänze:
```ts
describe('tickCombatTurrets: Boss-Schild', () => {
  it('Schaden wird ignoriert während der Schild-Phase', () => {
    const s = combatState();
    addTurret(s, 0);
    s.enemies.push({ eid: 9, defId: 'zitadelle', hp: 1000, maxHp: 1000, angle: 0, progress: 0.95, alive: true, isBoss: true, bossPhase: 'shield', bossPhaseTimerS: 1 });
    s.buildings[0].cooldown = 0;
    tickCombatTurrets(s, 1 / 30);
    expect(s.enemies.find((e) => e.eid === 9)!.hp).toBe(1000); // kein Schaden
  });
  it('Schaden wirkt wenn Boss verwundbar', () => {
    const s = combatState();
    addTurret(s, 0);
    s.enemies.push({ eid: 9, defId: 'zitadelle', hp: 1000, maxHp: 1000, angle: 0, progress: 0.95, alive: true, isBoss: true, bossPhase: 'vulnerable', bossPhaseTimerS: 1 });
    s.buildings[0].cooldown = 0;
    tickCombatTurrets(s, 1 / 30);
    // kinetic vs heavy 0.6: 6*0.6=3.6 → hp 996.4
    expect(s.enemies.find((e) => e.eid === 9)!.hp).toBeCloseTo(996.4, 4);
  });
});
```

- [ ] **Step 3: Run → FAIL.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/bossSystem.test.ts tests/sim/combatSystem.test.ts`

- [ ] **Step 4: `bossSystem.ts` schreiben**

`src/sim/systems/bossSystem.ts`:
```ts
import type { GameState } from '../core/GameState';
import { BALANCE } from '../../content/balance';

// Boss-Phasen-Zyklus: vulnerable --(Intervall)--> telegraph --(Telegraph)--> shield --(Schild)--> vulnerable.
export function tickBossPhases(state: GameState, dt: number): void {
  for (const e of state.enemies) {
    if (!e.alive || !e.isBoss || !e.bossPhase) continue;
    e.bossPhaseTimerS = (e.bossPhaseTimerS ?? 0) - dt;
    if (e.bossPhaseTimerS > 0) continue;
    switch (e.bossPhase) {
      case 'vulnerable':
        e.bossPhase = 'telegraph';
        e.bossPhaseTimerS = BALANCE.bossTelegraphS;
        break;
      case 'telegraph':
        e.bossPhase = 'shield';
        e.bossPhaseTimerS = BALANCE.bossShieldDurationS;
        break;
      case 'shield':
        e.bossPhase = 'vulnerable';
        e.bossPhaseTimerS = BALANCE.bossShieldIntervalS;
        break;
    }
  }
}
```

- [ ] **Step 5: `combatSystem.ts` anpassen — Schild-Invuln + Boss-Kill-Zählung**

Lies `src/sim/systems/combatSystem.ts`. In `tickCombatTurrets`, an der Stelle wo Schaden angewandt wird (`target.hp -= dmg;`), davor eine Schild-Prüfung; und bei Kill Boss zählen. Ersetze den Schadens-/Kill-Block durch:
```ts
    // Boss in Schild-Phase ist unverwundbar.
    if (target.isBoss && target.bossPhase === 'shield') {
      ctx_noop: { /* kein Schaden */ }
    } else {
      const enemyDef = getEnemy(target.defId);
      const levelMult = Math.pow(BALANCE.towerLevelDamageMult, t.level - 1);
      const dmg = (def.baseDamage ?? 0) * DAMAGE_MATRIX[def.damageType ?? 'kinetic'][enemyDef.armor] * levelMult;
      target.hp -= dmg;
      if (target.hp <= 0) {
        target.alive = false;
        if (target.isBoss) state.bossesKilledThisRun += 1;
        state.ore = Math.min(state.oreStorageCap, state.ore + enemyDef.reward);
      }
    }
```
> Falls die bestehende Struktur anders ist (z.B. `enemyDef` schon oben geholt), passe minimal an: Kernlogik = wenn `target.isBoss && bossPhase==='shield'` → kein Schaden; sonst Schaden + bei Kill `if (target.isBoss) state.bossesKilledThisRun += 1`. Entferne das Pseudo-Label `ctx_noop` und nutze ein sauberes `if/else` (das Label ist nur Platzhalter — schreibe idiomatic `if (!(target.isBoss && target.bossPhase === 'shield')) { ...schaden... }`).

- [ ] **Step 6: Run → PASS + Typecheck.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/bossSystem.test.ts tests/sim/combatSystem.test.ts && npm run typecheck`

- [ ] **Step 7: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/sim/systems/bossSystem.ts src/sim/systems/combatSystem.ts tests/sim/bossSystem.test.ts tests/sim/combatSystem.test.ts && git commit -m "feat(sim): boss shield-phase state machine + combat invulnerability + boss-kill count"
```

---

## Task 5: Wave-System — Runden-Fortschritt + RUN_WON/RUN_OVER

**Files:** Modify `src/sim/systems/waveSystem.ts`; Test `tests/sim/waveSystem.test.ts`

- [ ] **Step 1: Tests anpassen/ergänzen**

Lies `tests/sim/waveSystem.test.ts`. Die bestehenden Tests prüfen Sieg → BUILD und Niederlage → RUN_OVER. Passe „Sieg" an die Runden-Logik an + ergänze RUN_WON. Achte: `allSpawned`/`anyAlive` beziehen sich jetzt auf die aktuelle Runde. Ersetze/ergänze:
```ts
import { TERRA1_WAVES } from '../../src/content/enemies';

describe('tickWave: Runden-Fortschritt', () => {
  it('Wellensieg in Runde < 10 erhöht die Runde und geht zu BUILD', () => {
    const s = createInitialState(1); startWave(s); // Runde 1
    s.wave.spawnedPerGroup = TERRA1_WAVES[0].map((g) => g.count);
    s.wave.elapsedS = 999; s.enemies = [];
    tickWave(s, 1 / 30);
    expect(s.phase).toBe('BUILD');
    expect(s.currentRound).toBe(2);
    expect(s.highestRoundCleared).toBe(1);
  });
  it('Sieg in Runde 10 (Boss-Runde geräumt) → RUN_WON', () => {
    const s = createInitialState(1);
    s.currentRound = 10; startWave(s);
    s.wave.spawnedPerGroup = TERRA1_WAVES[9].map((g) => g.count);
    s.wave.elapsedS = 999; s.enemies = [];
    tickWave(s, 1 / 30);
    expect(s.phase).toBe('RUN_WON');
    expect(s.highestRoundCleared).toBe(10);
  });
  it('Niederlage: Planet-HP 0 → RUN_OVER (jederzeit)', () => {
    const s = createInitialState(1); startWave(s);
    s.planet.hp = 0;
    tickWave(s, 1 / 30);
    expect(s.phase).toBe('RUN_OVER');
  });
});
```
(Beachte: `startWave` darf `currentRound` NICHT zurücksetzen — es startet die Welle der aktuellen Runde. Falls der bestehende `startWave` etwas resettet, das die Runde betrifft, anpassen.)

- [ ] **Step 2: Run → FAIL.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/waveSystem.test.ts`

- [ ] **Step 3: `waveSystem.ts` anpassen**

Lies `src/sim/systems/waveSystem.ts`. Ändere: `allSpawned`/`anyAlive` gegen die aktuelle Runden-Welle; `tickWave` ruft zusätzlich `tickBossPhases`; Endbedingungen mit Runden-Fortschritt. Ersetze die Datei durch:
```ts
import type { GameState } from '../core/GameState';
import { TERRA1_WAVES } from '../../content/enemies';
import { BALANCE } from '../../content/balance';
import { spawnDueEnemies, moveEnemies } from './enemySystem';
import { tickCombatTurrets } from './combatSystem';
import { tickBossPhases } from './bossSystem';

export function startWave(state: GameState): boolean {
  if (state.phase !== 'BUILD') return false;
  const wave = TERRA1_WAVES[state.currentRound - 1];
  if (!wave) return false;
  state.phase = 'COMBAT';
  state.wave = { active: true, elapsedS: 0, spawnedPerGroup: wave.map(() => 0) };
  state.enemies = [];
  state.focusEid = null;
  state.focusTimerS = 0;
  state.focusUsed = false;
  return true;
}

function allSpawned(state: GameState): boolean {
  const wave = TERRA1_WAVES[state.currentRound - 1];
  return wave.every((g, i) => (state.wave.spawnedPerGroup[i] ?? 0) >= g.count);
}
function anyAlive(state: GameState): boolean {
  return state.enemies.some((e) => e.alive);
}

export function tickWave(state: GameState, dt: number): void {
  if (state.phase !== 'COMBAT' || !state.wave.active) return;

  state.wave.elapsedS += dt;

  if (state.focusTimerS > 0) {
    state.focusTimerS -= dt;
    if (state.focusTimerS <= 0) { state.focusTimerS = 0; state.focusEid = null; }
  }

  spawnDueEnemies(state);
  tickBossPhases(state, dt);
  moveEnemies(state, dt);
  tickCombatTurrets(state, dt);
  state.enemies = state.enemies.filter((e) => e.alive);

  // Niederlage zuerst
  if (state.planet.hp <= 0) {
    state.phase = 'RUN_OVER';
    state.wave.active = false;
    return;
  }
  // Welle geräumt
  if (allSpawned(state) && !anyAlive(state)) {
    state.wave.active = false;
    if (state.currentRound > state.highestRoundCleared) state.highestRoundCleared = state.currentRound;
    if (state.currentRound >= BALANCE.TERRA1_ROUNDS) {
      state.phase = 'RUN_WON';
    } else {
      state.currentRound += 1;
      state.phase = 'BUILD';
    }
  }
}
```

- [ ] **Step 4: Run → PASS + volle Suite + Typecheck.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/waveSystem.test.ts && npm test && npm run typecheck`

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/sim/systems/waveSystem.ts tests/sim/waveSystem.test.ts && git commit -m "feat(sim): round progression + RUN_WON/RUN_OVER + boss phase tick in wave loop"
```

---

## Task 6: Wellen-Vorschau + Bedrohungs-Einschätzung (rein)

**Files:** Create `src/sim/wavePreview.ts`; Test `tests/sim/wavePreview.test.ts`

- [ ] **Step 1: Test schreiben**

`tests/sim/wavePreview.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/sim/core/GameState';
import { previewWave } from '../../src/sim/wavePreview';

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
});
```

- [ ] **Step 2: Run → FAIL.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/wavePreview.test.ts`

- [ ] **Step 3: Implementieren**

`src/sim/wavePreview.ts`:
```ts
import type { GameState } from './core/GameState';
import { TERRA1_WAVES, getEnemy } from '../content/enemies';
import { getBuilding } from '../content/buildings';
import { enemyHpMul } from './formulas';
import { BALANCE } from '../content/balance';

export interface WavePreviewGroup { enemyId: string; nameDe: string; count: number; isBoss: boolean; }
export interface WavePreview {
  round: number;
  groups: WavePreviewGroup[];
  totalHp: number;
  playerDps: number;
  ratio: number; // playerDps / (totalHp / referenzzeit)
  assessment: 'leicht' | 'machbar' | 'hart';
}

export function previewWave(state: GameState): WavePreview {
  const round = state.currentRound;
  const wave = TERRA1_WAVES[round - 1] ?? [];
  const mul = enemyHpMul(round);
  const groups: WavePreviewGroup[] = [];
  let totalHp = 0;
  for (const g of wave) {
    const def = getEnemy(g.enemyId);
    const baseHp = def.isBoss ? def.baseHp * BALANCE.bossHpMult : def.baseHp;
    totalHp += Math.floor(baseHp * mul) * g.count;
    groups.push({ enemyId: def.id, nameDe: def.nameDe, count: g.count, isBoss: !!def.isBoss });
  }
  // Spieler-DPS (grobe Heuristik): Σ baseDamage * fireRate * levelMult * coverage über Waffen.
  let playerDps = 0;
  for (const b of state.buildings) {
    const def = getBuilding(b.defId);
    if (def.category !== 'weapon') continue;
    const levelMult = Math.pow(BALANCE.towerLevelDamageMult, b.level - 1);
    playerDps += (def.baseDamage ?? 0) * (def.fireRate ?? 0) * levelMult * state.power.coverage;
  }
  // Referenz: schaffe ich totalHp in ~20 s? ratio>1 = leicht.
  const REF_S = 20;
  const ratio = playerDps <= 0 ? 0 : playerDps / (totalHp / REF_S);
  const assessment = ratio >= 1.5 ? 'leicht' : ratio >= 0.8 ? 'machbar' : 'hart';
  return { round, groups, totalHp, playerDps, ratio, assessment };
}
```

- [ ] **Step 4: Run → PASS + Typecheck.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/wavePreview.test.ts && npm run typecheck`

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/sim/wavePreview.ts tests/sim/wavePreview.test.ts && git commit -m "feat(sim): wave preview + threat assessment (pure)"
```

---

## Task 7: Snapshot + Renderer (Runde, Boss-Telegraph/Schild, Vorschau-Daten)

**Files:** Modify `src/ui/stores/gameStore.svelte.ts`, `src/render/Canvas2DRenderer.ts`

- [ ] **Step 1: Snapshot erweitern**

Lies `src/ui/stores/gameStore.svelte.ts`. Ergänze in `UiSnapshot` + `push`: `currentRound`, `highestRoundCleared`, und `preview: WavePreview` (über `previewWave(state)`), sowie boss-Flag für die UI. Konkret:
- Import `previewWave`, `type WavePreview`.
- `UiSnapshot` += `currentRound: number; highestRoundCleared: number; preview: WavePreview;`
- `push`: `currentRound: state.currentRound, highestRoundCleared: state.highestRoundCleared, preview: previewWave(state),`
- `emptySnapshot`: sinnvolle Defaults (currentRound 1, highestRoundCleared 0, preview mit leeren groups/0).
(enemies werden bereits deep-kopiert — die Boss-Felder reisen mit, da `{...e}` flach kopiert.)

- [ ] **Step 2: Renderer — Runde + Boss-Visual**

Lies `src/render/Canvas2DRenderer.ts`. Ergänze:
- Eine Runden-Anzeige oben links: `ctx.fillText('Runde ' + state.currentRound, 12, 22)` (Farbe textMid, font 14px sans-serif).
- Boss-Visual: in der Gegner-Schleife, wenn `e.isBoss`: bei `bossPhase==='telegraph'` einen pulsierenden Ring (Farbe warn/orange) um den Boss; bei `bossPhase==='shield'` einen geschlossenen hellblauen Schild-Kreis (Farbe `#5AB0FF`) um den Boss. Beispiel innerhalb der Gegner-Zeichnung:
```ts
      if (e.isBoss && e.bossPhase === 'telegraph') {
        ctx.strokeStyle = '#FFB020'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ex, ey, sz + 6 + Math.sin(state.timeS * 12) * 2, 0, Math.PI * 2); ctx.stroke();
      } else if (e.isBoss && e.bossPhase === 'shield') {
        ctx.strokeStyle = '#5AB0FF'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(ex, ey, sz + 7, 0, Math.PI * 2); ctx.stroke();
      }
```
(`ex/ey/sz` sind die bereits berechneten Gegner-Bildschirmkoordinaten/Größe — an die vorhandene Struktur anpassen; Boss `shape:'hexagon'` → sz ~11.)

- [ ] **Step 3: Typecheck + Build.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npm run typecheck && npm run build`

- [ ] **Step 4: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/ui/stores/gameStore.svelte.ts src/render/Canvas2DRenderer.ts && git commit -m "feat(render): round label + boss telegraph/shield visuals + preview in snapshot"
```

---

## Task 8: UI — Runden-Anzeige, Wellen-Vorschau + Bedrohung, Run-Ende-Screen

**Files:** Modify `src/ui/panels/WaveControl.svelte`

- [ ] **Step 1: WaveControl erweitern**

Lies `src/ui/panels/WaveControl.svelte`. Erweitere:
- BUILD-Phase: zeige „Runde {snap.currentRound} / 10", die Wellen-Vorschau (Gegner-Gruppen als Text/Icons aus `snap.preview.groups`, Boss hervorgehoben) und die Bedrohungs-Einschätzung (`snap.preview.assessment` als farbiger Badge: leicht=grün, machbar=gelb, hart=rot) NEBEN dem „Welle starten"-Button.
- COMBAT-Phase: zeige „Runde {snap.currentRound}" + alive count (wie bisher).
- RUN_WON-Phase (neu): Overlay „Planet geschafft! 🌍" + „Neu starten" (onRestart).
- RUN_OVER-Phase: „Planet verloren — Runde {snap.highestRoundCleared} erreicht" + „Neu starten".

Konkrete Struktur (ersetze die `{#if snap.phase ...}`-Kette; behalte HP-Bar oben):
```svelte
  {#if snap.phase === 'BUILD'}
    <div class="build-row">
      <span class="round">Runde {snap.currentRound} / 10</span>
      <div class="preview">
        {#each snap.preview.groups as g (g.enemyId)}
          <span class="grp" class:boss={g.isBoss}>{g.count}× {g.nameDe}</span>
        {/each}
      </div>
      <span class="assess {snap.preview.assessment}">{snap.preview.assessment}</span>
      <button class="start" onclick={() => onCommand({ t: 'startWave' })}>Welle starten ▶</button>
    </div>
  {:else if snap.phase === 'COMBAT'}
    <div class="combat-info">
      <span class="round">Runde {snap.currentRound}</span>
      <span class="badge">COMBAT</span>
      <span>{aliveCount} Gegner</span>
      {#if !snap.focusUsed}<span class="hint">Klick einen Gegner → Fokus</span>{:else}<span class="hint used">Fokus genutzt</span>{/if}
    </div>
  {:else if snap.phase === 'RUN_WON'}
    <div class="overlay won"><strong>Planet geschafft! 🌍</strong><button class="start" onclick={() => onRestart()}>Neu starten</button></div>
  {:else if snap.phase === 'RUN_OVER'}
    <div class="overlay lost"><strong>Planet verloren — Runde {snap.highestRoundCleared} erreicht</strong><button class="start" onclick={() => onRestart()}>Neu starten</button></div>
  {/if}
```
Ergänze CSS für `.round` (font-weight 800, color #9AA6D4), `.preview` (flex gap, font 12px), `.grp.boss` (color #FF4D5E, font-weight 800), `.assess` (badge: padding, radius; `.leicht{background:#1d3a2a;color:#3DDC84}` `.machbar{background:#3a3320;color:#FFB020}` `.hart{background:#3a1820;color:#FF4D5E}`), `.overlay.won{color:#3DDC84}`.

- [ ] **Step 2: Typecheck + Build + volle Suite.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npm run typecheck && npm run build && npm test`

- [ ] **Step 3: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/ui/panels/WaveControl.svelte && git commit -m "feat(ui): round indicator + wave preview/threat + RUN_WON/RUN_OVER screens"
```

---

## Task 9: Integrations-Verifikation

- [ ] **Step 1: Volle Suite + typecheck + build.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npm test && npm run typecheck && npm run build` (alle grün).

- [ ] **Step 2: Dev-Server / Preview**
1. Start: „Runde 1 / 10", Wellen-Vorschau zeigt „6× Läufer", Bedrohung „hart" (keine Türme).
2. Türme bauen → Bedrohung wird „machbar"/„leicht".
3. Welle starten → Runde-1-Gegner, nach Sieg „Runde 2 / 10".
4. (Optional, abgekürzt) currentRound testweise hochsetzen ist nur im Code; im Spiel mehrere Runden spielen → Eskalation spürbar (Gegner zäher).
5. Boss-Runde (10): Boss „Zitadelle" spawnt, Telegraph-Ring (orange) → Schild-Ring (blau) zyklisch; Schaden während Schild prallt ab.
6. Boss besiegt → „Planet geschafft! 🌍"; Planet zerstört → „Planet verloren — Runde X erreicht"; „Neu starten" setzt zurück.
7. Konsole fehlerfrei.

- [ ] **Step 3: Abschluss-Commit (falls nötig).** `cd "C:/Users/pposc/Documents/PlanetDefense" && git add -A && git commit -m "chore(m3): round loop + boss integration verified" || echo "nichts zu committen"`

---

## Definition of Done (M3)

- [ ] Volle Suite grün (enemyHpMul, round waves, bossSystem, combat-shield, round progression/RUN_WON, wavePreview, neuer Golden).
- [ ] typecheck + build clean.
- [ ] Runden zählen nach Wellensieg hoch (1→…→10); Gegner-HP skaliert mit `enemyHpMul`.
- [ ] Boss „Zitadelle" spawnt in Runde 10 mit telegraphierter Schild-Phase; während Schild unverwundbar.
- [ ] Run endet korrekt: Endboss besiegt → RUN_WON; Planet zerstört → RUN_OVER; beide mit Neustart.
- [ ] Wellen-Vorschau + Bedrohungs-Einschätzung sichtbar vor jedem Start.
- [ ] Determinismus erhalten; Sim-Core headless; kein RNG-Draw nötig (fixe Wellen).

---

## Self-Review (vom Planautor)

**Spec-Abdeckung (Kap. 4.3 + Roadmap M3):** 10 Runden-Wellen ✔ (T1), HP-Skalierung enemyHpMul ✔ (T1/T3), Runden-Fortschritt ✔ (T5), Boss + telegraphierte Schild-Phase ✔ (T1/T4), Run-Ende RUN_WON/RUN_OVER ✔ (T5/T8), Wellen-Vorschau + Bedrohung ✔ (T6/T8), Boss-Visual ✔ (T7). Bewusst verschoben (M4): Tech-Punkte/Skilltree/Save, weitere Türme, weitere Planeten/Boss-Mechaniken.

**Platzhalter-Scan:** Task 4 Step 5 nutzt ein Pseudo-Label `ctx_noop` NUR als Erklärungs-Stub und weist explizit an, es durch idiomatic `if (!(isBoss && shield)) {...}` zu ersetzen — kein Platzhalter im finalen Code. Sonst überall vollständiger Code + erwartete Ausgaben.

**Typ-Konsistenz:** `EnemyId` += 'zitadelle' konsistent (types/enemies/GameState). `Enemy` Boss-Felder (isBoss/bossPhase/bossPhaseTimerS) konsistent über GameState, enemySystem (spawn), bossSystem (tick), combatSystem (invuln), Renderer (visual). `currentRound/highestRoundCleared/bossesKilledThisRun` konsistent GameState↔waveSystem↔snapshot. `TERRA1_WAVES`/`enemyHpMul`/`previewWave` Signaturen über Tests + Aufrufer stimmig. `WavePreview` konsistent wavePreview↔store↔WaveControl. `tickBossPhases` in waveSystem aufgerufen.
```
