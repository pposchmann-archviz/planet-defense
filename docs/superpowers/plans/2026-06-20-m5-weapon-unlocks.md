# M5 — Waffen-Unlocks (Artillerie, Laser, Projektile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Den Waffen-Pool über den Skilltree erweitern: Tech-Punkte schalten Artilleriegeschütz (explosiv, Flächenschaden über ballistische Projektile) und Laser-Emitter (Energie, Hitscan) frei; eine erweiterte Counter-Matrix (kinetic/explosive/energy × light/heavy/shield) macht Waffenwahl zum Rätsel; ein neuer Schild-Gegner zwingt zum Laser, Schwärme zur Artillerie. Abnahme: Unlock-Knoten kaufbar + persistent; freigeschaltete Waffen baubar (gesperrte blockiert); Artillerie verschießt Projektile mit Flächenschaden; Counter-Matrix wirkt (Laser zerlegt Schild, Artillerie räumt Schwärme).

**Architecture:** Erweitert M2-Combat um ein deterministisches Projektil-System (Objekt-Pool in `GameState`, ballistische Bewegung zum Ziel, Splash bei Ankunft). Hitscan-Waffen (Geschütz, Laser) nutzen den bestehenden Sofort-Treffer-Pfad; nur Artillerie ist ballistisch. Die Counter-Matrix wird auf 3×3 erweitert. Unlocks: `deriveUnlocks(skillNodes)` liefert die freigeschalteten Gebäude-IDs; beim Run-Start in den State gelegt, vom Bau-Command geprüft, im Bau-Panel angezeigt. Determinismus bleibt Pflicht.

**Tech Stack:** TypeScript + Svelte 5 + Vite + Vitest.

**Kontext:** Projekt `C:/Users/pposc/Documents/PlanetDefense`, M0–M4 fertig. Spec: `docs/superpowers/specs/2026-06-20-planet-defense-idle-design.md` (4.2 Combat/Projektile, 5.1 Counter-Matrix, 5.2 Waffen, 4.4 Unlock-Knoten). Read-then-modify. Windows; `npm test`, `npm run typecheck`, `npm run build`.

**Determinismus & Golden:** `GameState` bekommt `projectiles[]`/`nextPid`/`unlockedBuildings` → Golden in Task 2 bewusst neu erzeugt. Projektil-Bewegung ist rein (kein RNG). Kein `Math.random()`/`Date.now()` im Sim-Core.

---

## Scope-Abgrenzung M5

**Drin:** Counter-Matrix 3×3 (kinetic/explosive/energy × light/heavy/shield), `shield`-Rüstung, Artillerie (explosiv, Splash, ballistisch) + Laser (Energie, Hitscan) als Waffen-Defs, Projektil-System (Pool, Bewegung, Splash-on-arrival), Unlock-Knoten `u_artillerie`/`u_laser` im Skilltree, `deriveUnlocks` + Run-State-`unlockedBuildings` + Bau-Command-Gate + Bau-Panel-Anzeige (gesperrt/frei), neuer Schild-Gegner `schild_drohne` (in Terra-1-Runden integriert), Projektil-/Splash-Render.

**Bewusst NICHT in M5 (später):** Flying/Flak-Achse (air-Spalte), weitere Türme (Frost/Railgun/Aura), Respec, mehrere Planeten, Boss-Add-Spawns, Offline. Targeting-Modi bleiben `first` + Fokus.

---

## Combat-/Projektil-Modell (Referenz)

- Waffe ist **ballistisch**, wenn `def.projectileSpeed` gesetzt ist (Artillerie), sonst **Hitscan** (Geschütz, Laser).
- Ballistischer Schuss: spawnt ein Projektil an der Turm-Position mit Ziel = aktuelle Position des selektierten Gegners (Snapshot bei Spawn). Projektil bewegt sich mit `projectileSpeed` (Sim-Einheiten/s) auf den Zielpunkt zu. Bei Ankunft (`dist <= ankunftsschwelle`): Splash — Schaden an ALLEN lebenden Gegnern im `splashRadius` um den Einschlagpunkt; Projektil stirbt (Pool-Rückgabe). Kein Homing (Zielpunkt ist fix bei Spawn) → deterministisch + einfach.
- Splash-Schaden pro Gegner: `baseDamage * DAMAGE_MATRIX[damageType][enemy.armor] * towerLevelDamageMult^(level-1) * meta.turmSchadenMult`. Boss in Schild-Phase = unverwundbar (gleiche Regel wie Hitscan).
- Pool: tote Projektile werden wiederverwendet (kein `new` pro Schuss im Dauerbetrieb) — oder simpel: Array + `alive`-Flag + Filter, mit Wiederverwendung über einen Freelist-Index. M5 darf die simple Filter-Variante nutzen (wenige Projektile), solange deterministisch.
- Unlock: `geschuetz.unlockNode = null` (Basis, immer da). `artillery.unlockNode = 'u_artillerie'`, `laser.unlockNode = 'u_laser'`. Run-Start legt `unlockedBuildings = ['kraftwerk','erz_sammler','geschuetz', ...deriveUnlocks(skillNodes)]` an.

