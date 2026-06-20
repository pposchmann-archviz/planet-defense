# M6 — Combat-Breite (Discriminated Union, Railgun, Frost, Flying/Flak) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Die Waffen-/Gegner-Vielfalt verbreitern und die wachsende Tech-Schuld an `BuildingDef` abbauen: (1) `BuildingDef` zur Discriminated Union (eco | weapon) machen, damit illegale Feld-Kombinationen unmöglich werden; (2) zwei neue Türme — Railgun (Hochschaden-Single-Target) und Frost (verlangsamt Gegner); (3) eine Flying/Flak-Achse — fliegende Gegner, die nur von Flak-Türmen getroffen werden. Abnahme: Union typsicher (alle Tests grün), Railgun/Frost/Flak als Unlocks baubar, Frost verlangsamt sichtbar, fliegende Gegner sind nur mit Flak besiegbar (Boden-Türme ignorieren sie).

**Architecture:** Erweitert M2–M5-Combat. `BuildingDef = EcoBuildingDef | WeaponDef` über eine gemeinsame `BuildingBase`; Konsumenten narrowen auf `category`. Neue Mechaniken: **Slow** (`Enemy.slowTimerS/slowMult`, von Frost-Treffern gesetzt, in `moveEnemies` angewandt) und **Air-Targeting** (`Enemy.flying` + `WeaponDef.canHitAir`; `selectTarget` filtert fliegende Ziele für Nicht-Flak). Determinismus bleibt. Die Matrix bleibt 3×3 (Flying ist ein Targeting-Filter, kein Schadenstyp).

**Tech Stack:** TypeScript + Svelte 5 + Vite + Vitest.

**Kontext:** Projekt `C:/Users/pposc/Documents/PlanetDefense`, M0–M5 fertig. Spec 5.2/5.3 + Reviewer-Notiz „Discriminated Union vor M6". Read-then-modify. Windows; `npm test`, `npm run typecheck`, `npm run build`.

**Determinismus & Golden:** `Enemy` bekommt `slowTimerS?/slowMult?/flying?` → Golden in Task 3 neu erzeugen. Slow/Targeting sind rein (kein RNG). Kein `Math.random()`/`Date.now()` im Sim-Core.

---

## Scope-Abgrenzung M6

**Drin:** `BuildingDef` als Discriminated Union (eco | weapon) + alle Konsumenten-Narrowing; Railgun-Turm (kinetic, hoher Single-Target-Schaden, Hitscan); Frost-Turm (geringer Schaden + Slow-Effekt); Flak-Turm (`canHitAir`); fliegender Gegner (`flying`, nur von Flak treffbar); Slow-Mechanik (Enemy-Felder + moveEnemies); Air-Targeting-Filter in `selectTarget`; Unlock-Knoten u_railgun/u_frost/u_flak; neue Gegner/Türme in Terra-1-Runden + UI/Render.

