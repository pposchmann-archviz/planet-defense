# Visual-Overhaul: 3D-Planet-Renderer + HUD-Redesign — Design

> **Status:** Spec v1.0 (20.06.2026). Reine Präsentations-Schicht. **Approach A:** die getestete Sim/Combat-Logik (M0–M6, 146 Tests + Golden) bleibt 1:1 unangetastet — nur Renderer + Svelte-UI werden umgebaut. Determinismus + alle Tests bleiben grün.

## 1. Vision

Aus dem flachen Top-Down-Look wird ein **stilisierter, sich drehender 3D-Planet** (Kurzgesagt-Flat, Canvas2D-2.5D) als Bildmittelpunkt: Gebäude/Geschütze sitzen auf der Oberfläche und drehen mit (hinten ausgeblendet), Schüsse sind **sichtbar** (Tracer + Mündungsblitz, Artillerie-Projektile), Gegner fliegen aus dem All an. Gleichzeitig wird die UI von langen gestapelten Listen auf ein **kompaktes HUD** umgestellt: Grid-Bau-Menü + Kontext-Popover am Turm.

## 2. Bestätigte Entscheidungen

| Punkt | Festlegung |
|---|---|
| **Ansatz** | Approach A — kosmetischer Umbau, Sim/Combat unverändert (alle 146 Tests + Golden bleiben grün) |
| **Planet** | 2.5D-Globus, Rotation um die senkrechte Achse (links→rechts), gemächlich/ambient |
| **Schattierung** | Flach, 2-Ton, Variante A (harte Terminator-Kante): links hell, rechts dezenter Sichel-Schatten, heller Lichtrand links. KEIN Verlauf über die ganze Scheibe |
| **Wolken** | Horizontale „Pills", langsam driftend |
| **Schüsse** | Sichtbar: Hitscan = Mündungsblitz + Tracer-Strahl; Artillerie = sichtbares Projektil + Trail; Treffer-Pop |
| **Gegner** | Fliegen aus dem All radial auf den Planeten zu |
| **HUD** | Oben Ressourcen-Chips + Runde/Bedrohung + Skilltree-Button; Mitte Planet; unten Grid-Bau-Menü + „Welle starten" |
| **Bauen** | Grid-Menü mit Tabs (Waffen/Eco), Icon-Kacheln; per „Bauen"-Button ein-/ausklappbar |
| **Upgraden** | Klick auf das Geschütz → Kontext-**Popover** (Upgrade/An-Aus/Abreißen) |
| **Icons** | SVG statt Emoji; Zahlen `tabular-nums`; Hover 150–300ms; sichtbarer Fokus |
| **Plattform** | Desktop-Browser (wie gehabt) |

## 3. Leitprinzip (kritisch)

**Der Renderer ist eine reine Re-Interpretation des Sim-States — er schreibt NIE zurück.** Die Sim bleibt Top-Down-radial:
- Türme haben einen Slot-Index (Waffen) bzw. eine Instanz-id; Gegner haben `angle` + `progress`.
- Der Renderer mappt das auf den Globus (Slot → Längengrad; Gegner-Winkel/Fortschritt → Bildschirmposition).
- **Gameplay-Geometrie (Reichweite, Targeting, Schaden) bleibt vollständig in der Sim** (Sim-Einheiten, getestet). Der Renderer zeichnet nur.

Daraus folgt: **keine Änderungen** an `sim/`, `content/` (bis auf evtl. rein-additive Render-Hinweise), `commands/`, Tests, Golden. Risiko liegt allein im Render- + UI-Layer.

## 4. Teil A — Planet-Renderer

### 4.1 Geteiltes Projektions-Modul (`src/render/globeProjection.ts`, NEW)
Eine reine Quelle der Globus-Mathematik, von Renderer UND App (Klick-Hittest) genutzt — keine doppelte Formel.
```ts
export const GLOBE = { spinRate: (Math.PI * 2) / 30 }; // 1 Umdrehung / 30 s (ambient)
export interface ScreenPt { x: number; y: number; depth: number; size: number; }
// Planet-Mittelpunkt + Bildschirm-Radius aus Canvas-Größe (Held, leicht oberhalb Mitte ok).
export function planetScreen(w: number, h: number): { cx: number; cy: number; R: number };
// Oberflächenpunkt (Längengrad lon, Breitengrad lat) zur Zeit timeS → Bildschirm + depth (>0 Vorderseite).
export function surfacePoint(lon: number, lat: number, timeS: number, w: number, h: number): ScreenPt;
// Slot-Index → fixer Längengrad (gleichmäßig). Eco-Gebäude: Längengrad aus iid abgeleitet (render-only).
export function buildingLonLat(b: { slot?: number; iid: number }): { lon: number; lat: number };
// Gegner angle+progress → Bildschirmposition um den Globus (radial, far→surface).
export function enemyScreen(angle: number, progress: number, w: number, h: number): { x: number; y: number };
```
- `surfacePoint`: `lonNow=lon+timeS*spinRate; depth=cos(lat)*cos(lonNow); x=cx+R*cos(lat)*sin(lonNow); y=cy-R*sin(lat); size=base*(0.55+0.45*max(0,depth))`.
- `enemyScreen`: `r = lerp(R_far, R*1.05, clamp(progress)); x=cx+cos(angle)*r; y=cy+sin(angle)*r` mit `R_far` knapp außerhalb des Canvas (Gegner kommen aus dem All).

