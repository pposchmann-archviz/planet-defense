# HUD-Redesign (Plan 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die gestapelten Bau-/Upgrade-Listen durch ein kompaktes HUD ersetzen: Grid-Bau-Menü mit Eco/Waffen-Tabs, Klick-aufs-Geschütz → Kontext-Popover (Upgrade), schlanke Ressourcen-/Wave-Leisten, SVG statt Emoji.

**Architecture:** Reine Präsentations-Schicht (Approach A aus der Spec). Sim/Combat/Commands/Golden bleiben 1:1 unangetastet. Gameplay-Logik der Komponenten wird in **pure, getestete `.ts`-Module** ausgelagert (`src/ui/hud/model.ts`, `src/render/hitTest.ts`); die `.svelte`-Dateien bleiben dünne, deklarative Hüllen (so wie der Rest des Repos: Logik in `.ts` + Vitest, `.svelte` ungetestet). Der Renderer (Plan 1) wird NICHT angefasst. Klick-Hittest nutzt dasselbe `globeProjection`-Modul wie der Renderer (keine doppelte Formel).

**Tech Stack:** TypeScript + Svelte 5 (Runes) + Vite 6 + Vitest 2 (env `node`, keine Component-Tests). Bestehende Commands: `build`, `upgrade`, `startWave`, `focusMark` (KEINE neuen Commands).

---

## Kontext für den Implementer (lesen, bevor du anfängst)

- **Spec:** `docs/superpowers/specs/2026-06-20-visual-overhaul-3d-planet-hud-design.md`, Teil B (Abschnitt 5). Diese Plan-Datei setzt nur Teil B um (Teil A / Planet-Renderer ist fertig).
- **Leitprinzip:** Du änderst NICHTS unter `src/sim/**`, `src/content/**`, `src/persistence/**`, `src/app/**`, `src/render/Canvas2DRenderer.ts`, `src/render/globeProjection.ts`, `src/render/effects.ts`. Du liest nur Snapshot (`gameStore`) + Meta (`metaStore`) und sendest bestehende Commands.
- **Snapshot-Form** (`src/ui/stores/gameStore.svelte.ts`, Interface `UiSnapshot`): hat u.a. `phase`, `ore`, `oreStorageCap`, `power {gen,draw,coverage}`, `buildings: BuildingInstance[]`, `enemies: Enemy[]`, `planetHp`, `planetMaxHp`, `focusUsed`, `timeS`, `currentRound`, `highestRoundCleared`, `unlockedBuildings: string[]`, `preview: WavePreview`.
- **BuildingInstance** (`src/sim/core/GameState.ts`): `{ iid, defId, level, slot?, cooldown? }`. Eco-Gebäude haben `slot === undefined`, Waffen haben `slot`.
- **Gebäude-Defs** (`src/content/buildings.ts`): `BUILDINGS`, `ECO_BUILDING_IDS = ['kraftwerk','erz_sammler']`, `WEAPON_BUILDING_IDS = ['geschuetz','artillery','laser','railgun','frost','flak']`, `getBuilding(id)`. Felder je nach `category`: Eco hat `producesOrePerTick`; Waffe hat `baseDamage`, `range`, optional `slowMult`, `canHitAir`, `unlockNode`.
- **Kosten:** `nextCost(baseCost, BALANCE.costGrowth, count)` aus `src/sim/formulas.ts`. Bau-`count` = Anzahl bereits gebauter desselben `defId`; Upgrade-`count` = aktuelles `level`.
- **Lock-Regel** (identisch zur Command-Schicht): `def.category === 'weapon' && def.unlockNode != null && !snap.unlockedBuildings.includes(def.id)`.
- **Globus-Projektion** (`src/render/globeProjection.ts`, bereits getestet): `planetView(w,h) → {cx,cy,R}`; `surfacePoint(lon,lat,timeS,view) → {x,y,depth}` (depth>0 = Vorderseite); `buildingLonLat(b) → {lon,lat}` (akzeptiert `{slot?,iid}`); `enemyScreen(angle,progress,view,w,h) → {x,y}`. Der Renderer berechnet Turm-Bildschirmpunkte exakt so: `surfacePoint(buildingLonLat(b).lon, .lat, state.timeS, planetView(w,h))`. Turm-Trefferradius im Renderer: `size = 6 + 7 * max(0, depth)`.
- **Canvas:** fest `640 × 560` (in `App.svelte`).
- **Palette** (`src/ui/theme.ts`, `PALETTE`): bg `#0B1026`, Panel `#141A33`, PanelHi `#1E2748`, stroke `#2C3760`, textHi `#F2F5FF`, textMid `#9AA6D4`, textLow `#5A6699`, ore `#4DD0C2`, power `#FFC53D`, good `#3DDC84`, warn `#FFB020`, bad `#FF4D5E`. TP-Akzent `#FF7A59`.
- **Format:** `fmt(n)` (deutsche Kurzform mit Tsd./Mio.) und `fmtInt(n)` aus `src/ui/format.ts`.
- **Test-Setup:** `npm test` (= `vitest run`, env `node`), `npm run typecheck` (`tsc --noEmit`), `npm run build`. Tests liegen unter `tests/**/*.test.ts`. Import-Stil: `import { x } from '../../src/...'`. Es gibt KEINE Svelte-Component-Tests im Repo — füge auch keine hinzu.
- **Stil-Pflichten (aus globalen Projektregeln):** In der deutschen In-Game-UI **niemals Em-Dash „—"** verwenden (nutze „·", „/", Komma oder Doppelpunkt). **Keine Emoji als Icons** (SVG). Zahlen `tabular-nums`. Hover-Transitions 150–300 ms. Sichtbarer `:focus-visible`-Ring. `prefers-reduced-motion` respektieren.

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `src/render/hitTest.ts` (NEW) | Pure Klick-Trefferprüfung auf dem Globus: Vorderseiten-Gebäude + Gegner. Nutzt `globeProjection`. |
| `src/ui/hud/model.ts` (NEW) | Pure View-Modelle: `buildTile(snap, id)` (Bau-Kachel-Zustand) + `popoverModel(snap, iid)` (Turm-Popover-Zustand). |
| `src/ui/panels/BuildingIcon.svelte` (NEW) | SVG-Glyph je Gebäude-id (currentColor). Wiederverwendet in Bau-Menü + Popover. |
| `src/ui/panels/BuildMenu.svelte` (NEW, ersetzt BuildPanel) | Ein-/ausklappbares Grid-Menü mit Eco/Waffen-Tabs + Icon-Kacheln. |
| `src/ui/panels/TurretPopover.svelte` (NEW) | Kontext-Popover am angeklickten Gebäude: Stats + Upgrade. |
| `src/ui/panels/ResourceBar.svelte` (RESTYLE) | Kompakte Chips (Erz/Strom) mit SVG-Icon + Defizit-Puls. |
| `src/ui/panels/WaveControl.svelte` (RESTYLE) | Schlanke Statusleiste: Planet-HP + Runde + Bedrohung + „Welle starten". Emoji entfernt. |
| `src/ui/panels/SkillTreePanel.svelte` (POLISH) | Leichte Stil-Politur (kein Funktionswechsel). |
| `src/App.svelte` (REWRITE Layout/Logik) | Top-Bar / Planet-Canvas (Held) + Popover-Overlay / unten Wave-Leiste + Bau-Menü. HUD-`$state`, Klick-Routing via `hitTest`. |
| `src/ui/panels/BuildPanel.svelte` (DELETE) | Wird durch BuildMenu ersetzt. |

