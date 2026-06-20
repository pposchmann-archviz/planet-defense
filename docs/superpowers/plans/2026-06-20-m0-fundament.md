# M0 — Fundament Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein deterministisch laufendes, headless Sim-Core-Skelett mit fixed-timestep-Loop, seedbarem PRNG, grünem Golden-/Determinismus-Test, einem Save-Stub mit `schemaVersion` und einem Canvas2D-Renderer, der den Planeten aus dem Sim-State zeichnet.

**Architecture:** Drei-Schicht-Trennung von Anfang an: `src/sim/` (headless, kein Svelte-/DOM-Import, einzige Quelle der Wahrheit), `src/render/` (Canvas2D liest State, zeichnet nur), `src/app/` (rAF-Master-Loop, einziger Ort mit `performance.now()`/`requestAnimationFrame`). Svelte mountet nur den Canvas. Determinismus ist Pflicht ab Tag 1: kein `Math.random()`/`Date.now()` im Sim-Core.

**Tech Stack:** TypeScript + Svelte 5 (Runes) + Vite 6 + Vitest 2. Native `number`. Kein `break_infinity`, keine externen Game-Libs.

**Kontext:** Frisches Projekt im Ordner `C:/Users/pposc/Documents/PlanetDefense` (kein bestehender Code, kein Worktree — direkt hier arbeiten). Spec-Referenz: `docs/superpowers/specs/2026-06-20-planet-defense-idle-design.md`, Kapitel 8 (Architektur) und Kapitel 2 (Eckdaten).

**Hinweis Umgebung:** Windows, Shell ist PowerShell. Alle `git`/`npm`-Befehle laufen dort. Pfadtrenner in Befehlen mit `/` schreiben.

---

## File Structure

```
PlanetDefense/
├─ index.html                         # Vite-Einstieg, mountet #app
├─ package.json                       # Scripts + Dev-Deps
├─ tsconfig.json                      # strict, bundler-resolution
├─ vite.config.ts                     # Svelte-Plugin + Vitest-Config
├─ svelte.config.js                   # vitePreprocess (TS in .svelte)
├─ .gitignore
├─ src/
│  ├─ main.ts                         # Svelte 5 mount()
│  ├─ App.svelte                      # Canvas + startet GameClock
│  ├─ app/
│  │  ├─ config.ts                    # Tick-Konstanten aus BALANCE
│  │  └─ GameClock.ts                 # rAF-Master, fixed-timestep
│  ├─ sim/
│  │  └─ core/
│  │     ├─ rng.ts                    # mulberry32, seedbar
│  │     ├─ GameState.ts              # State-Typ + createInitialState
│  │     ├─ engine.ts                 # tick(state, dt) — rein
│  │     └─ hash.ts                   # hashState (stabiler Hash)
│  ├─ content/
│  │  └─ balance.ts                   # BALANCE (M0: nur Tick-Konstanten)
│  ├─ render/
│  │  └─ Canvas2DRenderer.ts          # zeichnet Planet aus State
│  └─ persistence/
│     ├─ schema.ts                    # SaveState + SCHEMA_VERSION + defaultSave
│     └─ storage.ts                   # loadSave/serializeSave/mergeDefaults (rein) + readSave/writeSave (Browser)
└─ tests/
   ├─ smoke.test.ts                   # Toolchain-Smoke
   ├─ sim/rng.test.ts
   ├─ sim/engine.test.ts
   ├─ sim/golden.test.ts
   └─ persistence/storage.test.ts
```

**Verantwortlichkeiten:** `sim/core` ist die einzige mutierende Schicht (nur über `tick`). `render` und `app` lesen, schreiben nie in den State. `persistence` hat reine (testbare) Funktionen plus dünne Browser-Wrapper. `content/balance.ts` ist die einzige Zahlen-Quelle (in M0 nur die Tick-Raten).

---

## Task 1: Projekt-Scaffold & Toolchain

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `svelte.config.js`, `index.html`, `.gitignore`
- Create: `src/main.ts`, `src/App.svelte`
- Test: `tests/smoke.test.ts`

- [ ] **Step 1: Git-Repo initialisieren**