### 4.2 Renderer-Umbau (`src/render/Canvas2DRenderer.ts`, REWRITE)
Zeichenreihenfolge pro Frame (liest LIVE `GameState`, mutiert nichts):
1. **Hintergrund** (Sterne) + **hintere Türme** (depth ≤ 0, abgedunkelt, hinter der Kugel).
2. **Planet-Scheibe:** flache Schattierung Variante A (Lit-Fläche + EINE Sichel-Schatten-Ellipse rechts, harte Kante), Lichtrand-Bogen links. Clip auf den Kreis.
3. **Wolken-Pills** (langsam driftend, im Clip).
4. **Vordere Türme** (depth > 0, voll, größer; kleines Rohr Richtung aktuelles Ziel).
5. **Gegner** (über `enemyScreen`), Boss-Telegraph/Schild-Ringe, Flug-/Slow-Marker (bestehende Logik, neue Positionen).
6. **Projektile** (`state.projectiles`, sichtbar + Trail) + **Schuss-Effekte** (siehe 4.3) + **Treffer-Pops**.
7. **Planet-HP-Bogen** ums Limb.

### 4.3 Sichtbare Schüsse OHNE Sim-Änderung (render-only Effekte)
Der Renderer hält **eigene, transiente** Effekt-Zustände (Map/Array im Renderer, NICHT in `GameState` → Golden unberührt):
- **Mündungsblitz + Tracer (Hitscan):** Der Renderer merkt sich pro Turm die `cooldown` des Vorframes. Steigt `cooldown` sprunghaft (= gerade gefeuert), erzeugt er einen kurzen Tracer vom Turm-Bildschirmpunkt zum aktuellen Ziel. Das Ziel ermittelt der Renderer selbst über `selectTarget(state, turret)` (reine Lesefunktion). Nur für Vorderseiten-Türme zeichnen.
- **Projektile (Artillerie):** direkt aus `state.projectiles` (größer, gelb, mit kurzem Trail).
- **Treffer-Pop:** Der Renderer erkennt verschwundene/tote Gegner (war letztes Frame lebend, jetzt weg) und spawnt einen kurzen Polygon-Scherben-Pop.
> So bleibt die Sim 100% unverändert, Determinismus + Golden intakt. Alle Effekte sind Render-Memory mit Lebenszeit, gealtert per Frame-`dt`.

### 4.4 Spin & Lesbarkeit
- Spin gemächlich (`1 Umdrehung / 30 s`). Türme auf der Rückseite (depth<0) werden ausgeblendet/abgedunkelt; ihre Schüsse werden nicht gezeichnet (Gameplay läuft weiter, der Schuss ist nur visuell ausgelassen).
- Optional (nice-to-have, v1 mitnehmbar): Spin **pausiert/verlangsamt**, solange ein Turm-Popover oder das Bau-Menü offen ist (damit der angeklickte Turm nicht wegdreht). Wenn einfach umsetzbar → rein, sonst v2.

## 5. Teil B — HUD-Redesign (Svelte)

### 5.1 Komponenten
| Komponente | Änderung |
|---|---|
| `ResourceBar.svelte` | Kompakte Chips (Erz türkis, Strom gelb) als Pills, oben links; Strom-Defizit-Puls bleibt |
| `WaveControl.svelte` | Schlank: Runde X/10 + Bedrohungs-Badge + „Welle starten" (primärer CTA). Run-Ende-Screen (RUN_WON/RUN_OVER + TP-Aufschlüsselung) bleibt, nur styling-angepasst |
| `BuildPanel.svelte` → `BuildMenu.svelte` | **Grid-Menü** statt Liste: Segment-Tabs **Waffen \| Eco**, Icon-Kacheln (Name, Kosten, Strom-Delta, gesperrt = ausgegraut + Schloss-SVG). Per „Bauen"-Button unten ein-/ausklappbar |
| `TurretPopover.svelte` (NEW) | Kontext-Popover am angeklickten Turm: Name + Level + Kurz-Stats (Schaden/Reichweite) + **„Upgrade · N Erz"** (bestehender `upgrade`-Command). **An/Aus + Abreißen = v2** (die Commands existieren noch nicht; werden NICHT in diesem Präsentations-Spec ergänzt). Liest Snapshot, sendet nur bestehende Commands |
| `SkillTreePanel.svelte` | Bleibt als Overlay; Trigger jetzt der Skilltree-Button oben rechts; Styling-Politur, Emoji→SVG |
| `App.svelte` | Layout: Top-Bar / Planet-Canvas (Held) / unten Bau-Button+Menü + CTA. Klick-Routing (siehe 5.2). HUD-State (`buildMenuOpen`, `selectedTurretIid`) als `$state` |