**Bewusst NICHT in M6 (→ M7):** 2. Planet + Planet-Auswahl + per-Planet-Meta (eigenes „Welt-Breite"-Thema), weitere Boss-Mechaniken, Respec, Offline. Keine neue Matrix-Achse (Flying via Filter).

---

## Combat-Erweiterungen (Referenz)

- **Slow:** Frost-Treffer setzt `enemy.slowTimerS = def.slowDurationS`, `enemy.slowMult = def.slowMult` (z.B. 0.5). `moveEnemies`: `eff = def.speed * (e.slowTimerS && e.slowTimerS > 0 ? (e.slowMult ?? 1) : 1)`; `e.slowTimerS -= dt`. Slow stackt nicht (Treffer setzt neu, längster gewinnt nicht nötig — einfach überschreiben).
- **Air-Targeting:** Fliegender Gegner (`enemy.flying === true`) ist nur Ziel, wenn der Turm `def.canHitAir === true` (Flak). `selectTarget`: in der `inRange`-Prüfung zusätzlich `(!e.flying || def.canHitAir)`. Flak kann auch Boden treffen (kein Ausschluss). Boden-Türme ignorieren fliegende Gegner komplett.
- **Frost macht trotzdem etwas Schaden** (baseDamage klein) — der Wert ist der Slow. Railgun: reiner Burst (kein Splash, kein Slow).

---

## Task 1: Discriminated Union für BuildingDef

**Files:** Modify `src/content/types.ts`, `src/content/buildings.ts`, und alle Konsumenten mit Narrowing (`ecoSystem.ts`, `combatSystem.ts`/`damage.ts`, `command.ts`, `BuildPanel.svelte`). Tests bleiben (Refactor — keine Verhaltensänderung).

- [ ] **Step 1: `types.ts` — Union**

Lies `src/content/types.ts`. Ersetze das flache `BuildingDef` durch:
```ts
export interface BuildingBase {
  id: BuildingId;
  nameDe: string;
  baseCost: number;
  powerGen: number;   // 0 außer Kraftwerk
  powerCost: number;  // 0 außer Verbraucher
  maxLevel: number;
  unlockNode?: string | null;
}
export interface EcoBuildingDef extends BuildingBase {
  category: 'eco';
  producesOrePerTick: number;
}
export interface WeaponDef extends BuildingBase {
  category: 'weapon';
  damageType: DamageType;
  baseDamage: number;
  fireRate: number;
  range: number;
  splashRadius?: number;
  projectileSpeed?: number;
  canHitAir?: boolean;   // M6: Flak
  slowMult?: number;     // M6: Frost (z.B. 0.5)
  slowDurationS?: number;// M6: Frost
}
export type BuildingDef = EcoBuildingDef | WeaponDef;
```
(`producesOrePerTick` lebt jetzt NUR auf eco; `damageType/baseDamage/...` NUR auf weapon. `EnemyDef` bekommt in Task 2 `flying?`.)

- [ ] **Step 2: `buildings.ts` anpassen**

Lies `src/content/buildings.ts`. Die bestehenden Defs müssen das jeweilige Subset erfüllen: eco-Gebäude (kraftwerk, erz_sammler) brauchen `category:'eco'` + `producesOrePerTick` und DÜRFEN keine Waffen-Felder haben; Waffen (geschuetz, artillery, laser) brauchen `category:'weapon'` + Waffen-Felder und DÜRFEN kein `producesOrePerTick`. Entferne also `producesOrePerTick: 0` von den Waffen und `powerGen/powerCost` bleiben (Base). Stelle sicher, dass `BUILDINGS` als `Record<BuildingId, BuildingDef>` typt. `getBuilding` Rückgabetyp bleibt `BuildingDef` (Union).

- [ ] **Step 3: Konsumenten narrowen**

Lies und passe an (read-then-modify, minimale Eingriffe):
- `src/sim/systems/ecoSystem.ts`: wo `def.producesOrePerTick` gelesen wird → vorher `if (def.category !== 'eco') continue;` (oder narrow), da producesOrePerTick nur auf eco existiert. (recomputePower nutzt powerGen/powerCost = Base → unverändert.)
- `src/sim/systems/combatSystem.ts`: liest bereits nach `if (def.category !== 'weapon') continue;` → TS narrowt automatisch auf `WeaponDef`; entferne jetzt überflüssige `?? `-Fallbacks bei `baseDamage`/`damageType`/`fireRate`/`range`/`splashRadius` falls vorhanden (sie sind auf WeaponDef Pflicht bzw. optional klar). Prüfe, dass alle Zugriffe nach dem category-Guard liegen.
- `src/sim/systems/damage.ts`: `applyDamage` bekommt bereits `baseDamage/damageType/level` als Parameter (nicht aus def) → vermutlich unverändert. Prüfen.
- `src/sim/commands/command.ts`: nutzt `def.category`, `def.baseCost`, `def.unlockNode` (Base) → unverändert; falls es `def.id`/category nutzt, ok.
- `src/ui/panels/BuildPanel.svelte`: liest gemischte Felder. Im Template `def.producesOrePerTick` nur unter `{#if def.category === 'eco'}` zugreifen; `def.baseDamage`/`def.range` nur unter `{#if def.category === 'weapon'}`. Passe die `.meta`-Zeile entsprechend an (eco-Zeile vs weapon-Zeile via category-Guard). `def.powerGen`/`powerCost`/`baseCost` sind Base → frei.

- [ ] **Step 4: Typecheck + volle Suite.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npm run typecheck && npm test && npm run build`
  Erwartung: ALLE grün (Refactor ohne Verhaltensänderung). Falls ein Test/Build durch fehlendes Narrowing bricht: an der Stelle einen `category`-Guard ergänzen — NICHT die Union aufweichen (kein `as any`).

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/content src/sim src/ui && git commit -m "refactor(content): BuildingDef discriminated union (eco | weapon) + narrow consumers"
```

---

## Task 2: Content — Railgun, Frost, Flak, fliegender Gegner, Unlock-Knoten

**Files:** Modify `src/content/types.ts` (EnemyId/flying), `buildings.ts`, `enemies.ts`, `skilltree.ts`; Test `tests/content/`

- [ ] **Step 1: Tests ergänzen**

In `tests/content/enemies.test.ts`:
```ts
describe('Flug-Gegner', () => {
  it('drohne_flug ist flying', () => {
    expect(getEnemy('drohne_flug').flying).toBe(true);
  });
});
```
In `tests/content/skilltree.test.ts`: ergänze u_railgun/u_frost/u_flak als unlock mit gebaeudeId railgun/frost/flak (und aktualisiere ggf. die SKILL_NODE_IDS-Vollliste — jetzt 10 Knoten).
Ein Buildings-Smoke-Test (in enemies.test.ts oder neu): `getBuilding('frost').slowMult` > 0; `getBuilding('flak').canHitAir === true`; `getBuilding('railgun').baseDamage` >= 30.

- [ ] **Step 2: Run → FAIL.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/content/`

- [ ] **Step 3: `types.ts` — EnemyId + flying**

Lies `src/content/types.ts`. `EnemyId += 'drohne_flug'`; `BuildingId += 'railgun' | 'frost' | 'flak'`; `EnemyDef += flying?: boolean;`.

- [ ] **Step 4: `buildings.ts` — 3 neue Waffen**

Ergänze in `BUILDINGS`:
```ts
  railgun: { id:'railgun', nameDe:'Railgun', category:'weapon', baseCost:200, powerGen:0, powerCost:16, maxLevel:8, unlockNode:'u_railgun', damageType:'kinetic', baseDamage:40, fireRate:0.8, range:280 },
  frost:   { id:'frost', nameDe:'Frostturm', category:'weapon', baseCost:120, powerGen:0, powerCost:10, maxLevel:8, unlockNode:'u_frost', damageType:'energy', baseDamage:4, fireRate:1.5, range:200, slowMult:0.5, slowDurationS:2 },
  flak:    { id:'flak', nameDe:'Flak-Geschütz', category:'weapon', baseCost:160, powerGen:0, powerCost:12, maxLevel:8, unlockNode:'u_flak', damageType:'explosive', baseDamage:10, fireRate:1.2, range:240, canHitAir:true },
```
`WEAPON_BUILDING_IDS` += 'railgun','frost','flak'.

- [ ] **Step 5: `enemies.ts` — fliegender Gegner + in Runden**

Ergänze in `ENEMIES`:
```ts
  drohne_flug: { id:'drohne_flug', nameDe:'Flugdrohne', baseHp:40, speed:0.07, armor:'light', planetDamage:2, reward:5, shape:'triangle', colorVar:'#B48CFF', flying:true },
```
Baue sie in mittlere/späte Terra-1-Runden ein (R7 + R9 je 2-3), damit Flak ab ~Runde 7 sinnvoll ist (ADD-Gruppen, nicht ersetzen).

- [ ] **Step 6: `skilltree.ts` — 3 Unlock-Knoten**

Ergänze in `SKILL_NODES`:
```ts
  u_railgun: { id:'u_railgun', branch:'defense', typ:'unlock', nameDe:'Railgun', beschreibung:'Schaltet die Railgun frei (hoher Single-Target-Schaden).', kostenTp:18, maxStufe:1, unlocks:{ gebaeudeId:'railgun' } },
  u_frost:   { id:'u_frost', branch:'defense', typ:'unlock', nameDe:'Frostturm', beschreibung:'Schaltet den Frostturm frei (verlangsamt Gegner).', kostenTp:12, maxStufe:1, unlocks:{ gebaeudeId:'frost' } },
  u_flak:    { id:'u_flak', branch:'defense', typ:'unlock', nameDe:'Flak-Geschütz', beschreibung:'Schaltet Flak frei (trifft fliegende Gegner).', kostenTp:14, maxStufe:1, unlocks:{ gebaeudeId:'flak' } },
```

- [ ] **Step 7: Run → PASS + Typecheck + volle Suite.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/content/ && npm run typecheck && npm test`

- [ ] **Step 8: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/content tests/content && git commit -m "feat(content): railgun, frost (slow), flak (anti-air), flying enemy, unlock nodes"
```

---

## Task 3: Slow-Mechanik (Enemy-Felder + moveEnemies + Frost-Treffer)

**Files:** Modify `src/sim/core/GameState.ts`, `src/sim/systems/enemySystem.ts`, `src/sim/systems/damage.ts` (oder combat); Test `tests/sim/`; Golden regen

- [ ] **Step 1: Test schreiben**

`tests/sim/slow.test.ts` (NEW):
```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, type GameState, type Enemy } from '../../src/sim/core/GameState';
import { moveEnemies } from '../../src/sim/systems/enemySystem';
import { getEnemy } from '../../src/content/enemies';