---

### Task 1: hitTest.ts (pure Klick-Trefferprüfung)

**Files:**
- Create: `src/render/hitTest.ts`
- Test: `tests/render/hitTest.test.ts`

- [ ] **Step 1: Failing test schreiben**

```ts
// tests/render/hitTest.test.ts
import { describe, it, expect } from 'vitest';
import { pickFrontBuilding, pickEnemy } from '../../src/render/hitTest';
import { planetView, surfacePoint, buildingLonLat, enemyScreen } from '../../src/render/globeProjection';

const W = 640, H = 560;
const view = planetView(W, H);

describe('pickFrontBuilding', () => {
  it('trifft ein Vorderseiten-Gebäude bei Klick auf seinen Bildschirmpunkt', () => {
    const b = { iid: 7, slot: 0 };
    const ll = buildingLonLat(b);
    const p = surfacePoint(ll.lon, ll.lat, 0, view);
    expect(p.depth).toBeGreaterThan(0); // slot 0 ist bei timeS 0 vorne
    expect(pickFrontBuilding([b], 0, view, p.x, p.y)).toBe(7);
  });

  it('liefert null bei Klick weit weg', () => {
    const b = { iid: 7, slot: 0 };
    const ll = buildingLonLat(b);
    const p = surfacePoint(ll.lon, ll.lat, 0, view);
    expect(pickFrontBuilding([b], 0, view, p.x + 200, p.y + 200)).toBeNull();
  });

  it('ignoriert Rückseiten-Gebäude (depth <= 0.1)', () => {
    // Ein Slot, dessen Längengrad bei timeS 0 hinten liegt: lon = PI → depth = cos(lat)*cos(PI) < 0
    const back = { iid: 3, slot: undefined as number | undefined, iidLon: true };
    // Eco-Gebäude (slot undefined) sitzt bei lat 0.55, lon aus iid; wähle iid so, dass es hinten liegt:
    // Stattdessen einfach prüfen: Klick auf den projizierten Punkt eines Hinterseiten-Slots wird nicht getroffen.
    const b = { iid: 9, slot: 5 }; // ein Slot; finde eine Zeit, zu der es hinten ist
    const ll = buildingLonLat(b);
    // Zeit suchen, zu der depth < 0:
    let t = 0; let p = surfacePoint(ll.lon, ll.lat, t, view);
    for (let i = 0; i < 60 && p.depth > -0.2; i++) { t += 0.5; p = surfacePoint(ll.lon, ll.lat, t, view); }
    expect(p.depth).toBeLessThan(0.1);
    expect(pickFrontBuilding([b], t, view, p.x, p.y)).toBeNull();
  });
});

describe('pickEnemy', () => {
  it('trifft einen lebenden Gegner bei Klick auf seinen Bildschirmpunkt', () => {
    const e = { eid: 42, angle: 0, progress: 1, alive: true };
    const s = enemyScreen(e.angle, e.progress, view, W, H);
    expect(pickEnemy([e], view, W, H, s.x, s.y)).toBe(42);
  });

  it('ignoriert tote Gegner und ferne Klicks', () => {
    const dead = { eid: 1, angle: 0, progress: 1, alive: false };
    const s = enemyScreen(0, 1, view, W, H);
    expect(pickEnemy([dead], view, W, H, s.x, s.y)).toBeNull();
    const alive = { eid: 2, angle: 0, progress: 1, alive: true };
    expect(pickEnemy([alive], view, W, H, s.x + 100, s.y + 100)).toBeNull();
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag bestätigen**

Run: `npm test -- hitTest`
Expected: FAIL „Cannot find module '../../src/render/hitTest'".

- [ ] **Step 3: Minimale Implementierung**

```ts
// src/render/hitTest.ts
import { surfacePoint, buildingLonLat, enemyScreen, type PlanetView } from './globeProjection';

// Vorderseiten-Gebäude, dessen projizierter Punkt dem Klick am nächsten liegt (depth > 0.1), sonst null.
export function pickFrontBuilding(
  buildings: { iid: number; slot?: number }[],
  timeS: number,
  view: PlanetView,
  mx: number,
  my: number,
): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const b of buildings) {
    const ll = buildingLonLat(b);
    const p = surfacePoint(ll.lon, ll.lat, timeS, view);
    if (p.depth <= 0.1) continue; // nur Vorderseite klickbar
    const size = 6 + 7 * Math.max(0, p.depth); // identisch zum Renderer-Trefferkreis
    const d = Math.hypot(p.x - mx, p.y - my);
    if (d <= size + 8 && d < bestD) { bestD = d; best = b.iid; }
  }
  return best;
}

// Lebender Gegner, dessen projizierter Punkt dem Klick am nächsten liegt (<= 24 px), sonst null.
export function pickEnemy(
  enemies: { eid: number; angle: number; progress: number; alive: boolean }[],
  view: PlanetView,
  w: number,
  h: number,
  mx: number,
  my: number,
): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const e of enemies) {
    if (!e.alive) continue;
    const s = enemyScreen(e.angle, e.progress, view, w, h);
    const d = Math.hypot(s.x - mx, s.y - my);
    if (d <= 24 && d < bestD) { bestD = d; best = e.eid; }
  }
  return best;
}
```

- [ ] **Step 4: Test ausführen, Erfolg bestätigen**

Run: `npm test -- hitTest`
Expected: PASS (5 Tests). Falls der „back side"-Test instabil ist, prüfe, dass die Schleife eine Zeit mit `depth < 0.1` findet (slot 5 dreht innerhalb von 30 s sicher nach hinten).

- [ ] **Step 5: Typecheck + Commit**

Run: `npm run typecheck`
```bash
git add src/render/hitTest.ts tests/render/hitTest.test.ts
git commit -m "feat(hud): pure globe hit-testing for buildings and enemies"
```

---

### Task 2: hud/model.ts (pure View-Modelle)

**Files:**
- Create: `src/ui/hud/model.ts`
- Test: `tests/ui/hudModel.test.ts`

- [ ] **Step 1: Failing test schreiben**

```ts
// tests/ui/hudModel.test.ts
import { describe, it, expect } from 'vitest';
import { buildTile, popoverModel } from '../../src/ui/hud/model';
import type { UiSnapshot } from '../../src/ui/stores/gameStore.svelte';

function snap(over: Partial<UiSnapshot> = {}): UiSnapshot {
  return {
    phase: 'BUILD', ore: 1000, oreStorageCap: 600,
    power: { gen: 20, draw: 0, coverage: 1 },
    buildings: [], enemies: [], planetHp: 120, planetMaxHp: 120,
    focusEid: null, focusUsed: false, timeS: 0,
    currentRound: 1, highestRoundCleared: 0,
    unlockedBuildings: ['kraftwerk', 'erz_sammler', 'geschuetz'],
    preview: { round: 1, groups: [], totalHp: 0, playerDps: 0, ratio: 0, assessment: 'machbar' },
    ...over,
  };
}

