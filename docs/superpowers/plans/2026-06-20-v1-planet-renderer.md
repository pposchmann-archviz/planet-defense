# V1 — 3D-Planet-Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Den flachen Top-Down-Renderer durch einen stilisierten, sich drehenden 2.5D-Planeten ersetzen: Geschütze sitzen auf der Oberfläche und drehen mit (hinten ausgeblendet), Schüsse sind sichtbar (Tracer + Mündungsblitz), Gegner fliegen aus dem All an, Treffer poppen — alles ohne die getestete Sim/Combat-Logik anzufassen.

**Architecture:** Reine Präsentations-Schicht (Approach A). Ein neues, rein-mathematisches `globeProjection`-Modul mappt Sim-Daten auf den Globus (Slot → Längengrad; Gegner-Winkel/Fortschritt → Bildschirmposition). Schuss-/Treffer-Effekte sind **render-only** (im Renderer gehaltene transiente Liste, NICHT im `GameState` → Golden unberührt): Tracer werden über cooldown-Sprünge erkannt, Treffer-Pops über verschwundene Gegner. `Canvas2DRenderer` wird neu geschrieben; Sim/Tests/Golden bleiben unverändert.

**Tech Stack:** TypeScript + Vite + Vitest (wie bisher). Reines Canvas2D, keine neue Dependency.

**Kontext:** Projekt `C:/Users/pposc/Documents/PlanetDefense`, M0–M6 fertig (146 Tests). Spec: `docs/superpowers/specs/2026-06-20-visual-overhaul-3d-planet-hud-design.md` (Kap. 3, 4). Windows; `npm test`, `npm run typecheck`, `npm run build`. HEAD-Stand: nach M6 + Spec-Commit.

**Wichtig:** Die HUD-Komponenten (BuildPanel/WaveControl/etc.) bleiben in DIESEM Plan unverändert — sie funktionieren über dem neuen Renderer weiter. Das HUD-Redesign ist ein separater Folgeplan.

**State-Referenz (read-only im Renderer):** `state.timeS`, `state.currentRound`, `state.planet.{hp,maxHp}`, `state.enemies[]` (`eid,defId,hp,maxHp,angle,progress,alive,isBoss?,bossPhase?,flying?,slowTimerS?`), `state.buildings[]` (`iid,defId,level,slot?,cooldown?`). Sim-Helfer: `getBuilding`, `getEnemy`, `selectTarget(state,turret)` (reine Lesefunktion), `BALANCE.TOWER_SLOTS`.

> **Projektil-Hinweis:** `state.projectiles` (Artillerie) liegen in Sim-Top-Down-Koordinaten und mappen NICHT sauber auf den Seitenansicht-Globus. Daher werden ALLE Schüsse (Hitscan + ballistisch) visuell als **Bildschirm-Tracer** (über cooldown-Sprung erkannt) + Treffer-Pop dargestellt; die Sim-Projektil-Positionen werden im Globus-Render NICHT geplottet. Das Splash-Gameplay bleibt unverändert (Sim unberührt).

---

## File Structure

```
src/render/
├─ globeProjection.ts   # NEW: reine Globus-Mathe (Planet-View, Oberflächenpunkt, Gebäude-lon/lat, Gegner-Screen)
├─ effects.ts           # NEW: transiente Render-Effekte (Tracer + Pop), Lebenszeit-Aging
└─ Canvas2DRenderer.ts  # REWRITE: 2.5D-Globus + Türme + Gegner + Effekte; liest State, mutiert nichts
tests/render/
├─ globeProjection.test.ts  # NEW
└─ effects.test.ts          # NEW
```

`src/render/viewport.ts` bleibt vorerst liegen (von Klick-Hittest genutzt; wird im HUD-Plan abgelöst). Sim/Content/UI unverändert.

---

## Task 1: globeProjection (reine Globus-Mathematik)

**Files:**
- Create: `src/render/globeProjection.ts`
- Test: `tests/render/globeProjection.test.ts`

- [ ] **Step 1: Failing test schreiben**