describe('Slow-Mechanik', () => {
  it('verlangsamter Gegner bewegt sich langsamer', () => {
    const s = createInitialState(1); s.phase = 'COMBAT';
    const e: Enemy = { eid:1, defId:'laeufer', hp:50, maxHp:50, angle:0, progress:0, alive:true, slowTimerS:5, slowMult:0.5 };
    s.enemies.push(e);
    moveEnemies(s, 1.0); // speed 0.06 * 0.5 = 0.03
    expect(e.progress).toBeCloseTo(0.03, 6);
  });
  it('Slow läuft ab und Gegner kehrt zu voller Geschwindigkeit zurück', () => {
    const s = createInitialState(1); s.phase = 'COMBAT';
    const e: Enemy = { eid:1, defId:'laeufer', hp:50, maxHp:50, angle:0, progress:0, alive:true, slowTimerS:0.5, slowMult:0.5 };
    s.enemies.push(e);
    moveEnemies(s, 1.0); // slowTimer 0.5 < dt → erst gebremst, dann... (Modell: Slow gilt für diesen Tick, danach abgelaufen)
    expect(e.slowTimerS).toBeLessThanOrEqual(0);
  });
});
```

- [ ] **Step 2: GameState — Enemy-Felder**

Lies `src/sim/core/GameState.ts`. `Enemy +=` `slowTimerS?: number; slowMult?: number;`. (createInitialState unverändert — Felder optional.)

- [ ] **Step 3: Run → FAIL.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/slow.test.ts`