---

## File Structure

```
src/
├─ content/
│  ├─ types.ts            # MODIFY: DamageType += explosive/energy; ArmorType += shield; EnemyId += schild_drohne; BuildingDef += splashRadius?/unlockNode?; SkillNode (skilltree) += unlocks?
│  ├─ damageMatrix.ts     # MODIFY: 3x3 Matrix
│  ├─ buildings.ts        # MODIFY: + artillery + laser; geschuetz.unlockNode null
│  ├─ enemies.ts          # MODIFY: + schild_drohne; in TERRA1_WAVES einbauen
│  ├─ balance.ts          # MODIFY: projectile-Ankunftsschwelle (optional)
│  └─ skilltree.ts        # MODIFY: + u_artillerie + u_laser (typ 'unlock'); SkillNode.unlocks
├─ sim/
│  ├─ core/GameState.ts   # MODIFY: projectiles[]/nextPid/unlockedBuildings; createInitialState(seed, mods?, unlocks?)
│  ├─ meta.ts             # MODIFY: + deriveUnlocks(skillNodes)
│  ├─ systems/
│  │  ├─ projectileSystem.ts  # NEW: spawnProjectile + tickProjectiles (move + splash)
│  │  ├─ combatSystem.ts  # MODIFY: ballistic → spawnProjectile; hitscan path unchanged; extract applyDamage helper
│  │  └─ waveSystem.ts    # MODIFY: tickWave ruft tickProjectiles
│  └─ commands/command.ts # MODIFY: build weapon-Gate gegen unlockedBuildings ('locked')
├─ render/Canvas2DRenderer.ts  # MODIFY: Projektile + Splash zeichnen
├─ ui/
│  ├─ stores/gameStore.svelte.ts  # MODIFY: snapshot + projectiles (optional) + unlockedBuildings
│  └─ panels/
│     ├─ BuildPanel.svelte    # MODIFY: gesperrte Waffen ausgrauen (🔒) bis freigeschaltet
│     └─ SkillTreePanel.svelte# MODIFY: Unlock-Knoten anzeigen/kaufen (typ 'unlock')
tests/
├─ content/{enemies,skilltree}.test.ts  # MODIFY
├─ content/damageMatrix.test.ts # NEW (3x3 Vollständigkeit)
├─ sim/projectileSystem.test.ts # NEW
├─ sim/combatSystem.test.ts     # MODIFY (ballistic + matrix)
├─ sim/command.test.ts          # MODIFY (locked gate)
└─ sim/meta.test.ts             # MODIFY (deriveUnlocks)
```

---

## Task 1: Content — Matrix 3×3, Waffen, Schild-Gegner, Unlock-Knoten

**Files:** Modify `src/content/types.ts`, `damageMatrix.ts`, `buildings.ts`, `enemies.ts`, `skilltree.ts`; Test `tests/content/damageMatrix.test.ts` (NEW), extend `enemies.test.ts`, `skilltree.test.ts`

- [ ] **Step 1: Tests schreiben/erweitern**

`tests/content/damageMatrix.test.ts` (NEW):
```ts
import { describe, it, expect } from 'vitest';
import { DAMAGE_MATRIX } from '../../src/content/damageMatrix';

describe('Counter-Matrix 3x3', () => {
  const types = ['kinetic', 'explosive', 'energy'] as const;
  const armors = ['light', 'heavy', 'shield'] as const;
  it('hat jede Kombination', () => {
    for (const t of types) for (const a of armors) expect(typeof DAMAGE_MATRIX[t][a]).toBe('number');
  });
  it('Schlüsselwerte: kinetic schwach gg shield, energy stark gg shield, explosive stark gg heavy', () => {
    expect(DAMAGE_MATRIX.kinetic.shield).toBeLessThan(1);
    expect(DAMAGE_MATRIX.energy.shield).toBeGreaterThan(1.5);
    expect(DAMAGE_MATRIX.explosive.heavy).toBeGreaterThan(1);
  });
});
```
In `tests/content/enemies.test.ts` ergänze:
```ts
import { getEnemy } from '../../src/content/enemies'; // falls noch nicht
describe('Schild-Gegner', () => {
  it('schild_drohne hat shield-Rüstung', () => {
    expect(getEnemy('schild_drohne').armor).toBe('shield');
  });
});
```
In `tests/content/skilltree.test.ts` ergänze:
```ts
describe('Unlock-Knoten (M5)', () => {
  it('u_artillerie / u_laser sind Unlock-Knoten mit gebaeudeId', () => {
    const a = getSkillNode('u_artillerie');
    expect(a.typ).toBe('unlock');
    expect(a.unlocks?.gebaeudeId).toBe('artillery');
    expect(getSkillNode('u_laser').unlocks?.gebaeudeId).toBe('laser');
  });
});
```
Und im bestehenden `'hat genau die 5 M4-Passiv-Knoten'`-Test: passe an, falls er exakte Gleichheit von SKILL_NODE_IDS prüft (jetzt 7 Knoten) — ersetze die Assertion durch eine, die die 5 Passive als Teilmenge prüft ODER die volle 7er-Liste. (Nicht raten — lies den Test und aktualisiere die Erwartung konsistent.)