Run:
```bash
cd C:/Users/pposc/Documents/PlanetDefense
git init
```
Expected: `Initialized empty Git repository ...`

- [ ] **Step 2: `.gitignore` anlegen**

`.gitignore`:
```
node_modules
dist
.superpowers
*.local
.DS_Store
```

- [ ] **Step 3: `package.json` anlegen**

`package.json`:
```json
{
  "name": "planet-defense-idle",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^5.0.0",
    "svelte": "^5.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 4: `tsconfig.json` anlegen**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "types": ["svelte", "vite/client"]
  },
  "include": ["src", "tests", "*.config.ts"]
}
```

- [ ] **Step 5: `svelte.config.js` anlegen**

`svelte.config.js`:
```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default { preprocess: vitePreprocess() };
```

- [ ] **Step 6: `vite.config.ts` anlegen (Vite + Vitest in einem)**

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// `as any[]` überbrückt den Vite-5/6-Typkonflikt (vitest bündelt Vite-5-Typen,
// svelte() ist gegen Vite 6 typisiert). Laufzeit unverändert; `npm run typecheck` bleibt grün.
export default defineConfig({
  plugins: [svelte()] as any[],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 7: `index.html` anlegen**

`index.html`:
```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Planet Defense Idle</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 8: Platzhalter-`App.svelte` + `main.ts` anlegen (wird in Task 7 ersetzt)**

`src/App.svelte`:
```svelte
<h1>Planet Defense Idle — Boot OK</h1>

<style>
  :global(body) { margin: 0; background: #0B1026; color: #F2F5FF; font-family: sans-serif; }
  h1 { padding: 24px; }
</style>
```

`src/main.ts`:
```ts
import { mount } from 'svelte';
import App from './App.svelte';

const app = mount(App, { target: document.getElementById('app')! });

export default app;
```

- [ ] **Step 9: Smoke-Test anlegen**

`tests/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('Toolchain', () => {
  it('führt Vitest aus', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 10: Dependencies installieren**

Run:
```bash
npm install
```
Expected: `node_modules` wird erstellt, kein Fehler (Warnungen okay).

- [ ] **Step 11: Smoke-Test laufen lassen**

Run:
```bash
npx vitest run tests/smoke.test.ts
```
Expected: PASS, `1 passed`.

- [ ] **Step 12: Dev-Server kurz prüfen**

Run:
```bash
npm run dev
```
Expected: Vite startet (z. B. `http://localhost:5173`). Im Browser steht „Planet Defense Idle — Boot OK" auf dunklem Grund. Danach Server stoppen (Strg+C).

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + Svelte 5 + TS + Vitest"
```

---

## Task 2: Deterministischer PRNG (mulberry32)

**Files:**
- Create: `src/sim/core/rng.ts`
- Test: `tests/sim/rng.test.ts`

- [ ] **Step 1: Failing test schreiben**

`tests/sim/rng.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createRng, nextFloat } from '../../src/sim/core/rng';

describe('mulberry32 RNG', () => {
  it('ist deterministisch für denselben Seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = [nextFloat(a), nextFloat(a), nextFloat(a)];
    const seqB = [nextFloat(b), nextFloat(b), nextFloat(b)];
    expect(seqA).toEqual(seqB);
  });

  it('liefert Werte in [0, 1)', () => {
    const r = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = nextFloat(r);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('unterscheidet sich bei verschiedenen Seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(nextFloat(a)).not.toEqual(nextFloat(b));
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run:
```bash
npx vitest run tests/sim/rng.test.ts
```
Expected: FAIL (`Failed to resolve import ... rng` bzw. „createRng is not a function").

- [ ] **Step 3: Minimal-Implementierung schreiben**

`src/sim/core/rng.ts`:
```ts
// Deterministischer, seedbarer PRNG (mulberry32). KEIN Math.random() im Sim-Core.
export interface RngState {
  s: number; // 32-bit interner Zustand
}

export function createRng(seed: number): RngState {
  return { s: seed >>> 0 };
}

export function nextFloat(rng: RngState): number {
  rng.s = (rng.s + 0x6d2b79f5) >>> 0;
  let t = rng.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Ganzzahl in [0, max) — später von der Spawn-Logik genutzt.
export function nextInt(rng: RngState, max: number): number {
  return Math.floor(nextFloat(rng) * max);
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run:
```bash
npx vitest run tests/sim/rng.test.ts
```
Expected: PASS, `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/sim/core/rng.ts tests/sim/rng.test.ts
git commit -m "feat(sim): deterministic mulberry32 PRNG"
```

---

## Task 3: Balance-Konstanten + GameState

**Files:**
- Create: `src/content/balance.ts`
- Create: `src/sim/core/GameState.ts`
- Test: (in Task 4 abgedeckt — hier nur Datenstrukturen)

- [ ] **Step 1: `balance.ts` anlegen (M0: nur Tick-Raten)**

`src/content/balance.ts`:
```ts
// content/balance.ts — die EINE Quelle für globale Tuning-Werte.
// M0 enthält nur die Tick-Raten; weitere Werte kommen in M1+.
export const BALANCE = {
  ECO_STEP_S: 1.0, // Eco-Tick = 1 Hz (M0 ungenutzt, schon definiert)
  COMBAT_STEP_S: 1 / 30, // Combat-Tick = 30 Hz
  MAX_STEPS: 5, // Spiral-of-Death-Cap
} as const;
```

- [ ] **Step 2: `GameState.ts` anlegen**

`src/sim/core/GameState.ts`:
```ts
import { createRng, type RngState } from './rng';

export interface PlanetState {
  x: number; // Sim-Koordinate (Ursprung 0,0)
  y: number;
  hp: number;
  maxHp: number;
  radius: number; // Sim-Einheiten
}

export interface GameState {
  seed: number;
  rng: RngState;
  tick: number; // Anzahl ausgeführter Combat-Steps
  timeS: number; // akkumulierte Sim-Sekunden
  planet: PlanetState;
  demoPulse: number; // deterministischer RNG-getriebener Wert (macht den Golden-Test aussagekräftig)
}

export function createInitialState(seed: number): GameState {
  return {
    seed,
    rng: createRng(seed),
    tick: 0,
    timeS: 0,
    planet: { x: 0, y: 0, hp: 120, maxHp: 120, radius: 60 },
    demoPulse: 0,
  };
}
```

- [ ] **Step 3: Typprüfung**

Run:
```bash
npx tsc --noEmit
```
Expected: kein Fehler.

- [ ] **Step 4: Commit**

```bash
git add src/content/balance.ts src/sim/core/GameState.ts
git commit -m "feat(sim): balance tick-rates + initial GameState"
```

---

## Task 4: Fixed-timestep Engine-Tick

**Files:**
- Create: `src/sim/core/engine.ts`
- Test: `tests/sim/engine.test.ts`

- [ ] **Step 1: Failing test schreiben**

`tests/sim/engine.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/sim/core/GameState';
import { tick } from '../../src/sim/core/engine';
import { BALANCE } from '../../src/content/balance';

describe('engine.tick', () => {
  it('zählt Ticks und Zeit deterministisch hoch', () => {
    const s = createInitialState(7);
    for (let i = 0; i < 30; i++) tick(s, BALANCE.COMBAT_STEP_S);
    expect(s.tick).toBe(30);
    expect(s.timeS).toBeCloseTo(1.0, 6);
  });

  it('zwei Läufe mit gleichem Seed sind byte-identisch', () => {
    const a = createInitialState(99);
    const b = createInitialState(99);
    for (let i = 0; i < 100; i++) {
      tick(a, BALANCE.COMBAT_STEP_S);
      tick(b, BALANCE.COMBAT_STEP_S);
    }
    expect(a).toEqual(b);
  });

  it('verschiedene Seeds divergieren', () => {
    const a = createInitialState(1);
    const b = createInitialState(2);
    for (let i = 0; i < 100; i++) {
      tick(a, BALANCE.COMBAT_STEP_S);
      tick(b, BALANCE.COMBAT_STEP_S);
    }
    expect(a.demoPulse).not.toEqual(b.demoPulse);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run:
```bash
npx vitest run tests/sim/engine.test.ts
```
Expected: FAIL (`tick is not a function` / Import nicht auflösbar).

- [ ] **Step 3: Minimal-Implementierung schreiben**

`src/sim/core/engine.ts`:
```ts
import type { GameState } from './GameState';
import { nextFloat } from './rng';

// Ein fester Combat-Step. dt ist konstant (= BALANCE.COMBAT_STEP_S).
// Rein: keine I/O, kein Date.now()/Math.random(). Mutiert ausschließlich `state`.
export function tick(state: GameState, dt: number): void {
  state.tick += 1;
  state.timeS += dt;
  // RNG deterministisch ziehen, damit der Golden-Test echten Zustand prüft.
  state.demoPulse = (state.demoPulse + nextFloat(state.rng)) % 1000;
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run:
```bash
npx vitest run tests/sim/engine.test.ts
```
Expected: PASS, `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/sim/core/engine.ts tests/sim/engine.test.ts
git commit -m "feat(sim): fixed-timestep engine tick (deterministic)"
```

---

## Task 5: Golden-/Determinismus-Test (State-Hash)

**Files:**
- Create: `src/sim/core/hash.ts`
- Test: `tests/sim/golden.test.ts`

- [ ] **Step 1: Failing test schreiben**

`tests/sim/golden.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/sim/core/GameState';
import { tick } from '../../src/sim/core/engine';
import { hashState } from '../../src/sim/core/hash';
import { BALANCE } from '../../src/content/balance';

describe('Golden / Determinismus', () => {
  it('produziert einen stabilen End-State-Hash (fixer Seed, 300 Ticks)', () => {
    const s = createInitialState(12345);
    for (let i = 0; i < 300; i++) tick(s, BALANCE.COMBAT_STEP_S);
    expect(hashState(s)).toMatchSnapshot();
  });

  it('gleicher Seed → gleicher Hash, anderer Seed → anderer Hash', () => {
    const run = (seed: number) => {
      const s = createInitialState(seed);
      for (let i = 0; i < 300; i++) tick(s, BALANCE.COMBAT_STEP_S);
      return hashState(s);
    };
    expect(run(12345)).toBe(run(12345));
    expect(run(12345)).not.toBe(run(54321));
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run:
```bash
npx vitest run tests/sim/golden.test.ts
```
Expected: FAIL (`hashState is not a function`).

- [ ] **Step 3: Minimal-Implementierung schreiben**

`src/sim/core/hash.ts`:
```ts
import type { GameState } from './GameState';

// Kanonisches JSON (sortierte Keys) → reproduzierbar unabhängig von Insertion-Order.
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

// djb2-artiger 32-bit-Hash über den kanonischen State.
export function hashState(state: GameState): string {
  const s = stableStringify(state);
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
```

- [ ] **Step 4: Test laufen lassen, Snapshot wird erzeugt**

Run:
```bash
npx vitest run tests/sim/golden.test.ts
```
Expected: PASS, `2 passed`. Vitest schreibt `tests/sim/__snapshots__/golden.test.ts.snap` (Golden-Wert). Ein zweiter Lauf muss erneut PASS sein (Determinismus bestätigt).

- [ ] **Step 5: Commit (inkl. Snapshot-Datei)**

```bash
git add src/sim/core/hash.ts tests/sim/golden.test.ts tests/sim/__snapshots__/golden.test.ts.snap
git commit -m "test(sim): golden end-state hash + determinism guard"
```

---

## Task 6: Save-Stub mit schemaVersion

**Files:**
- Create: `src/persistence/schema.ts`
- Create: `src/persistence/storage.ts`
- Test: `tests/persistence/storage.test.ts`

- [ ] **Step 1: Failing test schreiben**

`tests/persistence/storage.test.ts`:
```ts
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
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run:
```bash
npx vitest run tests/persistence/storage.test.ts
```
Expected: FAIL (Imports nicht auflösbar).

- [ ] **Step 3: `schema.ts` schreiben**

`src/persistence/schema.ts`:
```ts
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
```

- [ ] **Step 4: `storage.ts` schreiben**

`src/persistence/storage.ts`:
```ts
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
```

- [ ] **Step 5: Test laufen lassen, Erfolg bestätigen**

Run:
```bash
npx vitest run tests/persistence/storage.test.ts
```
Expected: PASS, `5 passed`.

- [ ] **Step 6: Commit**

```bash
git add src/persistence/schema.ts src/persistence/storage.ts tests/persistence/storage.test.ts
git commit -m "feat(persistence): save stub with schemaVersion + defensive load"
```

---

## Task 7: Canvas2D-Renderer + rAF-GameClock + App-Verdrahtung

**Files:**
- Create: `src/render/Canvas2DRenderer.ts`
- Create: `src/app/config.ts`
- Create: `src/app/GameClock.ts`
- Modify: `src/App.svelte` (ersetzt Platzhalter aus Task 1)

> Dieser Task hat keinen Vitest-Test (Render/Svelte mutieren keinen State und werden laut Test-Strategie nicht per Vitest geprüft). Verifikation erfolgt über den Dev-Server in Task 8.

- [ ] **Step 1: `config.ts` schreiben**

`src/app/config.ts`:
```ts
import { BALANCE } from '../content/balance';

export const COMBAT_STEP = BALANCE.COMBAT_STEP_S; // 1/30
export const ECO_STEP = BALANCE.ECO_STEP_S; // 1.0 (M0 ungenutzt)
export const MAX_STEPS = BALANCE.MAX_STEPS; // 5
```

- [ ] **Step 2: `Canvas2DRenderer.ts` schreiben**

`src/render/Canvas2DRenderer.ts`:
```ts
import type { GameState } from '../sim/core/GameState';

const PALETTE = {
  bgDeep: '#0B1026',
  planet: '#4DD0C2',
  planetGlow: '#7FFFE6',
};

// Liest nur den State, zeichnet. Mutiert nichts.
export class Canvas2DRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D-Canvas-Kontext nicht verfügbar');
    this.ctx = ctx;
  }

  draw(state: GameState): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = PALETTE.bgDeep;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sim-Ursprung (0,0) → Canvas-Mitte.
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const pulse = Math.sin(state.timeS * 2) * 4; // sichtbares Lebenszeichen
    const r = state.planet.radius + pulse;

    ctx.beginPath();
    ctx.arc(cx + state.planet.x, cy + state.planet.y, r, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.planet;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = PALETTE.planetGlow;
    ctx.stroke();
  }
}
```

- [ ] **Step 3: `GameClock.ts` schreiben**

`src/app/GameClock.ts`:
```ts
import type { GameState } from '../sim/core/GameState';
import { tick } from '../sim/core/engine';
import type { Canvas2DRenderer } from '../render/Canvas2DRenderer';
import { COMBAT_STEP, MAX_STEPS } from './config';

// Einziger Ort mit performance.now()/requestAnimationFrame.
export class GameClock {
  private raf = 0;
  private last = 0;
  private acc = 0;
  private running = false;

  constructor(
    private state: GameState,
    private renderer: Canvas2DRenderer,
  ) {}

  start(): void {
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min((now - this.last) / 1000, MAX_STEPS * COMBAT_STEP);
    this.last = now;
    this.acc += dt;
    let n = 0;
    while (this.acc >= COMBAT_STEP && n++ < MAX_STEPS) {
      tick(this.state, COMBAT_STEP);
      this.acc -= COMBAT_STEP;
    }
    this.renderer.draw(this.state);
    this.raf = requestAnimationFrame(this.frame);
  };
}
```

- [ ] **Step 4: `App.svelte` ersetzen**

`src/App.svelte`:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { createInitialState } from './sim/core/GameState';
  import { Canvas2DRenderer } from './render/Canvas2DRenderer';
  import { GameClock } from './app/GameClock';
  import { readSave } from './persistence/storage';

  let canvas: HTMLCanvasElement;

  onMount(() => {
    const save = readSave(); // Save-Stub exerzieren (M0: nur Boot-Check)
    console.log('[boot] Save geladen, schemaVersion', save.schemaVersion);

    const state = createInitialState(12345);
    const renderer = new Canvas2DRenderer(canvas);
    const clock = new GameClock(state, renderer);
    clock.start();
    return () => clock.stop();
  });
</script>

<canvas bind:this={canvas} width="800" height="600"></canvas>

<style>
  :global(body) {
    margin: 0;
    background: #0b1026;
    display: grid;
    place-items: center;
    height: 100vh;
  }
  canvas {
    border-radius: 12px;
  }
</style>
```

- [ ] **Step 5: Typprüfung**

Run:
```bash
npx tsc --noEmit
```
Expected: kein Fehler.

- [ ] **Step 6: Commit**

```bash
git add src/render/Canvas2DRenderer.ts src/app/config.ts src/app/GameClock.ts src/App.svelte
git commit -m "feat(render): Canvas2D planet + rAF GameClock wired into App"
```

---

## Task 8: Integrations-Verifikation

**Files:** keine neuen — End-to-End-Prüfung.

- [ ] **Step 1: Komplette Test-Suite laufen lassen**

Run:
```bash
npm test
```
Expected: alle Tests PASS (smoke 1, rng 3, engine 3, golden 2, storage 5 = 14 passed).

- [ ] **Step 2: Typprüfung über alles**

Run:
```bash
npx tsc --noEmit
```
Expected: kein Fehler.

- [ ] **Step 3: Dev-Server starten & visuell prüfen**

Run:
```bash
npm run dev
```
Expected im Browser (`http://localhost:5173`): ein türkiser Kreis mit hellem Rand, mittig auf dunkelblauem Grund, der sanft pulsiert. Konsole zeigt `[boot] Save geladen, schemaVersion 1`. Keine roten Konsolen-Fehler.

> Falls vorhanden, kann der Ausführende die `preview_*`-Tools nutzen (preview_start → preview_screenshot/preview_console_logs), um den Kreis und eine fehlerfreie Konsole zu belegen, statt manuell zu prüfen. Danach Server stoppen.

- [ ] **Step 4: Production-Build prüfen**

Run:
```bash
npm run build
```
Expected: `dist/` wird ohne Fehler erzeugt.

- [ ] **Step 5: Abschluss-Commit (falls noch uncommittete Änderungen)**

```bash
git add -A
git commit -m "chore(m0): integration verified — tests green, build OK"
```

---

## Definition of Done (M0)

- [ ] `npm test` grün (14 Tests), inkl. Golden-Snapshot committet.
- [ ] `npx tsc --noEmit` ohne Fehler.
- [ ] Determinismus bewiesen: gleicher Seed → gleicher End-State-Hash; zwei Läufe `toEqual`.
- [ ] Dev-Server zeigt den pulsierenden Planeten aus Sim-State; Save-Stub lädt ohne Crash.
- [ ] `npm run build` erfolgreich.
- [ ] Sim-Core hat keinen Svelte-/DOM-Import; `performance.now()`/`requestAnimationFrame` nur in `src/app/GameClock.ts`.

---

## Self-Review (vom Planautor durchgeführt)

**Spec-Abdeckung (M0 laut Kapitel 10 „Phase 0"):** Sim-Core-Skelett ✔ (Task 3/4), fixed-timestep-Loop ✔ (Task 4 + 7), `mulberry32`-PRNG ✔ (Task 2), leerer State ✔ (Task 3), Vitest-Golden-Test grün ✔ (Task 5), direktes Canvas2D zeichnet Kreis aus Sim-State ✔ (Task 7), Save-Stub mit `schemaVersion` ✔ (Task 6). Abnahme „Loop läuft deterministisch, Test reproduziert End-State-Hash" ✔ (Task 5/8). Architektur-Trennung (sim ohne DOM, rAF isoliert) ✔.

**Platzhalter-Scan:** keine TBD/TODO; jeder Code-Step enthält vollständigen Code, jeder Run-Step erwartete Ausgabe.

**Typ-Konsistenz:** `createRng/nextFloat/RngState` (rng.ts) konsistent in GameState/engine/Tests genutzt. `GameState`-Felder (`tick`, `timeS`, `planet`, `demoPulse`, `rng`, `seed`) identisch in engine.ts, hash.ts, Canvas2DRenderer, Tests. `SaveState/defaultSave/SCHEMA_VERSION` konsistent zwischen schema.ts, storage.ts, Tests. `COMBAT_STEP/MAX_STEPS` aus config.ts == BALANCE-Felder. `Canvas2DRenderer.draw(state)` und `GameClock`-Aufruf stimmen überein.