- [ ] **Step 4: `enemySystem.moveEnemies` — Slow anwenden**

Lies `src/sim/systems/enemySystem.ts`. In `moveEnemies`:
```ts
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const def = getEnemy(e.defId);
    const slowed = (e.slowTimerS ?? 0) > 0;
    const eff = def.speed * (slowed ? (e.slowMult ?? 1) : 1);
    e.progress += eff * dt;
    if (slowed) e.slowTimerS = (e.slowTimerS ?? 0) - dt;
    if (e.progress >= 1) { state.planet.hp = Math.max(0, state.planet.hp - def.planetDamage); e.alive = false; }
  }
```

- [ ] **Step 5: Frost-Treffer setzt Slow (in damage.ts oder combat)**

Der Slow wird beim Treffer gesetzt. Sauberster Ort: in `applyDamage` NICHT (das kennt die Waffe nicht). Stattdessen: Erweitere die Hitscan-Fire-Logik in `combatSystem.tickCombatTurrets` so, dass NACH `applyDamage` bei Frost-Waffen (`def.slowMult !== undefined`) das Ziel verlangsamt wird:
```ts
    // nach applyDamage(state, target, def.baseDamage, def.damageType, t.level):
    if (def.slowMult !== undefined) {
      target.slowTimerS = def.slowDurationS ?? 0;
      target.slowMult = def.slowMult;
    }
```
(Frost ist Hitscan → kein Projektil. Splash-Frost gibt es nicht in M6.)
Ergänze einen combatSystem-Test: Frost-Turm trifft Läufer → `target.slowTimerS > 0` + `slowMult === 0.5`.