In `tests/content/enemies.test.ts` ggf. den Buildings-Geschütz-Test um artillery/laser ergänzen ist optional; mindestens `getBuilding('artillery').splashRadius` > 0 und `getBuilding('laser').projectileSpeed === undefined` prüfen.

- [ ] **Step 2: Run → FAIL.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/content/`

- [ ] **Step 3: `types.ts` erweitern**

Lies `src/content/types.ts`. Ändere:
- `DamageType = 'kinetic' | 'explosive' | 'energy'`
- `ArmorType = 'light' | 'heavy' | 'shield'`
- `EnemyId += 'schild_drohne'`
- `BuildingDef` += `splashRadius?: number;` und `unlockNode?: string | null;` (projectileSpeed existiert schon)
- Im SkillNode-Typ (in skilltree.ts, nicht types.ts) wird `unlocks?` ergänzt — siehe Step 7.

- [ ] **Step 4: `damageMatrix.ts` — 3×3**

`src/content/damageMatrix.ts`:
```ts
import type { DamageType, ArmorType } from './types';

// Kanonische Counter-Matrix (Spec 5.1). Schaden↓ × Rüstung→.
export const DAMAGE_MATRIX: Record<DamageType, Record<ArmorType, number>> = {
  kinetic:   { light: 1.5, heavy: 0.6, shield: 0.5 },
  explosive: { light: 1.2, heavy: 1.5, shield: 0.4 },
  energy:    { light: 0.8, heavy: 0.7, shield: 2.0 },
};
```

- [ ] **Step 5: `buildings.ts` — Artillerie + Laser**

Lies `src/content/buildings.ts`. Ergänze `geschuetz.unlockNode: null`; füge hinzu:
```ts
  artillery: {
    id: 'artillery', nameDe: 'Artilleriegeschütz', category: 'weapon',
    baseCost: 130, powerGen: 0, powerCost: 14, producesOrePerTick: 0, maxLevel: 8,
    damageType: 'explosive', baseDamage: 18, fireRate: 0.6, range: 200, splashRadius: 60, projectileSpeed: 500,
    unlockNode: 'u_artillerie',
  },
  laser: {
    id: 'laser', nameDe: 'Laser-Emitter', category: 'weapon',
    baseCost: 150, powerGen: 0, powerCost: 12, producesOrePerTick: 0, maxLevel: 8,
    damageType: 'energy', baseDamage: 9, fireRate: 1.5, range: 200,
    unlockNode: 'u_laser', // projectileSpeed undefined = Hitscan
  },
```
`BuildingId` (in types.ts) muss `'artillery' | 'laser'` enthalten — ergänze dort. `WEAPON_BUILDING_IDS` += 'artillery','laser'; `BUILDABLE_IDS` entsprechend. `getBuilding` unverändert.

- [ ] **Step 6: `enemies.ts` — Schild-Drohne + in Runden**

Lies `src/content/enemies.ts`. Ergänze in `ENEMIES`:
```ts
  schild_drohne: { id: 'schild_drohne', nameDe: 'Schild-Drohne', baseHp: 80, speed: 0.05, armor: 'shield', planetDamage: 2, reward: 6, shape: 'circle', colorVar: '#5AB0FF' },
```
und baue sie in mittlere/späte Terra-1-Runden ein (z.B. R6 + R8 + R9 je eine kleine Gruppe), damit der Laser ab ~Runde 6 Sinn ergibt. Konkret in `TERRA1_WAVES` ergänzen (zu bestehenden Gruppen hinzufügen, NICHT ersetzen): R6 `+{ enemyId:'schild_drohne', count:2, spacingS:1, startDelayS:6 }`, R8 `+{...count:2...startDelayS:7}`, R9 `+{...count:3...startDelayS:8}`. (Lies die aktuellen Rundenzeilen und füge die Gruppen ein.)

- [ ] **Step 7: `skilltree.ts` — Unlock-Knoten**

Lies `src/content/skilltree.ts`. Ergänze im `SkillNode`-Typ: `unlocks?: { gebaeudeId: string };`. Füge zwei Unlock-Knoten in `SKILL_NODES` ein:
```ts
  u_artillerie: { id: 'u_artillerie', branch: 'defense', typ: 'unlock', nameDe: 'Artilleriegeschütz', beschreibung: 'Schaltet das Artilleriegeschütz frei (Flächenschaden).', kostenTp: 14, maxStufe: 1, unlocks: { gebaeudeId: 'artillery' } },
  u_laser: { id: 'u_laser', branch: 'defense', typ: 'unlock', nameDe: 'Laser-Emitter', beschreibung: 'Schaltet den Laser-Emitter frei (stark gegen Schilde).', kostenTp: 12, maxStufe: 1, unlocks: { gebaeudeId: 'laser' } },