### 5.2 Klick-Routing (`App.handleCanvasClick`)
Nutzt das geteilte `globeProjection`:
- In COMBAT, Klick nahe einem Gegner → `focusMark` (wie bisher).
- In BUILD, Klick nahe einem **Vorderseiten-Turm** → `selectedTurretIid` setzen → `TurretPopover` öffnet sich an dessen Bildschirmposition.
- Bau erfolgt weiter über das **Bau-Menü** (Kachel → `build`-Command, **Auto-Slot bleibt** — keine interaktive Platzierung in v1; das ist v2).

### 5.3 Commands (unverändert)
Genutzt werden ausschließlich die **bereits existierenden** Commands: `build`, `upgrade`, `focusMark`, `startWave`. Dieser Visual-Overhaul fügt **KEINE neuen Gameplay-Commands** hinzu. Das Turm-Popover zeigt daher in v1 nur **Upgrade** (+ Info). „An/Aus" (toggle) und „Abreißen" (sell) brauchen neue Sim-Commands und sind damit **v2** (separater Entscheid). So bleibt der Scope strikt Präsentation → Sim/Tests/Golden unberührt.

### 5.4 Stil
- SVG-Icons (einfache geometrische Glyphen je Gebäudetyp), KEINE Emoji.
- Dark-HUD (`#0B1026`/`#141A33`/`#1E2748`), Akzente Erz `#4DD0C2` / Strom `#FFC53D` / TP `#FF7A59`.
- Zahlen `tabular-nums`, Buttons Hover-Transition 150–300ms, sichtbarer `:focus-visible`-Ring, `prefers-reduced-motion` respektiert (Spin/Animationen reduzieren).

## 6. Architektur / Dateien

```
src/
├─ render/
│  ├─ globeProjection.ts   # NEW: Globus-Mathe (geteilt Renderer ↔ App)
│  ├─ Canvas2DRenderer.ts  # REWRITE: 2.5D-Globus, Türme/Gegner/Projektile/Effekte
│  └─ effects.ts           # NEW (optional): transiente Render-Effekte (Tracer/Flash/Pop), gekapselt
├─ ui/
│  ├─ panels/BuildMenu.svelte     # REWRITE von BuildPanel: Grid + Tabs + Toggle
│  ├─ panels/TurretPopover.svelte # NEW
│  ├─ panels/ResourceBar.svelte   # restyle (Chips)
│  ├─ panels/WaveControl.svelte   # restyle (schlank)
│  └─ panels/SkillTreePanel.svelte# restyle, Emoji→SVG
└─ App.svelte              # Layout + Klick-Routing + HUD-State
```
Unverändert: `sim/**`, `content/**` (außer ggf. rein-additive Render-Felder wie ein optionaler Icon-Hinweis — vermeidbar), `persistence/**`, `app/GameClock.ts` (liefert weiter Snapshot + treibt Renderer).

## 7. Was NICHT in diesem Spec ist (späterer Scope)
- Gameplay-Änderungen: Front-Hemisphere-Combat (nur vordere Türme feuern), interaktive Platzierung per Klick auf die Oberfläche, neue Commands (sell/toggle, falls nicht vorhanden).
- Echtes 3D (Three.js/WebGL). 2.5D-Canvas reicht für den Kurzgesagt-Look.
- Partikelsystem/Sound, Mobile-Layout, 2. Planet.

## 8. Risiken
- **Renderer-Rewrite** ist die größte Einzelarbeit; isoliert im Render-Layer, durch das geteilte Projektions-Modul testbar (Projektions-Funktionen sind rein → Unit-testbar).
- **Klick-Hittest auf bewegtem Globus:** Türme drehen; Lösung = geteiltes `globeProjection` (App + Renderer rechnen identisch) + optionaler Spin-Stop bei offenem Popover.
- **Schuss-Erkennung über cooldown-Delta** ist render-only und heuristisch; akzeptabel, da rein visuell (kein Gameplay-Effekt bei Fehlerkennung).
- **Golden/Tests:** bleiben grün, weil GameState unberührt; die Render-Effekte leben außerhalb des States. (Falls doch ein State-Feld nötig würde, Golden bewusst neu erzeugen — aber Ziel ist: kein State-Eingriff.)

## 9. Definition of Done
- Drehender 2.5D-Planet (Schattierung A, Wolken, Lichtrand) mit Türmen auf der Oberfläche, die mitdrehen + hinten ausgeblendet werden.
- Sichtbare Schüsse (Tracer+Flash, Artillerie-Projektil) + Treffer-Pops.
- HUD: Ressourcen-Chips, schlanke Wave-Control, Grid-Bau-Menü (Tabs, ein-/ausklappbar), Turm-Klick-Popover, Skilltree-Button. SVG statt Emoji.
- `npm test` weiter 146 grün, Golden unverändert, typecheck + build clean.
- Sim/Combat unverändert; Renderer/UI lesen nur Snapshot/State + senden bestehende Commands.