- [ ] **Step 6: Run → PASS + Typecheck.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/slow.test.ts tests/sim/combatSystem.test.ts && npm run typecheck`

- [ ] **Step 7: Golden neu erzeugen.**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && rm tests/sim/__snapshots__/golden.test.ts.snap && npx vitest run tests/sim/golden.test.ts
```

- [ ] **Step 8: Volle Suite + Commit.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npm test && npm run typecheck`
```bash
git add src/sim tests/sim && git commit -m "feat(sim): slow mechanic (enemy slow fields, moveEnemies, frost applies slow); regenerate golden"
```

---

## Task 4: Air-Targeting (Flying-Filter in selectTarget)

**Files:** Modify `src/sim/systems/combatSystem.ts`; Test `tests/sim/combatSystem.test.ts`

- [ ] **Step 1: Tests ergänzen**

```ts
describe('Air-Targeting', () => {
  it('Boden-Turm (Geschütz) ignoriert fliegende Gegner', () => {
    const s = combatState(); addTurret(s, 0);
    s.enemies.push({ eid:1, defId:'drohne_flug', hp:40, maxHp:40, angle:0, progress:0.95, alive:true, flying:true });
    s.buildings[0].cooldown = 0;
    tickCombatTurrets(s, 1/30);
    expect(s.enemies[0].hp).toBe(40); // kein Treffer
  });
  it('Flak trifft fliegende Gegner', () => {
    const s = combatState();
    s.buildings.push({ iid:s.nextIid++, defId:'flak', level:1, slot:0, cooldown:0 });
    s.enemies.push({ eid:1, defId:'drohne_flug', hp:40, maxHp:40, angle:0, progress:0.95, alive:true, flying:true });
    tickCombatTurrets(s, 1/30);
    // explosive vs light 1.2: 10*1.2=12 → hp 28
    expect(s.enemies[0].hp).toBeCloseTo(28, 4);
  });
});
```

- [ ] **Step 2: Run → FAIL.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/combatSystem.test.ts`

- [ ] **Step 3: `selectTarget` — Flying-Filter**

Lies `src/sim/systems/combatSystem.ts`. In `selectTarget`, in der `inRange`-Closure: ergänze die Bedingung `(!e.flying || def.canHitAir === true)` (Boden-Turm `canHitAir` undefined → fliegende Gegner ausgeschlossen; Flak `canHitAir:true` → erlaubt). `def` ist hier bereits `WeaponDef` (nach category-Guard).

- [ ] **Step 4: Run → PASS + volle Suite + Typecheck.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/combatSystem.test.ts && npm test && npm run typecheck`

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/sim/systems/combatSystem.ts tests/sim/combatSystem.test.ts && git commit -m "feat(sim): air-targeting (ground turrets ignore flying; flak hits air)"
```

---

## Task 5: UI + Render (neue Türme, fliegende/verlangsamte Gegner)

**Files:** Modify `src/render/Canvas2DRenderer.ts` (+ BuildPanel/SkillTreePanel sind generisch — prüfen)

- [ ] **Step 1: Renderer — Flug + Slow + Turm-Typen visualisieren**

Lies `src/render/Canvas2DRenderer.ts`. Ergänze:
- Fliegende Gegner (`e.flying`): zeichne sie mit einem kleinen Schatten/Versatz oder einer Umrandung, damit sie als „in der Luft" erkennbar sind (z.B. zusätzlicher dünner Ring in `colorVar`, oder Form `triangle` wird schon genutzt → ein heller Outline-Ring). Minimal: outline-Ring um fliegende Gegner.
- Verlangsamte Gegner (`(e.slowTimerS ?? 0) > 0`): leichter blauer Tint/Ring (`#5AB0FF`) um den Gegner.
- Türme nach Typ einfärben (optional, minimal): Frost blau, Flak orange, Railgun violett, Geschütz/Artillerie/Laser wie gehabt. (Über `getBuilding(t.defId).id` oder eine kleine Farb-Map.)