```
`SKILL_NODE_IDS` aktualisiert sich automatisch (Object.keys). `getSkillNode` unverändert. (Unlock-Knoten haben kein `effekt` → `deriveMetaMods` überspringt sie bereits via `if (!node?.effekt) continue`.)

- [ ] **Step 8: Run → PASS + Typecheck + volle Suite.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/content/ && npm run typecheck && npm test`
  (Falls bestehende combat/enemy-Tests durch neue Matrix-Armor oder TERRA1-Änderungen brechen, prüfen — die Matrix-Erweiterung ist additiv; TERRA1-Änderungen erhöhen nur Gegnerzahlen. enemyHpMul/scaledEnemyHp unberührt.)

- [ ] **Step 9: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/content tests/content && git commit -m "feat(content): M5 weapons (artillery, laser), 3x3 matrix, shield enemy, unlock nodes"
```

---

## Task 2: GameState — Projektile + unlockedBuildings (+ Golden)

**Files:** Modify `src/sim/core/GameState.ts`; regenerate golden

- [ ] **Step 1: GameState erweitern**

Lies `src/sim/core/GameState.ts`. Ergänze:
- `Projectile`-Interface:
```ts
export interface Projectile {
  pid: number;
  x: number; y: number;      // aktuelle Position (Sim-Koordinaten)
  tx: number; ty: number;    // Zielpunkt (fix bei Spawn)
  speed: number;             // Sim-Einheiten/s
  damage: number;            // baseDamage (vor Matrix/Level/Meta? — siehe Combat-Task)
  damageType: import('../../content/types').DamageType;
  level: number;             // Turm-Level (für levelMult bei Einschlag)
  splashRadius: number;
  alive: boolean;
}
```
- In `GameState`: `projectiles: Projectile[]; nextPid: number; unlockedBuildings: string[];`
- `createInitialState(seed, mods?, unlocks?: string[])`: initialisiere `projectiles: [], nextPid: 1, unlockedBuildings: unlocks ?? ['kraftwerk', 'erz_sammler', 'geschuetz']`. (Wenn `unlocks` übergeben wird, ENTHÄLT es bereits die Basis + freigeschaltete — die App baut die volle Liste. Default = nur Basis.)

> Hinweis Schadensmodell: Speichere im Projektil `damage = def.baseDamage` und `level`; den Matrix-Multiplikator + Level + Meta wende bei Einschlag an (pro getroffenem Gegner, da Rüstung pro Gegner variiert). Das hält Splash gegen gemischte Rüstungen korrekt.

- [ ] **Step 2: Typecheck.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npm run typecheck`

- [ ] **Step 3: Golden neu erzeugen.**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && rm tests/sim/__snapshots__/golden.test.ts.snap && npx vitest run tests/sim/golden.test.ts
```
Zweiter Lauf stabil.

- [ ] **Step 4: Volle Suite + Commit.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npm test && npm run typecheck`
```bash
git add src/sim/core/GameState.ts tests/sim/__snapshots__/golden.test.ts.snap && git commit -m "feat(sim): projectile + unlockedBuildings state; regenerate golden"
```

---

## Task 3: Projektil-System (Spawn, Bewegung, Splash)

**Files:** Create `src/sim/systems/projectileSystem.ts`; Test `tests/sim/projectileSystem.test.ts`

- [ ] **Step 1: Test schreiben**