`tests/render/globeProjection.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { planetView, surfacePoint, buildingLonLat, enemyScreen, SPIN_RATE } from '../../src/render/globeProjection';

describe('planetView', () => {
  it('zentriert + Radius = 30% der kleineren Kante', () => {
    const v = planetView(800, 600);
    expect(v.cx).toBe(400);
    expect(v.cy).toBe(300);
    expect(v.R).toBeCloseTo(180, 6); // 0.3 * 600
  });
});

describe('surfacePoint', () => {
  it('lon0/lat0/timeS0 = Vorderseite mittig', () => {
    const v = planetView(800, 600);
    const p = surfacePoint(0, 0, 0, v);
    expect(p.x).toBeCloseTo(v.cx, 6);
    expect(p.depth).toBeCloseTo(1, 6); // vorne
  });
  it('lon=PI = Rückseite (depth negativ)', () => {
    const v = planetView(800, 600);
    expect(surfacePoint(Math.PI, 0, 0, v).depth).toBeCloseTo(-1, 6);
  });
  it('Spin verschiebt den Längengrad über die Zeit', () => {
    const v = planetView(800, 600);
    const a = surfacePoint(0, 0, 0, v);
    const b = surfacePoint(0, 0, 1, v); // +SPIN_RATE rad
    expect(b.depth).toBeLessThan(a.depth); // dreht aus der Frontmitte heraus
  });
});

describe('buildingLonLat', () => {
  it('Waffe nutzt Slot-Index als Längengrad', () => {
    expect(buildingLonLat({ slot: 0, iid: 1 }).lon).toBeCloseTo(0, 6);
  });
  it('Eco-Gebäude (kein Slot) bekommt deterministische Position', () => {
    const a = buildingLonLat({ iid: 3 });
    const b = buildingLonLat({ iid: 3 });
    expect(a).toEqual(b);
    expect(a.lat).not.toBe(buildingLonLat({ slot: 0, iid: 1 }).lat);
  });
});

describe('enemyScreen', () => {
  it('progress 1 = nahe am Planeten, progress 0 = weit im All', () => {
    const v = planetView(800, 600);
    const near = enemyScreen(0, 1, v, 800, 600);
    const far = enemyScreen(0, 0, v, 800, 600);
    const dNear = Math.hypot(near.x - v.cx, near.y - v.cy);
    const dFar = Math.hypot(far.x - v.cx, far.y - v.cy);
    expect(dNear).toBeLessThan(dFar);
    expect(dNear).toBeCloseTo(v.R * 1.05, 4);
  });
});
```

- [ ] **Step 2: Run → FAIL.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/render/globeProjection.test.ts`
Expected: FAIL (Modul fehlt).

- [ ] **Step 3: Implementieren**

`src/render/globeProjection.ts`:
```ts
import { BALANCE } from '../content/balance';

export const SPIN_RATE = (Math.PI * 2) / 30; // 1 Umdrehung / 30 s (ambient)
const R_FAR_FACTOR = 1.35;

export interface PlanetView { cx: number; cy: number; R: number; }
export interface SurfacePt { x: number; y: number; depth: number; }
export interface Vec2 { x: number; y: number; }

export function planetView(w: number, h: number): PlanetView {
  return { cx: w / 2, cy: h / 2, R: Math.min(w, h) * 0.3 };
}

// Oberflächenpunkt: lon/lat (Breite) zur Zeit timeS → Bildschirm + depth (>0 = Vorderseite).
export function surfacePoint(lon: number, lat: number, timeS: number, view: PlanetView): SurfacePt {
  const l = lon + timeS * SPIN_RATE;
  const cl = Math.cos(lat);
  return {
    x: view.cx + view.R * cl * Math.sin(l),
    y: view.cy - view.R * Math.sin(lat),
    depth: cl * Math.cos(l),
  };
}

// Gebäude → fixer Längengrad/Breitengrad (deterministisch, render-only).
export function buildingLonLat(b: { slot?: number; iid: number }): { lon: number; lat: number } {
  if (b.slot !== undefined) {
    return { lon: (b.slot / BALANCE.TOWER_SLOTS) * Math.PI * 2, lat: -0.15 + (b.slot % 2) * 0.3 };
  }
  return { lon: (b.iid * 2.399963) % (Math.PI * 2), lat: 0.55 };
}