describe('buildTile', () => {
  it('Eco-Kachel: Erz-Produktion, baubar bei genug Erz', () => {
    const t = buildTile(snap(), 'erz_sammler');
    expect(t.nameDe).toBe('Erz-Sammler');
    expect(t.isWeapon).toBe(false);
    expect(t.producesOre).toBe(2);
    expect(t.powerCost).toBe(4);
    expect(t.locked).toBe(false);
    expect(t.buildable).toBe(true);
  });

  it('gesperrte Waffe: locked + nicht baubar', () => {
    const t = buildTile(snap(), 'laser'); // unlockNode u_laser, nicht freigeschaltet
    expect(t.locked).toBe(true);
    expect(t.buildable).toBe(false);
  });

  it('zu wenig Erz: nicht baubar, aber nicht locked', () => {
    const t = buildTile(snap({ ore: 0 }), 'geschuetz');
    expect(t.locked).toBe(false);
    expect(t.affordable).toBe(false);
    expect(t.buildable).toBe(false);
  });

  it('falsche Phase: nicht baubar', () => {
    const t = buildTile(snap({ phase: 'COMBAT' }), 'kraftwerk');
    expect(t.buildable).toBe(false);
  });

  it('Waffen-Tags: Slow + Anti-Luft', () => {
    const frost = buildTile(snap({ unlockedBuildings: ['frost'] }), 'frost');
    expect(frost.tags).toContain('Slow');
    const flak = buildTile(snap({ unlockedBuildings: ['flak'] }), 'flak');
    expect(flak.tags).toContain('Anti-Luft');
  });

  it('Kosten steigen mit Anzahl gleicher Gebäude', () => {
    const base = buildTile(snap(), 'kraftwerk').cost;
    const withOne = buildTile(snap({ buildings: [{ iid: 1, defId: 'kraftwerk', level: 1 }] }), 'kraftwerk').cost;
    expect(withOne).toBeGreaterThan(base);
  });
});