- [ ] **Step 2: BuildPanel/SkillTreePanel prüfen**

Lies beide. Sie iterieren generisch über `BUILDABLE_IDS` bzw. `SKILL_NODE_IDS` und nutzen `category`/`nodeCost`/`typ` — die neuen Türme + Unlock-Knoten erscheinen automatisch (unlock-gated). Falls die BuildPanel-`.meta`-Zeile nach dem Union-Refactor (Task 1) für Waffen-Felder einen category-Guard braucht, ist das dort schon erledigt. Hier nur verifizieren, ggf. minimale Anpassung (z.B. Slow/Anti-Air-Hinweis-Badge bei frost/flak — optional).

- [ ] **Step 3: Typecheck + Build + volle Suite.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npm run typecheck && npm run build && npm test`

- [ ] **Step 4: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/render src/ui && git commit -m "feat(render): visualize flying + slowed enemies + turret types"
```

---

## Task 6: Integrations-Verifikation

- [ ] **Step 1: Volle Suite + typecheck + build.** Alle grün.
- [ ] **Step 2: Dev-Server / Preview**
  1. Skilltree (TP seeden): u_railgun/u_frost/u_flak als „Freischalten".
  2. Freigeschaltet: Railgun/Frost/Flak baubar; gesperrt vorher 🔒.
  3. Frost verlangsamt getroffene Gegner sichtbar (blauer Tint, langsamer).
  4. Fliegende Gegner (ab ~R7): Boden-Türme treffen sie nicht; Flak schon.
  5. Railgun macht hohen Burst auf Brocken/Boss.
  6. Konsole fehlerfrei.
- [ ] **Step 3: Abschluss-Commit (falls nötig).**

---

## Definition of Done (M6)

- [ ] `BuildingDef` ist Discriminated Union; alle Konsumenten narrowen sauber (kein `as any`); volle Suite grün nach Refactor.
- [ ] Railgun + Frost + Flak als Unlock-Türme baubar; Frost verlangsamt (slowMult/slowDurationS), Flak trifft Luft.
- [ ] Fliegender Gegner nur von Flak besiegbar; Boden-Türme ignorieren ihn.
- [ ] Slow-Mechanik deterministisch (moveEnemies); Golden neu + stabil.
- [ ] typecheck + build clean; Sim-Core headless; kein RNG-Draw nötig.

---

## Self-Review (vom Planautor)

**Spec-Abdeckung:** Discriminated Union (Reviewer-Schuld) ✔ (T1), Railgun/Frost/Flak ✔ (T2), Slow ✔ (T3), Air-Targeting ✔ (T4), UI/Render ✔ (T5). Bewusst verschoben (M7): 2. Planet + Auswahl + per-Planet-Meta.

**Platzhalter-Scan:** Task 1 ist ein Refactor mit klarer Narrowing-Anweisung (kein `as any`, category-Guards). Task 3 Step 1 zweiter Test prüft nur, dass slowTimer abläuft (das Modell „Slow gilt diesen Tick" ist bewusst simpel). Sonst vollständiger Code + erwartete Werte.

**Typ-Konsistenz:** `EcoBuildingDef`/`WeaponDef`/`BuildingDef`-Union konsistent (types↔buildings↔Konsumenten mit category-Guards). `Enemy.slowTimerS/slowMult/flying` konsistent GameState↔enemySystem↔combat↔render. `WeaponDef.canHitAir/slowMult/slowDurationS` konsistent buildings↔combat(selectTarget/frost-slow). `EnemyDef.flying` konsistent enemies↔Enemy-Spawn (enemySystem muss `flying` beim Spawn aus def übernehmen — in Task 3/enemySystem prüfen: `...(def.flying ? { flying: true } : {})`). Unlock-Knoten konsistent skilltree↔deriveUnlocks↔command-Gate↔BuildPanel.
```