// Gegner angle+progress → Bildschirmposition um den Globus (weit → nah).
export function enemyScreen(angle: number, progress: number, view: PlanetView, w: number, h: number): Vec2 {
  const rFar = Math.hypot(w, h) * 0.5 * R_FAR_FACTOR;
  const p = Math.max(0, Math.min(1, progress));
  const r = rFar + (view.R * 1.05 - rFar) * p;
  return { x: view.cx + Math.cos(angle) * r, y: view.cy + Math.sin(angle) * r };
}
```

- [ ] **Step 4: Run → PASS + Typecheck.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/render/globeProjection.test.ts && npm run typecheck`
Expected: alle grün, typecheck clean.

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/render/globeProjection.ts tests/render/globeProjection.test.ts && git commit -m "feat(render): globe projection math (surface points, building lon/lat, enemy screen)"
```

---

## Task 2: Render-Effekte (Tracer + Pop, transient)

**Files:**
- Create: `src/render/effects.ts`
- Test: `tests/render/effects.test.ts`

- [ ] **Step 1: Failing test schreiben**

`tests/render/effects.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { RenderEffects } from '../../src/render/effects';

describe('RenderEffects', () => {
  it('addTracer + addPop legen Effekte mit Leben 1 an', () => {
    const fx = new RenderEffects();
    fx.addTracer(0, 0, 10, 10, '#fff');
    fx.addPop(5, 5, '#f00');
    expect(fx.tracers).toHaveLength(1);
    expect(fx.pops).toHaveLength(1);
    expect(fx.tracers[0].life).toBe(1);
  });
  it('tick altert Effekte und entfernt abgelaufene', () => {
    const fx = new RenderEffects();
    fx.addTracer(0, 0, 1, 1, '#fff');
    fx.tick(0.1); // life sinkt
    expect(fx.tracers[0].life).toBeLessThan(1);
    fx.tick(1); // weit über Lebenszeit
    expect(fx.tracers).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run → FAIL.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/render/effects.test.ts`

- [ ] **Step 3: Implementieren**

`src/render/effects.ts`:
```ts
export interface Tracer { x1: number; y1: number; x2: number; y2: number; color: string; life: number; }
export interface Pop { x: number; y: number; color: string; life: number; }

const TRACER_FADE = 5; // 1/life-Sekunden
const POP_FADE = 3;

// Transiente, render-only Effekte (KEIN Teil des Sim-States → Determinismus/Golden unberührt).
export class RenderEffects {
  tracers: Tracer[] = [];
  pops: Pop[] = [];

  addTracer(x1: number, y1: number, x2: number, y2: number, color: string): void {
    this.tracers.push({ x1, y1, x2, y2, color, life: 1 });
  }
  addPop(x: number, y: number, color: string): void {
    this.pops.push({ x, y, color, life: 1 });
  }
  tick(dt: number): void {
    for (const t of this.tracers) t.life -= dt * TRACER_FADE;
    for (const p of this.pops) p.life -= dt * POP_FADE;
    this.tracers = this.tracers.filter((t) => t.life > 0);
    this.pops = this.pops.filter((p) => p.life > 0);
  }
}
```

- [ ] **Step 4: Run → PASS + Typecheck.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/render/effects.test.ts && npm run typecheck`

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/render/effects.ts tests/render/effects.test.ts && git commit -m "feat(render): transient render effects (tracers + impact pops)"
```

---

## Task 3: Canvas2DRenderer — Globus-Neuschrieb

**Files:**
- Modify (REWRITE): `src/render/Canvas2DRenderer.ts`

> Kein Unit-Test (Render-Layer wird laut Projekt-Teststrategie nicht per Vitest geprüft). Verifikation via typecheck + build + Dev-Server (Task 4). Der Renderer behält die Signatur `constructor(canvas)` + `draw(state: GameState)`, damit `GameClock` unverändert bleibt.

- [ ] **Step 1: Renderer ersetzen**

Lies zuerst die aktuelle Datei, um den Import-Stil zu sehen. Ersetze `src/render/Canvas2DRenderer.ts` durch:
```ts
import type { GameState } from '../sim/core/GameState';
import { getBuilding } from '../content/buildings';
import { getEnemy } from '../content/enemies';
import { BALANCE } from '../content/balance';
import { selectTarget } from '../sim/systems/combatSystem';
import { planetView, surfacePoint, buildingLonLat, enemyScreen, type PlanetView } from './globeProjection';
import { RenderEffects } from './effects';

const PAL = {
  bg: '#06101f', lit: '#34c9b8', shadow: '#1d8e81', rim: 'rgba(150,255,235,0.55)',
  cloud: '#e6fbf5', turretCore: '#0a2230', tracer: '#FFE14D', flash: '#FFB020',
  hpGood: '#3DDC84', hpBad: '#FF4D5E', focus: '#FFB020', shield: '#5AB0FF', textMid: '#9AA6D4',
};
// Turm-Akzentfarbe nach Typ
const TURRET_COLOR: Record<string, string> = {
  geschuetz: '#7fffe6', artillery: '#FF8A3D', laser: '#5AB0FF',
  railgun: '#A06BFF', frost: '#5AB0FF', flak: '#FF8A3D',
  kraftwerk: '#FFC53D', erz_sammler: '#4DD0C2',
};

interface Cloud { x: number; y: number; w: number; spd: number; }

export class Canvas2DRenderer {
  private ctx: CanvasRenderingContext2D;
  private fx = new RenderEffects();
  private prevCd = new Map<number, number>(); // iid → letzter cooldown (Schuss-Erkennung)
  private prevAlive = new Set<number>();       // eid der letzten Frame-lebenden Gegner (Tod-Erkennung)
  private clouds: Cloud[] = [];
  private last = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D-Canvas-Kontext nicht verfügbar');
    this.ctx = ctx;
  }

  draw(state: GameState): void {
    const { ctx, canvas } = this;
    const w = canvas.width, h = canvas.height;
    const now = performance.now();
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.05) : 0;
    this.last = now;
    const view = planetView(w, h);
    if (this.clouds.length === 0) this.initClouds(view);

    // Schuss- + Tod-Erkennung (render-only Effekte) BEVOR gezeichnet wird
    this.detectShots(state, view);
    this.detectDeaths(state, view);
    this.fx.tick(dt);
    for (const c of this.clouds) { c.x += c.spd * dt; if (c.x > 1.3) c.x = -0.3; }

    // 1) Hintergrund + Sterne
    ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#9fb6c6';
    for (let i = 0; i < 60; i++) { ctx.globalAlpha = 0.18; ctx.fillRect((i * 97 % w), (i * 61 % h), 1.5, 1.5); }
    ctx.globalAlpha = 1;

    // Türme nach depth sortiert (hintere zuerst, hinter der Kugel)
    const turrets = state.buildings.map((b) => {
      const ll = buildingLonLat(b);
      return { b, p: surfacePoint(ll.lon, ll.lat, state.timeS, view) };
    }).sort((a, z) => a.p.depth - z.p.depth);
    for (const { b, p } of turrets) if (p.depth <= 0) this.drawTurret(b, p, false);

    // 2) Planet-Scheibe (flache Schattierung Variante A)
    this.drawPlanet(view, state.timeS);

    // 3) vordere Türme
    for (const { b, p } of turrets) if (p.depth > 0) this.drawTurret(b, p, true, state);

    // 4) Gegner
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const s = enemyScreen(e.angle, e.progress, view, w, h);
      this.drawEnemy(e, s, state.timeS);
    }

    // 5) Effekte (Tracer + Pops)
    for (const t of this.fx.tracers) {
      ctx.globalAlpha = Math.max(0, t.life);
      ctx.strokeStyle = t.color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke();
      ctx.beginPath(); ctx.arc(t.x1, t.y1, 6 * t.life, 0, Math.PI * 2); ctx.fillStyle = PAL.flash; ctx.fill();
    }
    for (const pop of this.fx.pops) {
      ctx.globalAlpha = Math.max(0, pop.life);
      ctx.fillStyle = pop.color;
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; const r = 10 * (1 - pop.life) + 4; ctx.beginPath(); ctx.arc(pop.x + Math.cos(a) * r, pop.y + Math.sin(a) * r, 2, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;

    // 6) Planet-HP-Bogen + Runden-Label
    if (state.planet.maxHp > 0) {
      const frac = Math.max(0, state.planet.hp / state.planet.maxHp);
      ctx.lineWidth = 4; ctx.strokeStyle = frac > 0.3 ? PAL.hpGood : PAL.hpBad;
      ctx.beginPath(); ctx.arc(view.cx, view.cy, view.R + 10, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = PAL.textMid; ctx.font = '14px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('Runde ' + state.currentRound, 12, 22);
  }

  private initClouds(view: PlanetView): void {
    for (let i = 0; i < 4; i++) this.clouds.push({ x: Math.random(), y: view.cy - view.R * 0.55 + Math.random() * view.R * 1.1, w: 46 + Math.random() * 50, spd: 0.12 + Math.random() * 0.1 });
  }

  private drawPlanet(view: PlanetView, _timeS: number): void {
    const { ctx } = this; const { cx, cy, R } = view;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = PAL.lit; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    // EINE flache Sichel-Schatten-Ellipse rechts (harte Kante = Variante A)
    ctx.fillStyle = PAL.shadow;
    ctx.beginPath(); ctx.ellipse(cx + R * 0.52, cy, R * 0.82, R * 1.05, 0, 0, Math.PI * 2); ctx.fill();
    // Wolken
    for (const c of this.clouds) { const px = cx - R * 1.1 + c.x * (R * 2.2); ctx.globalAlpha = 0.42; ctx.fillStyle = PAL.cloud; this.roundRect(px, c.y, c.w, 12, 6); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.restore();
    // Lichtrand links
    ctx.lineWidth = 3; ctx.strokeStyle = PAL.rim; ctx.beginPath(); ctx.arc(cx, cy, R - 1, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
  }

  private drawTurret(b: GameState['buildings'][number], p: { x: number; y: number; depth: number }, front: boolean, state?: GameState): void {
    const { ctx } = this;
    const size = 6 + 7 * Math.max(0, p.depth);
    ctx.globalAlpha = front ? 1 : 0.18 + 0.2 * (p.depth + 1);
    ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fillStyle = PAL.turretCore; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = front ? (TURRET_COLOR[b.defId] ?? '#7fffe6') : '#3a6e66'; ctx.stroke();
    // kleines Rohr Richtung aktuelles Ziel (nur vorne + nur Waffen)
    if (front && state) {
      const def = getBuilding(b.defId);
      if (def.category === 'weapon') {
        const tgt = selectTarget(state, b);
        if (tgt) {
          const ts = enemyScreen(tgt.angle, tgt.progress, planetView(this.canvas.width, this.canvas.height), this.canvas.width, this.canvas.height);
          const a = Math.atan2(ts.y - p.y, ts.x - p.x);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(a) * size * 1.6, p.y + Math.sin(a) * size * 1.6);
          ctx.lineWidth = 3; ctx.strokeStyle = '#9fffe6'; ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: GameState['enemies'][number], s: { x: number; y: number }, timeS: number): void {
    const { ctx } = this; const def = getEnemy(e.defId);
    const sz = def.shape === 'cluster' ? 5 : def.shape === 'hexagon' ? 11 : 8;
    ctx.fillStyle = def.colorVar;
    if (def.shape === 'hexagon') { this.poly(s.x, s.y, sz, 6); } else if (def.shape === 'triangle') { this.poly(s.x, s.y, sz, 3); } else { ctx.beginPath(); ctx.arc(s.x, s.y, sz, 0, Math.PI * 2); ctx.fill(); }
    if (e.flying) { ctx.strokeStyle = '#CFE8FF'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x, s.y, sz + 3, 0, Math.PI * 2); ctx.stroke(); }
    if ((e.slowTimerS ?? 0) > 0) { ctx.strokeStyle = PAL.shield; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, sz + 1.5, 0, Math.PI * 2); ctx.stroke(); }
    if (e.isBoss && e.bossPhase === 'telegraph') { ctx.strokeStyle = PAL.focus; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, sz + 6 + Math.sin(timeS * 12) * 2, 0, Math.PI * 2); ctx.stroke(); }
    if (e.isBoss && e.bossPhase === 'shield') { ctx.strokeStyle = PAL.shield; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, sz + 7, 0, Math.PI * 2); ctx.stroke(); }
    if (e.hp < e.maxHp) { const wbar = 16, frac = Math.max(0, e.hp / e.maxHp); ctx.fillStyle = '#0008'; ctx.fillRect(s.x - wbar / 2, s.y - sz - 6, wbar, 3); ctx.fillStyle = PAL.hpGood; ctx.fillRect(s.x - wbar / 2, s.y - sz - 6, wbar * frac, 3); }
  }

  // Schuss-Erkennung: cooldown stieg sprunghaft → Turm hat gefeuert → Tracer zum aktuellen Ziel.
  private detectShots(state: GameState, view: PlanetView): void {
    const w = this.canvas.width, h = this.canvas.height;
    for (const b of state.buildings) {
      const def = getBuilding(b.defId);
      if (def.category !== 'weapon') continue;
      const cd = b.cooldown ?? 0;
      const prev = this.prevCd.get(b.iid) ?? cd;
      if (cd > prev + 0.05) { // Cooldown wurde nach Schuss neu gesetzt
        const ll = buildingLonLat(b);
        const sp = surfacePoint(ll.lon, ll.lat, state.timeS, view);
        if (sp.depth > 0) {
          const tgt = selectTarget(state, b);
          if (tgt) { const ts = enemyScreen(tgt.angle, tgt.progress, view, w, h); this.fx.addTracer(sp.x, sp.y, ts.x, ts.y, PAL.tracer); }
        }
      }
      this.prevCd.set(b.iid, cd);
    }
  }

  // Tod-Erkennung: war letztes Frame lebend, jetzt weg/tot → Pop am letzten Bildschirmort.
  private detectDeaths(state: GameState, view: PlanetView): void {
    const w = this.canvas.width, h = this.canvas.height;
    const aliveNow = new Set<number>();
    const posByEid = new Map<number, { x: number; y: number; color: string }>();
    for (const e of state.enemies) { if (e.alive) { aliveNow.add(e.eid); const s = enemyScreen(e.angle, e.progress, view, w, h); posByEid.set(e.eid, { x: s.x, y: s.y, color: getEnemy(e.defId).colorVar }); } }
    for (const eid of this.prevAlive) { if (!aliveNow.has(eid)) { const last = this.lastEnemyPos.get(eid); if (last) this.fx.addPop(last.x, last.y, last.color); } }
    // Positionen für nächstes Frame merken
    this.lastEnemyPos = posByEid;
    this.prevAlive = aliveNow;
  }
  private lastEnemyPos = new Map<number, { x: number; y: number; color: string }>();

  private poly(x: number, y: number, r: number, n: number): void {
    const { ctx } = this; ctx.beginPath();
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / n * Math.PI * 2; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fill();
  }
  private roundRect(x: number, y: number, wd: number, ht: number, r: number): void {
    const { ctx } = this; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + wd, y, x + wd, y + ht, r); ctx.arcTo(x + wd, y + ht, x, y + ht, r); ctx.arcTo(x, y + ht, x, y, r); ctx.arcTo(x, y, x + wd, y, r); ctx.closePath();
  }
}
```

- [ ] **Step 2: Typecheck.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npm run typecheck`
Expected: clean. (Falls `selectTarget` nicht exportiert ist, exportiere es in `combatSystem.ts` — es ist eine reine Lesefunktion, das ist render-neutral; melde, falls ein anderer Export fehlt.)

- [ ] **Step 3: Build.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npm run build`
Expected: clean.

- [ ] **Step 4: Volle Suite (Sim unberührt → 146 + Golden unverändert).** `cd "C:/Users/pposc/Documents/PlanetDefense" && npm test`
Expected: 146 passed + die 2 neuen Render-Suiten (globeProjection + effects) = mehr, Golden unverändert (keine Snapshot-Warnung).

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/render/Canvas2DRenderer.ts && git commit -m "feat(render): rewrite to spinning 2.5D globe (surface turrets, visible tracers, impact pops)"
```

---

## Task 4: Integrations-Verifikation

**Files:** keine neuen — End-to-End-Prüfung.

- [ ] **Step 1: Volle Suite + typecheck + build.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npm test && npm run typecheck && npm run build`
Expected: alle grün; Golden-Snapshot UNVERÄNDERT (Sim + State nie angefasst).

- [ ] **Step 2: Dev-Server / Preview**
1. Planet dreht sich gemächlich (links→rechts), flache Schattierung (links hell, rechts Sichel-Schatten), Lichtrand links, Wolken driften langsam.
2. Türme sitzen auf der Oberfläche, drehen mit, hinten ausgeblendet/abgedunkelt; farbcodiert nach Typ.
3. Welle starten → Gegner fliegen aus dem All an; Türme feuern **sichtbare Tracer + Mündungsblitz**; tote Gegner poppen.
4. Planet-HP-Bogen + „Runde N" sichtbar.
5. Konsole fehlerfrei. (Das alte HUD/BuildPanel funktioniert weiter — Redesign folgt im nächsten Plan.)

- [ ] **Step 3: Abschluss-Commit (falls nötig).** `cd "C:/Users/pposc/Documents/PlanetDefense" && git add -A && git commit -m "chore(v1): planet renderer integration verified" || echo "nichts zu committen"`

---

## Definition of Done (V1 Renderer)

- [ ] globeProjection + effects unit-getestet (rein, deterministisch).
- [ ] Canvas2DRenderer zeichnet den drehenden 2.5D-Globus mit Oberflächen-Türmen (mitdrehend, hinten ausgeblendet), sichtbaren Schüssen (Tracer+Flash) + Treffer-Pops, Gegnern aus dem All, Planet-HP-Bogen.
- [ ] `npm test` weiter 146 (Sim) grün + neue Render-Tests; **Golden unverändert**; typecheck + build clean.
- [ ] Sim/Content/Commands/State NICHT angefasst; alle Effekte render-only.

---

## Self-Review (vom Planautor)

**Spec-Abdeckung (Kap. 4):** globeProjection-Modul ✔ (T1), Schattierung A + Wolken + Lichtrand ✔ (T3 drawPlanet), Türme auf Oberfläche mitdrehend + hinten aus ✔ (T3), sichtbare Schüsse render-only via cooldown-Delta ✔ (T3 detectShots), Artillerie/alle Schüsse als Tracer (Projektil-Koordinaten nicht geplottet) ✔ (dokumentiert), Treffer-Pops ✔ (T3 detectDeaths), Gegner aus dem All ✔ (enemyScreen), Boss/Flying/Slow-Marker erhalten ✔, Planet-HP-Bogen + Runde ✔. Determinismus/Golden unberührt ✔ (Effekte außerhalb State).

**Platzhalter-Scan:** kein TBD; vollständiger Renderer-Code; Run-Schritte mit erwarteter Ausgabe. Hinweis zu `selectTarget`-Export ist eine konkrete, umsetzbare Anweisung (kein Platzhalter).

**Typ-Konsistenz:** `PlanetView`/`SurfacePt` (globeProjection) konsistent in Renderer genutzt. `surfacePoint`/`buildingLonLat`/`enemyScreen`/`planetView` Signaturen identisch zwischen Tests + Renderer. `RenderEffects` API (addTracer/addPop/tick + tracers/pops Felder) konsistent zwischen Test + Renderer. State-Felder (`buildings[].iid/slot/cooldown/defId`, `enemies[].angle/progress/eid/...`) wie in der State-Referenz. `selectTarget(state, turret)` Signatur wie im combatSystem.