describe('popoverModel', () => {
  it('null wenn iid nicht existiert', () => {
    expect(popoverModel(snap(), 999)).toBeNull();
  });

  it('Waffe: Level, Schaden, Upgrade-Kosten, canUpgrade', () => {
    const s = snap({ buildings: [{ iid: 5, defId: 'geschuetz', level: 1, slot: 0, cooldown: 0 }] });
    const m = popoverModel(s, 5)!;
    expect(m.nameDe).toBe('Geschützturm');
    expect(m.level).toBe(1);
    expect(m.isWeapon).toBe(true);
    expect(m.damage).toBe(6);
    expect(m.upgradeCost).toBeGreaterThan(0);
    expect(m.canUpgrade).toBe(true);
  });

  it('maxed: canUpgrade false', () => {
    const s = snap({ buildings: [{ iid: 5, defId: 'geschuetz', level: 8, slot: 0 }] });
    const m = popoverModel(s, 5)!;
    expect(m.maxed).toBe(true);
    expect(m.canUpgrade).toBe(false);
  });

  it('Eco-Gebäude ist ebenfalls upgradebar', () => {
    const s = snap({ buildings: [{ iid: 2, defId: 'kraftwerk', level: 1 }] });
    const m = popoverModel(s, 2)!;
    expect(m.isWeapon).toBe(false);
    expect(m.canUpgrade).toBe(true);
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag bestätigen**

Run: `npm test -- hudModel`
Expected: FAIL „Cannot find module '../../src/ui/hud/model'".

- [ ] **Step 3: Minimale Implementierung**

```ts
// src/ui/hud/model.ts
import type { UiSnapshot } from '../stores/gameStore.svelte';
import { getBuilding } from '../../content/buildings';
import { BALANCE } from '../../content/balance';
import { nextCost } from '../../sim/formulas';
import type { BuildingId } from '../../content/types';

export interface BuildTile {
  id: BuildingId;
  nameDe: string;
  cost: number;
  powerGen: number;
  powerCost: number;
  producesOre: number; // nur Eco, sonst 0
  damage: number;      // nur Waffe, sonst 0
  range: number;       // nur Waffe, sonst 0
  tags: string[];      // z.B. ['Slow'], ['Anti-Luft']
  isWeapon: boolean;
  locked: boolean;
  affordable: boolean;
  buildable: boolean;  // !locked && affordable && Phase BUILD
}

export function buildTile(snap: UiSnapshot, id: BuildingId): BuildTile {
  const def = getBuilding(id);
  const count = snap.buildings.filter((b) => b.defId === id).length;
  const cost = nextCost(def.baseCost, BALANCE.costGrowth, count);
  const isWeapon = def.category === 'weapon';
  const locked = def.category === 'weapon' && def.unlockNode != null && !snap.unlockedBuildings.includes(def.id);
  const affordable = snap.ore >= cost;
  const tags: string[] = [];
  if (def.category === 'weapon') {
    if (def.slowMult != null) tags.push('Slow');
    if (def.canHitAir) tags.push('Anti-Luft');
  }
  return {
    id,
    nameDe: def.nameDe,
    cost,
    powerGen: def.powerGen,
    powerCost: def.powerCost,
    producesOre: def.category === 'eco' ? def.producesOrePerTick : 0,
    damage: def.category === 'weapon' ? def.baseDamage : 0,
    range: def.category === 'weapon' ? def.range : 0,
    tags,
    isWeapon,
    locked,
    affordable,
    buildable: !locked && affordable && snap.phase === 'BUILD',
  };
}

export interface PopoverModel {
  iid: number;
  nameDe: string;
  level: number;
  maxLevel: number;
  maxed: boolean;
  isWeapon: boolean;
  damage: number;
  range: number;
  producesOre: number;
  upgradeCost: number;
  canUpgrade: boolean;
}

export function popoverModel(snap: UiSnapshot, iid: number): PopoverModel | null {
  const b = snap.buildings.find((x) => x.iid === iid);
  if (!b) return null;
  const def = getBuilding(b.defId);
  const maxed = b.level >= def.maxLevel;
  const upgradeCost = nextCost(def.baseCost, BALANCE.costGrowth, b.level);
  return {
    iid,
    nameDe: def.nameDe,
    level: b.level,
    maxLevel: def.maxLevel,
    maxed,
    isWeapon: def.category === 'weapon',
    damage: def.category === 'weapon' ? def.baseDamage : 0,
    range: def.category === 'weapon' ? def.range : 0,
    producesOre: def.category === 'eco' ? def.producesOrePerTick : 0,
    upgradeCost,
    canUpgrade: !maxed && snap.ore >= upgradeCost && snap.phase === 'BUILD',
  };
}
```

- [ ] **Step 4: Test ausführen, Erfolg bestätigen**

Run: `npm test -- hudModel`
Expected: PASS (9 Tests).

- [ ] **Step 5: Typecheck + Commit**

Run: `npm run typecheck`
```bash
git add src/ui/hud/model.ts tests/ui/hudModel.test.ts
git commit -m "feat(hud): pure view-models for build tiles and turret popover"
```

---

### Task 3: BuildingIcon.svelte (SVG-Glyphen)

**Files:**
- Create: `src/ui/panels/BuildingIcon.svelte`

Kein Unit-Test (reines SVG). Verifikation über typecheck + Build + späteren Live-Check.

- [ ] **Step 1: Komponente schreiben**

```svelte
<!-- src/ui/panels/BuildingIcon.svelte -->
<script lang="ts">
  // Geometrische SVG-Glyphe je Gebäude-id. Farbe via currentColor (Parent setzt color).
  let { id, size = 22 }: { id: string; size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if id === 'kraftwerk'}
    <path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="currentColor" stroke="none" />
  {:else if id === 'erz_sammler'}
    <path d="M12 2 3 9l9 13 9-13z" fill="currentColor" stroke="none" />
  {:else if id === 'geschuetz'}
    <circle cx="9" cy="15" r="5" /><path d="M12 12 21 5" />
  {:else if id === 'artillery'}
    <circle cx="7" cy="17" r="4" /><path d="M9 14 19 7" /><path d="M16 5h4v4" />
  {:else if id === 'laser'}
    <circle cx="6" cy="12" r="3" /><path d="M9 12h12" /><path d="M18 9l3 3-3 3" />
  {:else if id === 'railgun'}
    <rect x="3" y="10" width="8" height="4" rx="1" /><path d="M11 12h10" />
  {:else if id === 'frost'}
    <path d="M12 2v20M4 7l16 10M20 7 4 17" />
  {:else if id === 'flak'}
    <path d="M5 14l7-7 7 7" /><path d="M5 19l7-7 7 7" />
  {:else}
    <circle cx="12" cy="12" r="8" />
  {/if}
</svg>
```

- [ ] **Step 2: Typecheck + Build**

Run: `npm run typecheck && npm run build`
Expected: clean (Komponente wird ab Task 4 importiert; bis dahin nur als Datei vorhanden, das ist ok).

- [ ] **Step 3: Commit**

```bash
git add src/ui/panels/BuildingIcon.svelte
git commit -m "feat(hud): geometric SVG icon per building type"
```

---

### Task 4: BuildMenu.svelte (Grid-Menü mit Tabs)

**Files:**
- Create: `src/ui/panels/BuildMenu.svelte`

- [ ] **Step 1: Komponente schreiben**

```svelte
<!-- src/ui/panels/BuildMenu.svelte -->
<script lang="ts">
  import { gameStore } from '../stores/gameStore.svelte';
  import { ECO_BUILDING_IDS, WEAPON_BUILDING_IDS } from '../../content/buildings';
  import { buildTile } from '../hud/model';
  import { fmt } from '../format';
  import BuildingIcon from './BuildingIcon.svelte';
  import type { UICommand } from '../../sim/commands/command';

  let { onCommand }: { onCommand: (c: UICommand) => void } = $props();
  const snap = $derived(gameStore.snapshot);

  let open = $state(true);
  let tab = $state<'eco' | 'weapon'>('eco');
  const ids = $derived(tab === 'eco' ? ECO_BUILDING_IDS : WEAPON_BUILDING_IDS);
  const tiles = $derived(ids.map((id) => buildTile(snap, id)));
</script>

<div class="buildmenu">
  <button class="toggle" onclick={() => (open = !open)} aria-expanded={open}>
    <BuildingIcon id="geschuetz" size={16} />
    <span>Bauen</span>
    <svg class="chev" class:up={open} width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  </button>

  {#if open}
    <div class="menu">
      <div class="tabs" role="tablist" aria-label="Bau-Kategorie">
        <button role="tab" aria-selected={tab === 'eco'} class:active={tab === 'eco'} onclick={() => (tab = 'eco')}>Eco</button>
        <button role="tab" aria-selected={tab === 'weapon'} class:active={tab === 'weapon'} onclick={() => (tab = 'weapon')}>Waffen</button>
      </div>

      <div class="grid">
        {#each tiles as t (t.id)}
          <button
            class="tile"
            class:locked={t.locked}
            disabled={!t.buildable}
            title={t.locked ? `${t.nameDe} (im Skilltree freischalten)` : t.nameDe}
            onclick={() => onCommand({ t: 'build', buildingId: t.id })}
          >
            <span class="ic"><BuildingIcon id={t.id} size={26} /></span>
            <span class="nm">{t.nameDe}</span>
            <span class="stats">
              {#if t.powerGen > 0}<span class="pwr">+{t.powerGen} Strom</span>{/if}
              {#if t.powerCost > 0}<span class="pwr neg">−{t.powerCost} Strom</span>{/if}
              {#if t.producesOre > 0}<span class="ore">+{t.producesOre} Erz/s</span>{/if}
              {#if t.damage > 0}<span class="dmg">{t.damage} Schaden</span>{/if}
              {#each t.tags as tag}<span class="tag">{tag}</span>{/each}
            </span>
            {#if t.locked}
              <span class="cost lk">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                gesperrt
              </span>
            {:else}
              <span class="cost">{fmt(t.cost)} Erz</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .buildmenu { display: flex; flex-direction: column; gap: 10px; }
  .toggle {
    align-self: flex-start; display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 16px; background: #1E2748; border: 1px solid #2C3760; border-radius: 12px;
    color: #F2F5FF; font-weight: 800; font-size: 14px; cursor: pointer; transition: border-color 0.18s ease;
  }
  .toggle:hover { border-color: #4DD0C2; }
  .toggle:focus-visible { outline: 2px solid #4DD0C2; outline-offset: 2px; }
  .chev { transition: transform 0.2s ease; }
  .chev.up { transform: rotate(180deg); }

  .menu { background: #141A33; border-radius: 14px; padding: 14px; }
  .tabs { display: inline-flex; gap: 4px; padding: 4px; background: #0B1026; border-radius: 10px; margin-bottom: 12px; }
  .tabs button {
    padding: 6px 18px; border: none; border-radius: 7px; background: transparent;
    color: #9AA6D4; font-weight: 800; font-size: 13px; cursor: pointer; transition: background 0.18s ease, color 0.18s ease;
  }
  .tabs button.active { background: #2C3760; color: #F2F5FF; }
  .tabs button:focus-visible { outline: 2px solid #4DD0C2; outline-offset: 1px; }

  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .tile {
    display: grid; grid-template-rows: auto auto 1fr auto; gap: 4px; min-height: 116px;
    padding: 12px 12px 10px; background: #1E2748; border: 1px solid #2C3760; border-radius: 12px;
    color: #F2F5FF; cursor: pointer; text-align: left; transition: border-color 0.18s ease, transform 0.18s ease;
  }
  .tile:hover:not(:disabled) { border-color: #4DD0C2; transform: translateY(-1px); }
  .tile:focus-visible { outline: 2px solid #4DD0C2; outline-offset: 2px; }
  .tile:disabled { opacity: 0.5; cursor: not-allowed; }
  .tile.locked { opacity: 0.55; }
  .ic { color: #7FFFE6; }
  .tile.locked .ic { color: #5A6699; }
  .nm { font-weight: 800; font-size: 13.5px; }
  .stats { display: flex; flex-wrap: wrap; gap: 4px 8px; font-size: 10.5px; font-weight: 700; align-content: start; }
  .pwr { color: #FFC53D; } .pwr.neg { color: #FFB020; } .ore { color: #4DD0C2; } .dmg { color: #FF8A8A; }
  .tag { color: #5AB0FF; background: #1B2F4A; padding: 0 6px; border-radius: 6px; }
  .cost { font-weight: 800; color: #4DD0C2; font-variant-numeric: tabular-nums; font-size: 12px; }
  .cost.lk { display: inline-flex; align-items: center; gap: 4px; color: #9AA6D4; }

  @media (prefers-reduced-motion: reduce) {
    .toggle, .chev, .tabs button, .tile { transition: none; }
  }
</style>
```

- [ ] **Step 2: Typecheck + Build**

Run: `npm run typecheck && npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/ui/panels/BuildMenu.svelte
git commit -m "feat(hud): grid build menu with eco/weapon tabs"
```

---

### Task 5: TurretPopover.svelte (Kontext-Popover)

**Files:**
- Create: `src/ui/panels/TurretPopover.svelte`

- [ ] **Step 1: Komponente schreiben**

```svelte
<!-- src/ui/panels/TurretPopover.svelte -->
<script lang="ts">
  import { gameStore } from '../stores/gameStore.svelte';
  import { popoverModel } from '../hud/model';
  import { fmt } from '../format';
  import BuildingIcon from './BuildingIcon.svelte';
  import { getBuilding } from '../../content/buildings';
  import type { UICommand } from '../../sim/commands/command';

  // x/y = Bildschirmposition des Gebäudes im Canvas (px). iid = ausgewähltes Gebäude.
  let { iid, x, y, onCommand, onClose }:
    { iid: number; x: number; y: number; onCommand: (c: UICommand) => void; onClose: () => void } = $props();

  const snap = $derived(gameStore.snapshot);
  const model = $derived(popoverModel(snap, iid));
  const defId = $derived(snap.buildings.find((b) => b.iid === iid)?.defId ?? 'geschuetz');
  const accent = $derived(getBuilding(defId).category === 'eco' ? '#4DD0C2' : '#7FFFE6');
</script>

{#if model}
  <div class="popover" style="left:{x}px; top:{y}px;" role="dialog" aria-label="{model.nameDe} verwalten">
    <button class="x" onclick={() => onClose()} aria-label="Schließen">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>

    <header>
      <span class="ic" style="color:{accent}"><BuildingIcon id={defId} size={20} /></span>
      <span class="title">{model.nameDe}</span>
      <span class="lvl">Lv {model.level}/{model.maxLevel}</span>
    </header>

    <div class="stats">
      {#if model.isWeapon}
        <span><b>{model.damage}</b> Schaden</span>
        <span><b>{model.range}</b> Reichw.</span>
      {:else if model.producesOre > 0}
        <span><b>+{model.producesOre}</b> Erz/s</span>
      {/if}
    </div>

    <button class="up" disabled={!model.canUpgrade} onclick={() => onCommand({ t: 'upgrade', iid: model.iid })}>
      {model.maxed ? 'Maximal ausgebaut' : `Upgrade · ${fmt(model.upgradeCost)} Erz`}
    </button>
  </div>
{/if}

<style>
  .popover {
    position: absolute; transform: translate(-50%, calc(-100% - 16px)); z-index: 30;
    min-width: 180px; padding: 12px 12px 12px; background: #141A33; border: 1px solid #2C3760;
    border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45); color: #F2F5FF;
  }
  .popover::after { /* Pfeil nach unten zum Turm */
    content: ''; position: absolute; left: 50%; top: 100%; transform: translateX(-50%);
    border: 7px solid transparent; border-top-color: #141A33;
  }
  .x { position: absolute; top: 6px; right: 6px; width: 22px; height: 22px; display: grid; place-items: center;
    background: transparent; border: none; color: #9AA6D4; cursor: pointer; border-radius: 6px; }
  .x:hover { color: #F2F5FF; background: #1E2748; }
  .x:focus-visible { outline: 2px solid #4DD0C2; outline-offset: 1px; }
  header { display: flex; align-items: center; gap: 8px; padding-right: 22px; }
  .title { font-weight: 800; font-size: 14px; }
  .lvl { margin-left: auto; color: #7FFFE6; font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .stats { display: flex; gap: 14px; margin: 8px 0 10px; font-size: 12px; color: #9AA6D4; font-variant-numeric: tabular-nums; }
  .stats b { color: #F2F5FF; }
  .up { width: 100%; padding: 8px; background: #4DD0C2; color: #06121f; border: none; border-radius: 9px;
    font-weight: 800; font-size: 13px; cursor: pointer; font-variant-numeric: tabular-nums; transition: opacity 0.18s ease; }
  .up:hover:not(:disabled) { opacity: 0.9; }
  .up:disabled { background: #2C3760; color: #9AA6D4; cursor: not-allowed; }
  .up:focus-visible { outline: 2px solid #F2F5FF; outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { .up { transition: none; } }
</style>
```

- [ ] **Step 2: Typecheck + Build**

Run: `npm run typecheck && npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/ui/panels/TurretPopover.svelte
git commit -m "feat(hud): turret context popover (info + upgrade)"
```

---

### Task 6: ResourceBar.svelte restyle (Chips + SVG)

**Files:**
- Modify: `src/ui/panels/ResourceBar.svelte` (vollständig ersetzen)

- [ ] **Step 1: Komponente ersetzen**

```svelte
<!-- src/ui/panels/ResourceBar.svelte -->
<script lang="ts">
  import { gameStore } from '../stores/gameStore.svelte';
  import { fmt, fmtInt } from '../format';

  const snap = $derived(gameStore.snapshot);
  const coveragePct = $derived(Math.round(snap.power.coverage * 100));
  const deficit = $derived(snap.power.coverage < 1);
</script>

<div class="bar">
  <div class="chip ore">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2 3 9l9 13 9-13z" /></svg>
    <span class="txt"><b>{fmt(snap.ore)}</b><span class="cap"> / {fmt(snap.oreStorageCap)}</span></span>
  </div>

  <div class="chip power" class:deficit>
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>
    <span class="txt"><b>{fmtInt(snap.power.gen)}</b> / {fmtInt(snap.power.draw)}</span>
    {#if deficit}<span class="warn">{coveragePct}% · Produktion gedrosselt</span>{/if}
  </div>
</div>

<style>
  .bar { display: flex; gap: 12px; }
  .chip {
    display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px;
    background: #141A33; border: 1px solid #2C3760; border-radius: 999px;
  }
  .chip.ore { color: #4DD0C2; } .chip.power { color: #FFC53D; }
  .txt { color: #F2F5FF; font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .txt b { font-weight: 800; }
  .cap { color: #5A6699; font-size: 12px; font-weight: 600; }
  .warn { color: #FF4D5E; font-size: 11px; font-weight: 700; margin-left: 2px; }
  .chip.deficit { border-color: #FF4D5E; }
  .chip.deficit .txt b { color: #FF4D5E; animation: pulse 1s ease-in-out infinite; display: inline-block; }
  @keyframes pulse { 50% { opacity: 0.5; } }
  @media (prefers-reduced-motion: reduce) { .chip.deficit .txt b { animation: none; } }
</style>
```

- [ ] **Step 2: Typecheck + Build**

Run: `npm run typecheck && npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/ui/panels/ResourceBar.svelte
git commit -m "refactor(hud): resource bar as pill chips with svg icons"
```

---

### Task 7: WaveControl.svelte restyle (schlank, Emoji raus)

**Files:**
- Modify: `src/ui/panels/WaveControl.svelte` (vollständig ersetzen)

Funktion bleibt identisch (gleiche Props, gleiche Commands, gleiche Phasen-Zweige inkl. Run-Ende-Screens). Nur Styling + Emoji `🌍` entfernt.

- [ ] **Step 1: Komponente ersetzen**

```svelte
<!-- src/ui/panels/WaveControl.svelte -->
<script lang="ts">
  import { gameStore } from '../stores/gameStore.svelte';
  import { fmtInt } from '../format';
  import type { UICommand } from '../../sim/commands/command';

  let { onCommand, onRestart, onOpenSkilltree, breakdown }:
    { onCommand: (c: UICommand) => void; onRestart: () => void; onOpenSkilltree: () => void;
      breakdown: { basis: number; bossBonus: number; recordBonus: number; gained: number } | null } = $props();

  const snap = $derived(gameStore.snapshot);
  const hpFrac = $derived(snap.planetMaxHp > 0 ? snap.planetHp / snap.planetMaxHp : 0);
  const aliveCount = $derived(snap.enemies.filter((e) => e.alive).length);
</script>

<div class="wave">
  <div class="hp">
    <span class="label">PLANET</span>
    <div class="track"><div class="fill" class:low={hpFrac <= 0.3} style="width:{Math.max(0, hpFrac) * 100}%"></div></div>
    <span class="val">{fmtInt(snap.planetHp)} / {fmtInt(snap.planetMaxHp)}</span>
  </div>

  {#if snap.phase === 'BUILD'}
    <div class="row">
      <span class="round">Runde {snap.currentRound} / 10</span>
      <div class="preview">
        {#each snap.preview.groups as g (g.enemyId)}<span class="grp" class:boss={g.isBoss}>{g.count}× {g.nameDe}</span>{/each}
      </div>
      <span class="assess {snap.preview.assessment}">{snap.preview.assessment}</span>
      <button class="start" onclick={() => onCommand({ t: 'startWave' })}>Welle starten</button>
    </div>
  {:else if snap.phase === 'COMBAT'}
    <div class="row">
      <span class="round">Runde {snap.currentRound}</span>
      <span class="badge">COMBAT</span>
      <span class="muted">{aliveCount} Gegner</span>
      {#if !snap.focusUsed}<span class="hint">Klick einen Gegner für Fokus</span>{:else}<span class="hint used">Fokus genutzt</span>{/if}
    </div>
  {:else if snap.phase === 'RUN_WON'}
    <div class="overlay won">
      <strong>Planet geschafft</strong>
      {#if breakdown}<div class="tp">+{breakdown.gained} Tech-Punkte (Basis {breakdown.basis} · Boss {breakdown.bossBonus} · Rekord {breakdown.recordBonus})</div>{/if}
      <button class="start" onclick={() => onRestart()}>Neu starten</button>
      <button class="skill" onclick={() => onOpenSkilltree()}>Skilltree</button>
    </div>
  {:else if snap.phase === 'RUN_OVER'}
    <div class="overlay lost">
      <strong>Planet verloren: Runde {snap.highestRoundCleared} erreicht</strong>
      {#if breakdown}<div class="tp">+{breakdown.gained} Tech-Punkte (Basis {breakdown.basis} · Boss {breakdown.bossBonus} · Rekord {breakdown.recordBonus})</div>{/if}
      <button class="start" onclick={() => onRestart()}>Neu starten</button>
      <button class="skill" onclick={() => onOpenSkilltree()}>Skilltree</button>
    </div>
  {/if}
</div>

<style>
  .wave { display: flex; align-items: center; gap: 20px; padding: 12px 18px; background: #141A33; border-radius: 12px; flex-wrap: wrap; }
  .hp { display: flex; align-items: center; gap: 10px; }
  .label { font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #9AA6D4; }
  .track { width: 160px; height: 10px; background: #0B1026; border-radius: 6px; overflow: hidden; }
  .fill { height: 100%; background: #3DDC84; transition: width 0.2s; }
  .fill.low { background: #FF4D5E; }
  .val { font-size: 13px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .round { font-weight: 800; color: #9AA6D4; }
  .preview { display: flex; gap: 8px; flex-wrap: wrap; font-size: 12px; }
  .grp.boss { color: #FF4D5E; font-weight: 800; }
  .assess { padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; }
  .assess.leicht { background: #1d3a2a; color: #3DDC84; }
  .assess.machbar { background: #3a3320; color: #FFB020; }
  .assess.hart { background: #3a1820; color: #FF4D5E; }
  .start { padding: 10px 20px; background: #4DD0C2; color: #06121f; font-weight: 800; border: none; border-radius: 10px; cursor: pointer; font-size: 15px; transition: opacity 0.18s ease; }
  .start:hover { opacity: 0.9; }
  .start:focus-visible, .skill:focus-visible { outline: 2px solid #F2F5FF; outline-offset: 2px; }
  .badge { background: #FF4D5E; color: #fff; font-weight: 800; padding: 3px 10px; border-radius: 999px; font-size: 11px; }
  .muted { color: #9AA6D4; font-size: 13px; }
  .hint { color: #FFB020; font-size: 12px; } .hint.used { color: #5A6699; }
  .overlay { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; font-size: 16px; }
  .overlay.won { color: #3DDC84; } .overlay.lost { color: #FF4D5E; }
  .tp { color: #FF7A59; font-weight: 800; font-size: 14px; }
  .skill { padding: 10px 18px; background: #2C3760; color: #F2F5FF; font-weight: 800; border: none; border-radius: 10px; cursor: pointer; font-size: 15px; }
  @media (prefers-reduced-motion: reduce) { .fill, .start { transition: none; } }
</style>
```

- [ ] **Step 2: Typecheck + Build**

Run: `npm run typecheck && npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/ui/panels/WaveControl.svelte
git commit -m "refactor(hud): slim wave control bar, drop emoji"
```

---

### Task 8: SkillTreePanel.svelte Politur

**Files:**
- Modify: `src/ui/panels/SkillTreePanel.svelte`

Nur leichte Stil-Angleichung (Hover-Transition + Fokus-Ring + Branch-Punkt). Funktion/Markup-Logik bleibt. Ersetze den `<style>`-Block und ergänze nichts an der Logik.

- [ ] **Step 1: `<style>`-Block ersetzen**

Ersetze den kompletten `<style>...</style>` in `src/ui/panels/SkillTreePanel.svelte` durch:

```svelte
<style>
  .tree { background: #141A33; border-radius: 14px; padding: 18px; max-width: 760px; margin: 0 auto; }
  header { display: flex; align-items: center; gap: 16px; margin-bottom: 14px; }
  h2 { margin: 0; font-size: 18px; }
  .tp { color: #FF7A59; font-weight: 800; font-variant-numeric: tabular-nums; }
  .close { margin-left: auto; background: #2C3760; border: none; color: #F2F5FF; padding: 8px 14px; border-radius: 9px; cursor: pointer; font-weight: 700; transition: background 0.18s ease; }
  .close:hover { background: #3a477a; }
  .close:focus-visible { outline: 2px solid #4DD0C2; outline-offset: 2px; }
  .nodes { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
  .node { background: #1E2748; border: 1px solid #2C3760; border-radius: 12px; padding: 12px; }
  .node.eco { border-left: 3px solid #4DD0C2; } .node.defense { border-left: 3px solid #FF4D5E; } .node.survival { border-left: 3px solid #FFC53D; }
  .name { font-weight: 800; } .lvl { color: #9AA6D4; font-size: 12px; font-variant-numeric: tabular-nums; }
  .desc { font-size: 12px; color: #9AA6D4; margin: 6px 0 10px; }
  button { width: 100%; background: #4DD0C2; color: #06121f; border: none; padding: 8px; border-radius: 9px; font-weight: 800; cursor: pointer; font-variant-numeric: tabular-nums; transition: opacity 0.18s ease; }
  button:hover:not(:disabled) { opacity: 0.9; }
  button:focus-visible { outline: 2px solid #F2F5FF; outline-offset: 2px; }
  button:disabled { opacity: .45; cursor: not-allowed; background: #2C3760; color: #9AA6D4; }
  @media (prefers-reduced-motion: reduce) { .close, button { transition: none; } }
</style>
```

> Hinweis: Die `.close`-Button-Regel und die generische `button`-Regel beide vorhanden lassen (CSS-Spezifität: `.close` gewinnt für den Schließen-Button). Keine weiteren Änderungen an Script/Markup.

- [ ] **Step 2: Typecheck + Build**

Run: `npm run typecheck && npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/ui/panels/SkillTreePanel.svelte
git commit -m "style(hud): polish skill tree panel (hover/focus, tabular nums)"
```

---

### Task 9: App.svelte Integration (Layout + Klick-Routing + Popover)

**Files:**
- Modify: `src/App.svelte` (vollständig ersetzen)
- Delete: `src/ui/panels/BuildPanel.svelte`

Wichtig: `boot()`, `handleCommand`, `buySkill`, `handleRestart`, der Session-/MetaStore-Block und `onMount` bleiben funktional unverändert. Neu sind: Imports (BuildMenu/TurretPopover/hitTest/globeProjection statt BuildPanel/viewport/pathPosition), HUD-`$state`, das umgebaute `handleCanvasClick`, abgeleitete Popover-Position, ein `$effect` zum Schließen, und das neue Markup.

- [ ] **Step 1: App.svelte ersetzen**

```svelte
<!-- src/App.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { createInitialState } from './sim/core/GameState';
  import { deriveUnlocks } from './sim/meta';
  import { Canvas2DRenderer } from './render/Canvas2DRenderer';
  import { GameClock } from './app/GameClock';
  import { readSave } from './persistence/storage';
  import { gameStore } from './ui/stores/gameStore.svelte';
  import { metaStore } from './ui/stores/metaStore.svelte';
  import { Session, type MetaStore } from './app/session';
  import type { GameState } from './sim/core/GameState';
  import type { RunEndBreakdown } from './app/session';
  import { planetView, surfacePoint, buildingLonLat } from './render/globeProjection';
  import { pickFrontBuilding, pickEnemy } from './render/hitTest';
  import type { UICommand } from './sim/commands/command';
  import ResourceBar from './ui/panels/ResourceBar.svelte';
  import BuildMenu from './ui/panels/BuildMenu.svelte';
  import WaveControl from './ui/panels/WaveControl.svelte';
  import SkillTreePanel from './ui/panels/SkillTreePanel.svelte';
  import TurretPopover from './ui/panels/TurretPopover.svelte';

  const CANVAS_W = 640, CANVAS_H = 560;
  let canvas: HTMLCanvasElement;
  let clock: GameClock | undefined;
  const SEED = 12345;

  const META_KEY = 'planet_defense_meta_v1';
  const browserMetaStore: MetaStore = {
    read() { try { return localStorage.getItem(META_KEY); } catch { return null; } },
    write(raw: string) { try { localStorage.setItem(META_KEY, raw); } catch { /* ignore */ } },
  };
  const session = new Session(browserMetaStore);
  metaStore.push(session.meta);

  let lastBreakdown = $state<RunEndBreakdown | null>(null);
  let showSkilltree = $state(false);
  let selectedTurretIid = $state<number | null>(null);

  const snap = $derived(gameStore.snapshot);

  // Popover-Position: exakt dieselbe Globus-Mathe wie der Renderer (timeS aus dem Snapshot).
  const popoverPos = $derived.by(() => {
    if (selectedTurretIid === null) return null;
    const b = snap.buildings.find((x) => x.iid === selectedTurretIid);
    if (!b) return null;
    const view = planetView(CANVAS_W, CANVAS_H);
    const ll = buildingLonLat(b);
    return surfacePoint(ll.lon, ll.lat, snap.timeS, view);
  });

  // Schließen, sobald das Gebäude weg ist, nach hinten rotiert oder die Phase wechselt.
  $effect(() => {
    if (selectedTurretIid === null) return;
    const gone = !snap.buildings.some((b) => b.iid === selectedTurretIid);
    const back = popoverPos !== null && popoverPos.depth <= 0.05;
    if (gone || back || snap.phase !== 'BUILD') selectedTurretIid = null;
  });

  function handleCommand(cmd: UICommand) { clock?.enqueue(cmd); }

  function boot() {
    lastBreakdown = null;
    selectedTurretIid = null;
    const unlocks = ['kraftwerk', 'erz_sammler', 'geschuetz', ...deriveUnlocks(session.meta.skillNodes)];
    const state = createInitialState(SEED, session.runMods(), unlocks);
    const renderer = new Canvas2DRenderer(canvas);
    clock?.stop();
    clock = new GameClock(state, renderer);
    clock.onRunEnd = (s: GameState) => {
      const bd = session.endRun({ highestRoundCleared: s.highestRoundCleared, bossesKilledThisRun: s.bossesKilledThisRun });
      lastBreakdown = bd;
      metaStore.push(session.meta);
    };
    clock.start();
    metaStore.push(session.meta);
  }
  function handleRestart() { boot(); }

  function buySkill(id: string) { session.buy(id); metaStore.push(session.meta); }

  function handleCanvasClick(ev: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
    const view = planetView(CANVAS_W, CANVAS_H);

    if (snap.phase === 'BUILD') {
      const iid = pickFrontBuilding(snap.buildings, snap.timeS, view, mx, my);
      selectedTurretIid = iid; // Treffer wählt aus, Leerklick schließt
      return;
    }
    if (snap.phase === 'COMBAT' && !snap.focusUsed) {
      const eid = pickEnemy(snap.enemies, view, CANVAS_W, CANVAS_H, mx, my);
      if (eid !== null) handleCommand({ t: 'focusMark', eid });
    }
  }

  onMount(() => {
    const save = readSave();
    console.log('[boot] Save geladen, schemaVersion', save.schemaVersion);
    boot();
    return () => clock?.stop();
  });
</script>

<main>
  {#if showSkilltree}
    <SkillTreePanel onBuy={buySkill} onClose={() => (showSkilltree = false)} />
  {:else}
    <header class="topbar">
      <ResourceBar />
      <button class="skilltree-btn" onclick={() => (showSkilltree = true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="5" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="18" r="2.5" />
          <path d="M12 7.5v4M12 11.5 7 15.8M12 11.5l5 4.3" />
        </svg>
        Skilltree
      </button>
    </header>

    <div class="stage">
      <div class="canvas-wrap" style="width:{CANVAS_W}px; height:{CANVAS_H}px;">
        <canvas bind:this={canvas} width={CANVAS_W} height={CANVAS_H} onclick={handleCanvasClick}></canvas>
        {#if selectedTurretIid !== null && popoverPos}
          <TurretPopover
            iid={selectedTurretIid}
            x={popoverPos.x}
            y={popoverPos.y}
            onCommand={handleCommand}
            onClose={() => (selectedTurretIid = null)}
          />
        {/if}
      </div>
    </div>

    <WaveControl onCommand={handleCommand} onRestart={handleRestart} onOpenSkilltree={() => (showSkilltree = true)} breakdown={lastBreakdown} />

    {#if snap.phase === 'BUILD'}
      <BuildMenu onCommand={handleCommand} />
    {/if}
  {/if}
</main>

<style>
  :global(body) { margin: 0; background: #0b1026; color: #F2F5FF; font-family: 'Nunito Sans', system-ui, sans-serif; }
  main { max-width: 1040px; margin: 0 auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
  .topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .skilltree-btn {
    display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px;
    background: #1E2748; border: 1px solid #2C3760; border-radius: 999px; color: #FF7A59;
    font-weight: 800; font-size: 13px; cursor: pointer; transition: border-color 0.18s ease;
  }
  .skilltree-btn:hover { border-color: #FF7A59; }
  .skilltree-btn:focus-visible { outline: 2px solid #FF7A59; outline-offset: 2px; }
  .stage { display: flex; justify-content: center; }
  .canvas-wrap { position: relative; flex: 0 0 auto; }
  canvas { display: block; border-radius: 12px; background: #0B1026; cursor: crosshair; }
  @media (prefers-reduced-motion: reduce) { .skilltree-btn { transition: none; } }
</style>
```

- [ ] **Step 2: BuildPanel löschen**

```bash
git rm src/ui/panels/BuildPanel.svelte
```

- [ ] **Step 3: Typecheck + Build + komplette Test-Suite**

Run: `npm run typecheck`
Expected: clean (keine ungenutzten Imports; `viewScale`/`pathPosition` sind raus).

Run: `npm run build`
Expected: clean Bundle.

Run: `npm test`
Expected: ALLE Tests grün (155 bestehende + neue aus Task 1 & 2). Golden-Snapshot unverändert (kein Sim-/State-Eingriff).

- [ ] **Step 4: Commit**

```bash
git add src/App.svelte
git commit -m "feat(hud): new layout, globe click-routing, turret popover wiring"
```

---

### Task 10: Gesamt-Verifikation

**Files:** keine Änderung (nur Prüfung).

- [ ] **Step 1: Vollständige Suite + Build + Typecheck**

```bash
npm test && npm run typecheck && npm run build
```
Expected: alles grün; Golden unverändert; Bundle baut.

- [ ] **Step 2: Golden bewusst gegenprüfen**

Run: `npm test -- golden`
Expected: PASS, unverändert. Falls der Golden-Test fehlschlägt, wurde versehentlich State/Sim berührt — zurückrollen, NICHT den Golden neu schreiben.

- [ ] **Step 3: Live-Check (Preview)**

Der Controller (nicht der Implementer) verifiziert live via Preview-Tooling:
- Dev-Server läuft (Port 5174). Nach Reload: `BAUEN`-Toggle vorhanden, Tabs `Eco`/`Waffen` schalten das Grid um, Kacheln zeigen SVG-Icon + Kosten, gesperrte Waffen ausgegraut mit Schloss.
- Ein Geschütz bauen, dann in BUILD daraufklicken → Popover erscheint über dem Turm mit Upgrade-Button.
- Ressourcen-Chips oben, Skilltree-Button oben rechts, schlanke Wave-Leiste mit „Welle starten".
- Hinweis: Animationen (Planet-Spin) laufen nur im sichtbaren Tab; Pixel-Reads/DOM-Snapshots zur Verifikation nutzen, Screenshot ist bei Dauer-Animation unzuverlässig.

- [ ] **Step 4: Abschluss-Commit (falls noch offen) + finaler Review**

Dispatch finalen Code-Reviewer über die gesamte Implementierung (Tasks 1 bis 9). Danach `superpowers:finishing-a-development-branch`.

---

## Self-Review (vom Plan-Autor durchgeführt)

- **Spec-Abdeckung (Teil B):** ResourceBar-Chips (Task 6) ✓ · WaveControl schlank + Run-Ende bleibt (Task 7) ✓ · BuildPanel→BuildMenu Grid+Tabs+Toggle (Task 4) ✓ · TurretPopover nur Upgrade, keine neuen Commands (Task 5, model in Task 2) ✓ · SkillTreePanel Politur + Trigger oben rechts (Task 8 + App Task 9) ✓ · App Layout + Klick-Routing via globeProjection (Task 9, hitTest Task 1) ✓ · SVG statt Emoji, tabular-nums, Hover 150-300 ms, Fokus-Ring, reduced-motion (alle Komponenten) ✓ · Commands unverändert (`build`/`upgrade`/`startWave`/`focusMark`) ✓.
- **Bewusst v2 (laut Spec §5.3 / §7):** Popover „An-Aus"/„Abreißen" (brauchen neue Commands), interaktive Platzierung per Klick (Auto-Slot bleibt), Spin-Pause bei offenem Popover (stattdessen: reaktives Mitführen + Schließen bei Rückseite). Auto-Slot über bestehenden `build`-Command bleibt.
- **Zusätzlicher Fix (in Scope, da reine Präsentation):** COMBAT-Fokus-Klick nutzt jetzt `enemyScreen` statt der alten Top-Down-Projektion (`pathPosition`/`viewScale`), sonst trifft der Klick nach dem Globus-Rewrite daneben. Abgedeckt durch `pickEnemy` (Task 1) + App (Task 9).
- **Platzhalter-Scan:** keine TBD/TODO; alle Code-Blöcke vollständig.
- **Typ-Konsistenz:** `buildTile`/`popoverModel`-Felder stimmen zwischen Task 2 (Definition), Task 4/5 (Konsumenten) überein. `pickFrontBuilding(buildings, timeS, view, mx, my)` und `pickEnemy(enemies, view, w, h, mx, my)` identisch in Task 1 (Def) und Task 9 (Aufruf). `UiSnapshot`-Felder gegen `gameStore.svelte.ts` geprüft. Union-Narrowing in `model.ts` strikt über `def.category` (kein Zugriff auf Waffen-Felder ohne Guard, sonst `tsc`-Fehler).
- **Render-Invariante:** Keine Datei unter `sim/`, `content/`, `app/`, `persistence/`, `render/Canvas2DRenderer.ts`, `render/globeProjection.ts`, `render/effects.ts` wird geändert → Golden + 155 Tests bleiben grün.