`tests/sim/projectileSystem.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, type GameState } from '../../src/sim/core/GameState';
import { spawnProjectile, tickProjectiles } from '../../src/sim/systems/projectileSystem';

function combat(): GameState {
  const s = createInitialState(1);
  s.phase = 'COMBAT';
  return s;
}

describe('spawnProjectile', () => {
  it('legt ein Projektil mit Zielpunkt an', () => {
    const s = combat();
    spawnProjectile(s, { x: 0, y: 0 }, { x: 100, y: 0 }, { damage: 18, damageType: 'explosive', level: 1, splashRadius: 60, speed: 500 });
    expect(s.projectiles).toHaveLength(1);
    expect(s.projectiles[0].alive).toBe(true);
    expect(s.projectiles[0].tx).toBe(100);
  });
});

describe('tickProjectiles', () => {
  it('bewegt Projektile zum Ziel und schlägt mit Splash ein', () => {
    const s = combat();
    // zwei Gegner nahe dem Einschlagpunkt (100,0): progress so wählen, dass Position ~ (100,0)? Test nutzt direkte Positionsnähe via Splash-Radius.
    s.enemies.push({ eid: 1, defId: 'schwarm', hp: 12, maxHp: 12, angle: 0, progress: 0.95, alive: true });
    s.enemies.push({ eid: 2, defId: 'schwarm', hp: 12, maxHp: 12, angle: 0, progress: 0.96, alive: true });
    // Zielpunkt = Position von Gegner 1
    const { pathPosition } = await import('../../src/sim/core/geometry');
    const tp = pathPosition(0, 0.955);
    spawnProjectile(s, { x: tp.x + 700, y: tp.y }, tp, { damage: 18, damageType: 'explosive', level: 1, splashRadius: 200, speed: 100000 });
    tickProjectiles(s, 1); // große Geschwindigkeit → erreicht Ziel sofort
    expect(s.projectiles.some((p) => p.alive)).toBe(false); // eingeschlagen
    // explosive vs light(schwarm) 1.2 → 18*1.2=21.6 ≥ 12 → beide tot (im Splash)
    expect(s.enemies.every((e) => !e.alive)).toBe(true);
  });

  it('Boss in Schild-Phase nimmt keinen Splash-Schaden', () => {
    const s = combat();
    s.enemies.push({ eid: 9, defId: 'zitadelle', hp: 1000, maxHp: 1000, angle: 0, progress: 0.9, alive: true, isBoss: true, bossPhase: 'shield', bossPhaseTimerS: 1 });
    const { pathPosition } = await import('../../src/sim/core/geometry');
    const tp = pathPosition(0, 0.9);
    spawnProjectile(s, { x: tp.x + 700, y: tp.y }, tp, { damage: 18, damageType: 'explosive', level: 1, splashRadius: 200, speed: 100000 });
    tickProjectiles(s, 1);
    expect(s.enemies[0].hp).toBe(1000);
  });
});
```
(Wenn `async import` im Test stört, importiere `pathPosition` oben normal.)

- [ ] **Step 2: Run → FAIL.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/projectileSystem.test.ts`

- [ ] **Step 3: Implementieren**

`src/sim/systems/projectileSystem.ts`:
```ts
import type { GameState, Projectile, Enemy } from '../core/GameState';
import type { DamageType } from '../../content/types';
import { getEnemy } from '../../content/enemies';
import { DAMAGE_MATRIX } from '../../content/damageMatrix';
import { BALANCE } from '../../content/balance';
import { pathPosition, dist } from '../core/geometry';

interface ShotSpec { damage: number; damageType: DamageType; level: number; splashRadius: number; speed: number; }

export function spawnProjectile(state: GameState, from: { x: number; y: number }, to: { x: number; y: number }, spec: ShotSpec): void {
  // Pool: wiederverwende ein totes Projektil, sonst neu.
  const dead = state.projectiles.find((p) => !p.alive);
  const p: Projectile = dead ?? ({} as Projectile);
  p.pid = dead ? p.pid : state.nextPid++;
  p.x = from.x; p.y = from.y; p.tx = to.x; p.ty = to.y;
  p.speed = spec.speed; p.damage = spec.damage; p.damageType = spec.damageType;
  p.level = spec.level; p.splashRadius = spec.splashRadius; p.alive = true;
  if (!dead) state.projectiles.push(p);
}

const ARRIVE = 6; // Sim-Einheiten Ankunftsschwelle

export function tickProjectiles(state: GameState, dt: number): void {
  for (const p of state.projectiles) {
    if (!p.alive) continue;
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= ARRIVE || step >= d) {
      // Einschlag am Zielpunkt
      explode(state, p);
      p.alive = false;
    } else {
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
  }
}

function explode(state: GameState, p: Projectile): void {
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (e.isBoss && e.bossPhase === 'shield') continue; // unverwundbar
    const pos = pathPosition(e.angle, e.progress);
    if (dist({ x: p.x, y: p.y }, pos) > p.splashRadius) continue;
    const enemyDef = getEnemy(e.defId);
    const dmg = p.damage
      * DAMAGE_MATRIX[p.damageType][enemyDef.armor]
      * Math.pow(BALANCE.towerLevelDamageMult, p.level - 1)
      * state.meta.turmSchadenMult;
    e.hp -= dmg;
    if (e.hp <= 0) {
      e.alive = false;
      if (e.isBoss) state.bossesKilledThisRun += 1;
      state.ore = Math.min(state.oreStorageCap, state.ore + enemyDef.reward);
    }
  }
}
```
> Hinweis: `explode` dupliziert die Schadens-/Kill-Logik aus combatSystem. In Task 4 wird eine gemeinsame `applyDamage(state, enemy, damage, damageType, level)`-Helferfunktion extrahiert und von BEIDEN genutzt (Hitscan + Splash), um Drift zu vermeiden. Für Task 3 ist die obige Form okay, solange die Tests grün sind.

- [ ] **Step 4: Run → PASS + Typecheck.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/projectileSystem.test.ts && npm run typecheck`

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/sim/systems/projectileSystem.ts tests/sim/projectileSystem.test.ts && git commit -m "feat(sim): projectile system (pooled, ballistic move, splash on arrival)"
```

---

## Task 4: Combat-Integration (ballistisch vs Hitscan) + applyDamage-Dedup + waveSystem

**Files:** Modify `src/sim/systems/combatSystem.ts`, `src/sim/systems/projectileSystem.ts`, `src/sim/systems/waveSystem.ts`; Test `tests/sim/combatSystem.test.ts`

- [ ] **Step 1: Tests ergänzen**

In `tests/sim/combatSystem.test.ts` ergänze:
```ts
describe('ballistische Waffe spawnt Projektil statt Sofort-Treffer', () => {
  it('Artillerie feuert ein Projektil, kein direkter HP-Verlust im selben Tick', () => {
    const s = combatState();
    s.buildings.push({ iid: s.nextIid++, defId: 'artillery', level: 1, slot: 0, cooldown: 0 });
    s.enemies.push({ eid: 1, defId: 'schwarm', hp: 12, maxHp: 12, angle: 0, progress: 0.95, alive: true });
    tickCombatTurrets(s, 1 / 30);
    expect(s.projectiles.length).toBeGreaterThan(0); // Projektil gespawnt
    expect(s.enemies[0].hp).toBe(12); // noch kein Splash (erst bei Ankunft)
  });
});
describe('Laser (Hitscan, energy) trifft sofort', () => {
  it('Laser macht energy-Schaden ohne Projektil', () => {
    const s = combatState();
    s.buildings.push({ iid: s.nextIid++, defId: 'laser', level: 1, slot: 0, cooldown: 0 });
    s.enemies.push({ eid: 1, defId: 'schild_drohne', hp: 80, maxHp: 80, angle: 0, progress: 0.95, alive: true });
    tickCombatTurrets(s, 1 / 30);
    expect(s.projectiles.length).toBe(0); // Hitscan, kein Projektil
    // energy vs shield 2.0: 9*2.0=18 → hp 62
    expect(s.enemies[0].hp).toBeCloseTo(62, 4);
  });
});
```

- [ ] **Step 2: Run → FAIL.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/combatSystem.test.ts`

- [ ] **Step 3: `applyDamage` extrahieren + combat anpassen**

Lies `src/sim/systems/combatSystem.ts`. Extrahiere eine exportierte `applyDamage(state, enemy, baseDamage, damageType, level)` (kapselt: Schild-Skip, Matrix×Level×Meta, hp-=, Kill→Boss-Count+Reward). Nutze sie im Hitscan-Pfad. In `tickCombatTurrets`: nach Zielwahl + Cooldown — wenn `def.projectileSpeed !== undefined` (ballistisch): `spawnProjectile(state, towerPosition(slot), pathPosition(target.angle, target.progress), { damage: def.baseDamage, damageType: def.damageType, level: t.level, splashRadius: def.splashRadius ?? 0, speed: def.projectileSpeed })`; sonst Hitscan via `applyDamage(...)`. Importiere `spawnProjectile` aus projectileSystem.
Passe `projectileSystem.explode` an, `applyDamage` (aus combatSystem) pro getroffenem Gegner zu nutzen — ENTFERNE die duplizierte Schadenslogik in `explode`, rufe stattdessen `applyDamage(state, e, p.damage, p.damageType, p.level)` für jeden Gegner im Radius (Schild-Skip macht applyDamage selbst → die `bossPhase==='shield'`-Prüfung in explode kann entfallen, da applyDamage sie kapselt).

> WICHTIG: `applyDamage` muss die Schild-Phase selbst prüfen (Boss unverwundbar) UND den Kill/Reward/Boss-Count machen, damit Hitscan + Splash identisch sind. Vermeide ein zirkuläres Import-Problem: `applyDamage` in combatSystem.ts definieren+exportieren, projectileSystem importiert es. combatSystem importiert `spawnProjectile` aus projectileSystem → potenziell zirkulär. Falls TS/Vite das zirkuläre Import-Paar nicht sauber auflöst, lege `applyDamage` in eine eigene kleine Datei `src/sim/systems/damage.ts` und lass BEIDE (combat + projectile) daraus importieren. Wähle den saubereren Weg und berichte ihn.

- [ ] **Step 4: `waveSystem.ts` — tickProjectiles einhängen**

Lies `src/sim/systems/waveSystem.ts`. In `tickWave`, in der Reihenfolge: … spawn → bossPhases → move → **tickCombatTurrets → tickProjectiles** → filter. (Projektile nach den Türmen ticken, damit frisch gespawnte Projektile im selben Frame noch nicht einschlagen — sie bewegen sich ab dem nächsten Tick; das ist konsistent mit dem Test „kein Splash im selben Tick".) Importiere `tickProjectiles`.

- [ ] **Step 5: Run → PASS + volle Suite + Typecheck.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/combatSystem.test.ts tests/sim/projectileSystem.test.ts && npm test && npm run typecheck`

- [ ] **Step 6: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/sim/systems/ tests/sim/combatSystem.test.ts && git commit -m "feat(sim): ballistic vs hitscan firing + shared applyDamage + projectile tick in wave"
```

---

## Task 5: Unlock-Logik (deriveUnlocks + Bau-Command-Gate)

**Files:** Modify `src/sim/meta.ts`, `src/sim/commands/command.ts`; Test `tests/sim/meta.test.ts`, `tests/sim/command.test.ts`

- [ ] **Step 1: Tests ergänzen**

In `tests/sim/meta.test.ts`:
```ts
import { deriveUnlocks } from '../../src/sim/meta';
describe('deriveUnlocks', () => {
  it('leer = nur keine Extra-Unlocks', () => {
    expect(deriveUnlocks({})).toEqual([]);
  });
  it('gekaufter u_laser schaltet laser frei', () => {
    expect(deriveUnlocks({ u_laser: 1 })).toContain('laser');
  });
});
```
In `tests/sim/command.test.ts`:
```ts
describe('build: Waffen-Unlock-Gate', () => {
  it('lehnt gesperrte Waffe ab', () => {
    const s = createInitialState(1); s.ore = 1000;
    // artillery nicht in unlockedBuildings
    const r = applyCommand(s, { t: 'build', buildingId: 'artillery' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('locked');
  });
  it('erlaubt freigeschaltete Waffe', () => {
    const s = createInitialState(1, undefined, ['kraftwerk', 'erz_sammler', 'geschuetz', 'artillery']);
    s.ore = 1000;
    const r = applyCommand(s, { t: 'build', buildingId: 'artillery' });
    expect(r.ok).toBe(true);
  });
  it('Basis-Geschütz ist immer baubar', () => {
    const s = createInitialState(1); s.ore = 1000;
    expect(applyCommand(s, { t: 'build', buildingId: 'geschuetz' }).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run → FAIL.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/meta.test.ts tests/sim/command.test.ts`

- [ ] **Step 3: `deriveUnlocks` in meta.ts**

Lies `src/sim/meta.ts`, ergänze:
```ts
// Gekaufte Unlock-Knoten -> Liste freigeschalteter Gebäude-IDs.
export function deriveUnlocks(skillNodes: Record<string, number>): string[] {
  const out: string[] = [];
  for (const [id, level] of Object.entries(skillNodes)) {
    if (level <= 0) continue;
    const node = SKILL_NODES[id];
    if (node?.typ === 'unlock' && node.unlocks?.gebaeudeId) out.push(node.unlocks.gebaeudeId);
  }
  return out;
}
```

- [ ] **Step 4: `command.ts` — locked-Gate**

Lies `src/sim/commands/command.ts`. Ergänze `'locked'` zu `CommandReason`. Im `build`-Case nach dem unknownBuilding-Check + vor/bei dem weapon-Zweig: wenn `def.category === 'weapon' && def.unlockNode && !state.unlockedBuildings.includes(def.id)` → `return fail('locked')`. (Basis-Gebäude mit `unlockNode == null` passieren.)

- [ ] **Step 5: Run → PASS + volle Suite + Typecheck.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/meta.test.ts tests/sim/command.test.ts && npm test && npm run typecheck`

- [ ] **Step 6: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/sim/meta.ts src/sim/commands/command.ts tests/sim/meta.test.ts tests/sim/command.test.ts && git commit -m "feat(sim): deriveUnlocks + weapon build unlock gate"
```

---

## Task 6: UI + Render + Verdrahtung (Unlocks anwenden, Projektile zeichnen, Panels)

**Files:** Modify `src/sim/core/GameState.ts`-Aufruf in `src/App.svelte`, `src/ui/stores/gameStore.svelte.ts`, `src/render/Canvas2DRenderer.ts`, `src/ui/panels/BuildPanel.svelte`, `src/ui/panels/SkillTreePanel.svelte`

- [ ] **Step 1: App.svelte — Unlocks in den Run geben**

Lies `src/App.svelte`. In `boot()`: baue die Unlock-Liste und übergib sie:
```ts
import { deriveUnlocks } from './sim/meta';
// in boot():
const unlocks = ['kraftwerk', 'erz_sammler', 'geschuetz', ...deriveUnlocks(session.meta.skillNodes)];
const state = createInitialState(SEED, session.runMods(), unlocks);
```

- [ ] **Step 2: Snapshot — unlockedBuildings + projectiles**

Lies `src/ui/stores/gameStore.svelte.ts`. Ergänze `unlockedBuildings: string[]` (aus state) und optional `projectiles` (für Render liest der Renderer aber live state — Projektile NICHT zwingend in den Snapshot; der Renderer liest `state` direkt). Mindestens `unlockedBuildings` in den Snapshot für das BuildPanel-Gating. `emptySnapshot` += `unlockedBuildings: []`.

- [ ] **Step 3: BuildPanel — gesperrte Waffen**

Lies `src/ui/panels/BuildPanel.svelte`. Für jede Waffe: `locked = def.category === 'weapon' && def.unlockNode != null && !snap.unlockedBuildings.includes(def.id)`. Wenn gesperrt: Button deaktiviert + Schloss-Symbol 🔒 + Label „gesperrt" statt Kosten (oder Kosten ausgegraut). Basis-Geschütz (unlockNode null) immer baubar.

- [ ] **Step 4: SkillTreePanel — Unlock-Knoten**

Lies `src/ui/panels/SkillTreePanel.svelte`. Iteriere bereits über `SKILL_NODE_IDS` (enthält jetzt u_artillerie/u_laser). Unlock-Knoten haben `maxStufe 1` und kein `effekt` — der bestehende Kaufen-Button funktioniert (Kosten via `nodeCost`). Zeige bei `typ==='unlock'` „Freischalten" statt „Kaufen" und blende die Stufe als „freigeschaltet"/„gesperrt" an. (Minimaler Eingriff; nutze `node.typ`.)

- [ ] **Step 5: Renderer — Projektile + Splash**

Lies `src/render/Canvas2DRenderer.ts`. Zeichne lebende Projektile als kleine gelbe Kreise (`#FFE14D`, r 3) an `simToScreen(p.x, p.y)`. Optional: ein kurzer Splash-Ring beim Einschlag (kann entfallen — M5 minimal: Projektile sichtbar). Türme nach Waffentyp leicht einfärben (Artillerie orange, Laser blau) ist optional.

- [ ] **Step 6: Typecheck + Build + volle Suite.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npm run typecheck && npm run build && npm test`

- [ ] **Step 7: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/App.svelte src/ui src/render && git commit -m "feat(ui): apply unlocks to run, gate locked weapons, render projectiles, unlock nodes in skilltree"
```

---

## Task 7: Integrations-Verifikation

- [ ] **Step 1: Volle Suite + typecheck + build.** Alle grün.
- [ ] **Step 2: Dev-Server / Preview**
  1. Skilltree: u_artillerie / u_laser als „Freischalten" sichtbar (Kosten 14/12 TP).
  2. Ohne Unlock: Artillerie/Laser im Bau-Panel gesperrt (🔒).
  3. Mit Unlock (TP seeden falls nötig): baubar; Artillerie verschießt sichtbare Projektile, Splash räumt Schwärme; Laser zerlegt Schild-Drohne (energy vs shield 2.0).
  4. Konsole fehlerfrei.
- [ ] **Step 3: Abschluss-Commit (falls nötig).**

---

## Definition of Done (M5)

- [ ] Volle Suite grün (Matrix 3×3, Projektil-System, ballistisch/Hitscan, applyDamage-Dedup, deriveUnlocks, locked-Gate, neuer Golden).
- [ ] typecheck + build clean.
- [ ] Artillerie verschießt Projektile mit Flächenschaden; Laser ist Hitscan-Energie; Counter-Matrix wirkt (energy>shield, explosive>heavy, kinetic<shield).
- [ ] Unlock-Knoten kaufbar + persistent; freigeschaltete Waffen baubar, gesperrte blockiert (UI + Command).
- [ ] Schild-Drohne erscheint in mittleren/späten Runden und ist mit Laser sinnvoll konterbar.
- [ ] Determinismus erhalten (Projektile rein, kein RNG); Sim-Core headless.

---

## Self-Review (vom Planautor)

**Spec-Abdeckung (4.2/5.1/5.2/4.4):** Projektil-System + Splash ✔ (T2/T3), 3×3-Matrix + shield ✔ (T1), Artillerie/Laser-Defs ✔ (T1), ballistisch vs Hitscan ✔ (T4), Unlock-Knoten + deriveUnlocks + Gate ✔ (T1/T5), Schild-Gegner ✔ (T1), UI/Render ✔ (T6). Bewusst verschoben: Flying/Flak, weitere Türme, Respec, mehrere Planeten.

**Platzhalter-Scan:** Task 3 `explode` dupliziert bewusst die Schadenslogik mit klarer Anweisung, sie in Task 4 durch das gemeinsame `applyDamage` zu ersetzen (kein bleibender Platzhalter). Task 4 nennt das mögliche zirkuläre Import-Problem (combat↔projectile) und gibt eine saubere Lösung (gemeinsame `damage.ts`) vor. Sonst vollständiger Code + erwartete Werte.

**Typ-Konsistenz:** `DamageType`/`ArmorType`/`EnemyId`/`BuildingId` erweitert konsistent (types↔matrix↔buildings↔enemies). `Projectile` konsistent GameState↔projectileSystem↔combat↔render. `SkillNode.unlocks` konsistent skilltree↔meta(deriveUnlocks). `unlockedBuildings` konsistent createInitialState↔command↔snapshot↔BuildPanel↔App. `applyDamage`-Signatur konsistent combat↔projectile. `spawnProjectile`/`tickProjectiles` Signaturen über Tests + waveSystem-Aufrufer stimmig.
```
