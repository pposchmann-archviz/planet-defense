# M4 — Meta & Skilltree (Festbeißen-Loop) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Den Festbeißen-Loop schließen: Am Run-Ende (Sieg ODER Niederlage) gibt es Tech-Punkte je nach Fortschritt; diese fließen in einen permanenten Skilltree mit 5 Passiv-Knoten (mehr Strom, mehr Erz, mehr Turm-Schaden, mehr Planet-HP, mehr Start-Erz); gekaufte Knoten + Tech-Punkte werden gespeichert und machen JEDEN folgenden Run dauerhaft sichtbar stärker. Abnahme: TP werden korrekt vergeben + persistiert; gekaufte Passive verändern den nächsten Run messbar; Skilltree-Käufe überleben einen Reload.

**Architecture:** Neue Trennung Meta (dauerhaft) vs. Run (pro Versuch). Eine `MetaState` (techPoints + gekaufte Knoten) lebt außerhalb des Run-`GameState`, wird über den bestehenden Save-Stub persistiert. `deriveMetaMods(skillNodes)` rechnet die gekauften Knoten in Run-Modifikatoren um; `createInitialState(seed, mods)` wendet sie auf den Start-Run an (Start-Erz, Strom-gen, Planet-HP, Turm-Schaden). Die App/GameClock-Schicht hält die Meta, vergibt am Run-Ende TP, speichert, und startet neue Runs aus der Meta. Determinismus bleibt: Meta-Mods sind reine Funktionen.

**Tech Stack:** TypeScript + Svelte 5 + Vite + Vitest.

**Kontext:** Projekt `C:/Users/pposc/Documents/PlanetDefense`, M0–M3 fertig. Spec: `docs/superpowers/specs/2026-06-20-planet-defense-idle-design.md` (Kap. 4.4 Meta & Skilltree, 7 Persistence). Der Save-Stub (`src/persistence/`) hat bereits `meta.techPoints` + `meta.skillNodes` — M4 verdrahtet den Run damit. Windows; `npm test`, `npm run typecheck`, `npm run build`. Read-then-modify für bestehende Dateien.

**Determinismus & Golden:** `createInitialState` bekommt einen optionalen `mods`-Parameter (neutral-default), und `GameState.meta` wird um Felder erweitert → Golden in Task 3 bewusst neu erzeugen. Kein `Math.random()`/`Date.now()` im Sim-Core. (`Date.now()` für `savedAt` lebt ausschließlich in der App/Persistence-Schicht, NICHT im Sim-Core.)

---

## Scope-Abgrenzung M4

**Drin:** Tech-Punkte-Formel + Vergabe am Run-Ende (Sieg + Niederlage), Bestmarken-Bonus, 5 Passiv-Skilltree-Knoten (eco/defense/survival), `deriveMetaMods` (Knoten → Run-Boni), Anwendung der Boni beim Run-Start (Start-Erz, Strom-gen-Mult, Erz-Rate-Mult, Turm-Schaden-Mult, Planet-HP-Mult), Kauf-Logik (TP ausgeben, Stufen-Kosten), Persistenz über bestehenden Save (techPoints + skillNodes), Skilltree-UI-Screen, Run-Ende-Screen mit TP-Aufschlüsselung + Skilltree-Zugang, Restart aus Meta.

**Bewusst NICHT in M4 (Folge-Meilenstein):** Unlock-Knoten für NEUE Gebäude/Waffen (Artillerie/Laser/Fusionskraftwerk) — die bringen ein Waffen-/Projektil-/Splash-System mit und kommen in „M5 Waffen & Unlocks". Außerdem: Respec, Schlüssel-/Run-Modifier-Knoten, mehrere Planeten, Offline-Progress, Migrations-Kette. Der Skilltree in M4 hat nur Passiv-Knoten; die Unlock-Achse ist als Typ vorbereitet, aber leer.

---

## Meta-Modell (Referenz)

- `MetaState { techPoints: number; skillNodes: Record<string, number> }` (nodeId → gekaufte Stufe). Lebt außerhalb des Run-`GameState`, persistiert in `SaveState.meta`.
- Tech-Punkte am Run-Ende: `tp = floor(techBase * (besteRunde / techDiv)^techExp) + bosseBesiegt*techBossBonus + (neueBestmarke ? techRecordBonus : 0)`. „besteRunde" = `highestRoundCleared` dieses Runs.
- Passiv-Knoten: Stufe `n` (1-basiert) trägt `stufe1 + (n-1)*folge` (Prozent additiv pro Knoten); Mult = `1 + summe/100`. Flat-Knoten (Start-Erz): `n * proStufe`.
- `deriveMetaMods(skillNodes)` → `{ oreMult, powerGenMult, turmSchadenMult, planetHpMult, startOreBonus }` (Defaults 1/1/1/1/0).
- Stufen-Kosten Passiv: `nodeCost(node, currentLevel) = floor(node.kostenTp * passiveCostGrowth^currentLevel)` (Level 0→1 = base).
- Run-Start: `createInitialState(seed, mods)` setzt `ore = startOre + mods.startOreBonus`, `power.gen = startPowerGen * mods.powerGenMult`, `planet.maxHp = floor(planetHpBase * mods.planetHpMult)`, `meta` (im State) trägt `oreMult/powerGenMult/turmSchadenMult` für Eco/Combat.

---

## File Structure

```
src/
├─ content/
│  ├─ balance.ts          # MODIFY: techBase/techDiv/techExp/techBossBonus/techRecordBonus, passiveCostGrowth
│  └─ skilltree.ts        # NEW: 5 Passiv-Knoten (SkillNode defs) + types
├─ sim/
│  ├─ core/GameState.ts   # MODIFY: EcoMetaMods += turmSchadenMult, planetHpMult; createInitialState(seed, mods?)
│  ├─ formulas.ts         # MODIFY: + techPunkte, + nodeCost
│  ├─ meta.ts             # NEW: MetaState, deriveMetaMods, buyNode, awardTechPoints (rein)
│  └─ systems/combatSystem.ts  # MODIFY: dmg *= state.meta.turmSchadenMult
├─ persistence/
│  ├─ schema.ts           # (bereits meta.techPoints+skillNodes) — ggf. unverändert
│  └─ storage.ts          # (bereits read/write) — ggf. unverändert
├─ app/
│  ├─ session.ts          # NEW: Meta-Lebenszyklus (load/save meta, applyRunEnd, buy)
│  └─ GameClock.ts        # MODIFY: am Run-Ende-Übergang awardTechPoints + persist (einmalig)
├─ ui/
│  ├─ stores/(gameStore|metaStore).svelte.ts  # MODIFY/NEW: meta-Snapshot für UI
│  └─ panels/
│     ├─ SkillTreePanel.svelte  # NEW
│     └─ WaveControl.svelte     # MODIFY: Run-Ende-TP-Aufschlüsselung + "Skilltree"-Button
└─ App.svelte             # MODIFY: Session/Meta verdrahten, Skilltree-Screen-Toggle, Restart aus Meta
tests/
├─ sim/formulas.test.ts   # MODIFY: techPunkte, nodeCost
├─ sim/meta.test.ts       # NEW: deriveMetaMods, buyNode, awardTechPoints
├─ content/skilltree.test.ts  # NEW
└─ sim/metaApply.test.ts  # NEW: createInitialState mit mods + combat turmSchadenMult
```

---

## Task 1: Balance + Skilltree-Content (5 Passive)

**Files:** Modify `src/content/balance.ts`; Create `src/content/skilltree.ts`; Test `tests/content/skilltree.test.ts`

- [ ] **Step 1: Test schreiben**

`tests/content/skilltree.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { SKILL_NODES, getSkillNode, SKILL_NODE_IDS } from '../../src/content/skilltree';

describe('Skilltree-Content (M4 Passive)', () => {
  it('hat genau die 5 M4-Passiv-Knoten', () => {
    expect(SKILL_NODE_IDS.sort()).toEqual(['p_erzrate', 'p_planethp', 'p_starterz', 'p_stromcap', 'p_turmschaden']);
  });
  it('alle Knoten sind Passiv mit maxStufe>=1, base-Kosten>0, einem Stat', () => {
    for (const id of SKILL_NODE_IDS) {
      const n = getSkillNode(id);
      expect(n.typ).toBe('passiv');
      expect(n.maxStufe).toBeGreaterThanOrEqual(1);
      expect(n.kostenTp).toBeGreaterThan(0);
      expect(n.effekt).toBeTruthy();
    }
  });
  it('deckt alle 5 Run-Stats ab', () => {
    const stats = SKILL_NODE_IDS.map((id) => getSkillNode(id).effekt!.stat).sort();
    expect(stats).toEqual(['erzRate', 'planetHp', 'startErz', 'stromCap', 'turmSchaden']);
  });
  it('getSkillNode wirft bei unbekannt', () => {
    expect(() => getSkillNode('nope')).toThrow();
  });
});
```

- [ ] **Step 2: Run → FAIL.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/content/skilltree.test.ts`

- [ ] **Step 3: `balance.ts` erweitern**

Lies `src/content/balance.ts`, ergänze im BALANCE-Objekt:
```ts
  // --- Meta / Tech-Punkte (M4) ---
  techBase: 3,
  techDiv: 2,
  techExp: 0.7,
  techBossBonus: 10,
  techRecordBonus: 5,
  passiveCostGrowth: 1.6,
```

- [ ] **Step 4: `skilltree.ts` schreiben**

`src/content/skilltree.ts`:
```ts
export type KnotenTyp = 'unlock' | 'passiv';
export type Branch = 'eco' | 'defense' | 'survival';
// Run-Stats, die Passive modifizieren:
export type PassivStat = 'stromCap' | 'erzRate' | 'turmSchaden' | 'planetHp' | 'startErz';

export interface SkillNode {
  id: string;
  branch: Branch;
  typ: KnotenTyp;
  nameDe: string;
  beschreibung: string;
  kostenTp: number; // passiv: Basispreis (Stufe 0->1); unlock: Festpreis
  maxStufe: number;
  effekt?: { stat: PassivStat; stufe1: number; folge: number; modus: 'prozent' | 'flat' };
}

// M4: nur Passive (front-geladen). Unlock-Achse folgt in M5.
export const SKILL_NODES: Record<string, SkillNode> = {
  p_stromcap: { id: 'p_stromcap', branch: 'eco', typ: 'passiv', nameDe: 'Netzausbau', beschreibung: 'Mehr Strom-Erzeugung.', kostenTp: 4, maxStufe: 4, effekt: { stat: 'stromCap', stufe1: 30, folge: 12, modus: 'prozent' } },
  p_erzrate: { id: 'p_erzrate', branch: 'eco', typ: 'passiv', nameDe: 'Bohrtechnik', beschreibung: 'Mehr Erz pro Sekunde.', kostenTp: 3, maxStufe: 4, effekt: { stat: 'erzRate', stufe1: 25, folge: 10, modus: 'prozent' } },
  p_turmschaden: { id: 'p_turmschaden', branch: 'defense', typ: 'passiv', nameDe: 'Munitionsforschung', beschreibung: 'Mehr Turm-Schaden.', kostenTp: 5, maxStufe: 4, effekt: { stat: 'turmSchaden', stufe1: 30, folge: 10, modus: 'prozent' } },
  p_planethp: { id: 'p_planethp', branch: 'survival', typ: 'passiv', nameDe: 'Schildgenerator', beschreibung: 'Mehr Planet-HP.', kostenTp: 6, maxStufe: 3, effekt: { stat: 'planetHp', stufe1: 35, folge: 15, modus: 'prozent' } },
  p_starterz: { id: 'p_starterz', branch: 'survival', typ: 'passiv', nameDe: 'Vorrats-Depot', beschreibung: 'Mehr Start-Erz.', kostenTp: 4, maxStufe: 3, effekt: { stat: 'startErz', stufe1: 50, folge: 50, modus: 'flat' } },
};

export const SKILL_NODE_IDS: string[] = Object.keys(SKILL_NODES);

export function getSkillNode(id: string): SkillNode {
  const n = SKILL_NODES[id];
  if (!n) throw new Error(`Unbekannter Skill-Knoten: ${id}`);
  return n;
}
```

- [ ] **Step 5: Run → PASS + Typecheck + volle Suite.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/content/skilltree.test.ts && npm run typecheck && npm test`

- [ ] **Step 6: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/content/balance.ts src/content/skilltree.ts tests/content/skilltree.test.ts && git commit -m "feat(content): M4 tech-point balance + skilltree passive nodes"
```

---

## Task 2: Pure Meta-Logik (TP-Formel, Kosten, deriveMetaMods, buyNode, awardTechPoints)

**Files:** Modify `src/sim/formulas.ts`; Create `src/sim/meta.ts`; Test `tests/sim/formulas.test.ts`, `tests/sim/meta.test.ts`

- [ ] **Step 1: Tests schreiben**

In `tests/sim/formulas.test.ts` ergänze:
```ts
import { techPunkte, nodeCost } from '../../src/sim/formulas';
import { getSkillNode } from '../../src/content/skilltree';

describe('techPunkte', () => {
  it('Basis nach besteRunde (BASE 3, DIV 2, EXP 0.7)', () => {
    // floor(3 * (10/2)^0.7) = floor(3 * 5^0.7) = floor(3*3.085) = 9
    expect(techPunkte(10, 0, false)).toBe(9);
  });
  it('addiert Boss-Bonus und Bestmarken-Bonus', () => {
    // 9 + 1*10 + 5 = 24
    expect(techPunkte(10, 1, true)).toBe(24);
  });
  it('Runde 0 gibt 0 Basis', () => {
    expect(techPunkte(0, 0, false)).toBe(0);
  });
});

describe('nodeCost', () => {
  it('Stufe 0->1 = Basispreis', () => {
    expect(nodeCost(getSkillNode('p_stromcap'), 0)).toBe(4);
  });
  it('wächst mit passiveCostGrowth 1.6', () => {
    // floor(4 * 1.6^1) = 6
    expect(nodeCost(getSkillNode('p_stromcap'), 1)).toBe(6);
  });
});
```

`tests/sim/meta.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { emptyMeta, deriveMetaMods, buyNode, awardTechPoints } from '../../src/sim/meta';

describe('deriveMetaMods', () => {
  it('leere Meta = neutrale Mods', () => {
    const m = deriveMetaMods({});
    expect(m).toEqual({ oreMult: 1, powerGenMult: 1, turmSchadenMult: 1, planetHpMult: 1, startOreBonus: 0 });
  });
  it('p_stromcap Stufe 1 = +30% powerGenMult', () => {
    const m = deriveMetaMods({ p_stromcap: 1 });
    expect(m.powerGenMult).toBeCloseTo(1.3, 6);
  });
  it('p_stromcap Stufe 2 = +42% (30+12)', () => {
    const m = deriveMetaMods({ p_stromcap: 2 });
    expect(m.powerGenMult).toBeCloseTo(1.42, 6);
  });
  it('p_starterz Stufe 2 = +100 Start-Erz (flat)', () => {
    const m = deriveMetaMods({ p_starterz: 2 });
    expect(m.startOreBonus).toBe(100);
  });
});

describe('buyNode', () => {
  it('kauft einen Knoten und zieht TP ab', () => {
    const meta = { techPoints: 10, skillNodes: {} };
    const r = buyNode(meta, 'p_stromcap');
    expect(r.ok).toBe(true);
    expect(meta.techPoints).toBe(6); // 10 - 4
    expect(meta.skillNodes.p_stromcap).toBe(1);
  });
  it('lehnt ab bei zu wenig TP', () => {
    const meta = { techPoints: 2, skillNodes: {} };
    const r = buyNode(meta, 'p_stromcap');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('notEnoughTp');
  });
  it('lehnt ab bei maxStufe', () => {
    const meta = { techPoints: 1000, skillNodes: { p_planethp: 3 } }; // max 3
    const r = buyNode(meta, 'p_planethp');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('maxLevel');
  });
});

describe('awardTechPoints', () => {
  it('addiert TP auf das Konto und liefert die Aufschlüsselung', () => {
    const meta = emptyMeta();
    const res = awardTechPoints(meta, 10, 1, true);
    expect(res.gained).toBe(24); // 9 + 10 + 5
    expect(meta.techPoints).toBe(24);
    expect(res.basis).toBe(9);
    expect(res.bossBonus).toBe(10);
    expect(res.recordBonus).toBe(5);
  });
});
```

- [ ] **Step 2: Run → FAIL.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/formulas.test.ts tests/sim/meta.test.ts`

- [ ] **Step 3: `formulas.ts` erweitern**

Lies `src/sim/formulas.ts`, ergänze (nutze vorhandenen BALANCE-Import):
```ts
import type { SkillNode } from '../content/skilltree';

// Tech-Punkte am Run-Ende.
export function techPunkte(besteRunde: number, bosseBesiegt: number, neueBestmarke: boolean): number {
  const { techBase, techDiv, techExp, techBossBonus, techRecordBonus } = BALANCE;
  const basis = besteRunde <= 0 ? 0 : Math.floor(techBase * Math.pow(besteRunde / techDiv, techExp));
  return basis + bosseBesiegt * techBossBonus + (neueBestmarke ? techRecordBonus : 0);
}

// Kosten, um einen Passiv-Knoten von currentLevel auf currentLevel+1 zu heben.
export function nodeCost(node: SkillNode, currentLevel: number): number {
  return Math.floor(node.kostenTp * Math.pow(BALANCE.passiveCostGrowth, currentLevel));
}
```

- [ ] **Step 4: `meta.ts` schreiben**

`src/sim/meta.ts`:
```ts
import { SKILL_NODES, getSkillNode, type PassivStat } from '../content/skilltree';
import { techPunkte, nodeCost } from './formulas';

export interface MetaState {
  techPoints: number;
  skillNodes: Record<string, number>; // nodeId -> Stufe
}

export interface RunMods {
  oreMult: number;
  powerGenMult: number;
  turmSchadenMult: number;
  planetHpMult: number;
  startOreBonus: number;
}

export function emptyMeta(): MetaState {
  return { techPoints: 0, skillNodes: {} };
}

const STAT_TO_MOD: Record<PassivStat, keyof RunMods> = {
  stromCap: 'powerGenMult',
  erzRate: 'oreMult',
  turmSchaden: 'turmSchadenMult',
  planetHp: 'planetHpMult',
  startErz: 'startOreBonus',
};

// Gekaufte Knoten -> Run-Modifikatoren (reine Funktion).
export function deriveMetaMods(skillNodes: Record<string, number>): RunMods {
  const mods: RunMods = { oreMult: 1, powerGenMult: 1, turmSchadenMult: 1, planetHpMult: 1, startOreBonus: 0 };
  for (const [id, level] of Object.entries(skillNodes)) {
    if (level <= 0) continue;
    const node = SKILL_NODES[id];
    if (!node?.effekt) continue;
    const { stat, stufe1, folge, modus } = node.effekt;
    const total = stufe1 + (level - 1) * folge;
    const key = STAT_TO_MOD[stat];
    if (modus === 'flat') {
      (mods[key] as number) += total;
    } else {
      (mods[key] as number) *= 1 + total / 100;
    }
  }
  return mods;
}

export type BuyReason = 'notEnoughTp' | 'maxLevel' | 'unknownNode';
export interface BuyResult { ok: boolean; reason?: BuyReason; }

export function buyNode(meta: MetaState, nodeId: string): BuyResult {
  let node;
  try { node = getSkillNode(nodeId); } catch { return { ok: false, reason: 'unknownNode' }; }
  const current = meta.skillNodes[nodeId] ?? 0;
  if (current >= node.maxStufe) return { ok: false, reason: 'maxLevel' };
  const cost = nodeCost(node, current);
  if (meta.techPoints < cost) return { ok: false, reason: 'notEnoughTp' };
  meta.techPoints -= cost;
  meta.skillNodes[nodeId] = current + 1;
  return { ok: true };
}

export interface TpBreakdown { basis: number; bossBonus: number; recordBonus: number; gained: number; }

// Vergibt TP am Run-Ende, mutiert meta.techPoints, liefert Aufschlüsselung.
export function awardTechPoints(meta: MetaState, besteRunde: number, bosse: number, neueBestmarke: boolean): TpBreakdown {
  const gained = techPunkte(besteRunde, bosse, neueBestmarke);
  const basis = besteRunde <= 0 ? 0 : gained - bosse * 0 /* siehe Aufschlüsselung unten */;
  // Aufschlüsselung explizit nachrechnen (gleiche Konstanten):
  const b = besteRunde <= 0 ? 0 : Math.floor(3 * Math.pow(besteRunde / 2, 0.7)); // techBase/techDiv/techExp
  const bossBonus = bosse * 10;
  const recordBonus = neueBestmarke ? 5 : 0;
  meta.techPoints += gained;
  return { basis: b, bossBonus, recordBonus, gained };
}
```
> Hinweis: `awardTechPoints` rechnet die Aufschlüsselung mit denselben Konstanten nach. Sauberer wäre, `techPunkte` eine strukturierte Aufschlüsselung zurückgeben zu lassen — falls der Code-Reviewer das anmerkt, refaktoriere `techPunkte` so, dass `awardTechPoints` keine Konstanten dupliziert. Für Task 2 ist die obige Form akzeptabel, solange die Tests grün sind. (Die `basis`-Zeile mit `gained - bosse*0` ist nur Lärm — entferne sie und nutze direkt `b`.)

- [ ] **Step 5: Run → PASS + Typecheck.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/formulas.test.ts tests/sim/meta.test.ts && npm run typecheck`

- [ ] **Step 6: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/sim/formulas.ts src/sim/meta.ts tests/sim/formulas.test.ts tests/sim/meta.test.ts && git commit -m "feat(sim): meta logic (techPunkte, nodeCost, deriveMetaMods, buyNode, awardTechPoints)"
```

---

## Task 3: Mods auf den Run anwenden (GameState + Combat)

**Files:** Modify `src/sim/core/GameState.ts`, `src/sim/systems/combatSystem.ts`; Test `tests/sim/metaApply.test.ts`; regenerate golden

- [ ] **Step 1: Test schreiben**

`tests/sim/metaApply.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/sim/core/GameState';
import { tickCombatTurrets } from '../../src/sim/systems/combatSystem';
import { deriveMetaMods } from '../../src/sim/meta';
import { BALANCE } from '../../src/content/balance';

describe('createInitialState mit Mods', () => {
  it('ohne Mods = Basiswerte', () => {
    const s = createInitialState(1);
    expect(s.ore).toBe(BALANCE.startOre);
    expect(s.power.gen).toBe(BALANCE.startPowerGen);
    expect(s.planet.maxHp).toBe(BALANCE.planetHpBase);
    expect(s.meta.turmSchadenMult).toBe(1);
  });
  it('wendet Start-Erz, Strom-Mult, Planet-HP-Mult an', () => {
    const mods = deriveMetaMods({ p_starterz: 1, p_stromcap: 1, p_planethp: 1 });
    const s = createInitialState(1, mods);
    expect(s.ore).toBe(BALANCE.startOre + 50);
    expect(s.power.gen).toBeCloseTo(BALANCE.startPowerGen * 1.3, 6);
    expect(s.planet.maxHp).toBe(Math.floor(BALANCE.planetHpBase * 1.35));
    expect(s.planet.hp).toBe(s.planet.maxHp);
  });
});

describe('Turm-Schaden-Mult im Combat', () => {
  it('verdoppelt nahezu den Schaden bei +30% (Stufe 1)', () => {
    const mods = deriveMetaMods({ p_turmschaden: 1 }); // turmSchadenMult 1.3
    const s = createInitialState(1, mods);
    s.phase = 'COMBAT'; s.power.coverage = 1;
    s.buildings.push({ iid: s.nextIid++, defId: 'geschuetz', level: 1, slot: 0, cooldown: 0 });
    s.enemies.push({ eid: 1, defId: 'laeufer', hp: 100, maxHp: 100, angle: 0, progress: 0.95, alive: true });
    tickCombatTurrets(s, 1 / 30);
    // 6 * 1.5 (kinetic/light) * 1.0 (level) * 1.3 (mods) = 11.7 → hp 88.3
    expect(s.enemies[0].hp).toBeCloseTo(88.3, 4);
  });
});
```

- [ ] **Step 2: Run → FAIL.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/metaApply.test.ts`

- [ ] **Step 3: `GameState.ts` anpassen**

Lies `src/sim/core/GameState.ts`. (a) `EcoMetaMods` erweitern; (b) `createInitialState` signatur + Anwendung. 
- In `EcoMetaMods` ergänze: `turmSchadenMult: number; planetHpMult: number;`
- `createInitialState(seed: number, mods?: Partial<EcoMetaMods> & { startOreBonus?: number }): GameState` — baue `meta` aus Defaults + mods:
```ts
export function createInitialState(seed: number, mods?: Partial<EcoMetaMods>): GameState {
  const meta: EcoMetaMods = {
    oreMult: mods?.oreMult ?? 1,
    powerGenMult: mods?.powerGenMult ?? 1,
    startOreBonus: mods?.startOreBonus ?? 0,
    turmSchadenMult: mods?.turmSchadenMult ?? 1,
    planetHpMult: mods?.planetHpMult ?? 1,
  };
  const planetMaxHp = Math.floor(BALANCE.planetHpBase * meta.planetHpMult);
  return {
    // ... seed, rng, phase 'BUILD', tick 0, timeS 0,
    ore: BALANCE.startOre + meta.startOreBonus,
    oreStorageCap: BALANCE.oreStorageCapBase,
    power: { gen: BALANCE.startPowerGen * meta.powerGenMult, draw: 0, coverage: 1 },
    // ... buildings [], nextIid 1,
    meta,
    planet: { x: 0, y: 0, hp: planetMaxHp, maxHp: planetMaxHp, radius: BALANCE.R_PLANET },
    // ... enemies, nextEid, wave, focus*, currentRound 1, highestRoundCleared 0, bossesKilledThisRun 0
  };
}
```
(Übernimm die vorhandenen restlichen Felder unverändert — read-then-modify, NICHT neu erfinden. Die `RunMods`-Form aus meta.ts ist strukturell kompatibel zu `Partial<EcoMetaMods>` — beide haben dieselben 5 Keys.)

- [ ] **Step 4: `combatSystem.ts` — Turm-Schaden-Mult**

Lies `src/sim/systems/combatSystem.ts`. In der Schadensberechnung ergänze `* state.meta.turmSchadenMult`:
```ts
const dmg = (def.baseDamage ?? 0)
  * DAMAGE_MATRIX[def.damageType ?? 'kinetic'][enemyDef.armor]
  * Math.pow(BALANCE.towerLevelDamageMult, t.level - 1)
  * state.meta.turmSchadenMult;
```

- [ ] **Step 5: Run → PASS.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/sim/metaApply.test.ts && npm run typecheck`

- [ ] **Step 6: Golden neu erzeugen** (createInitialState-Form/meta-Felder geändert)
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && rm tests/sim/__snapshots__/golden.test.ts.snap && npx vitest run tests/sim/golden.test.ts
```
Zweiter Lauf stabil.

- [ ] **Step 7: Volle Suite + Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && npm test && npm run typecheck && git add src/sim/core/GameState.ts src/sim/systems/combatSystem.ts tests/sim/metaApply.test.ts tests/sim/__snapshots__/golden.test.ts.snap && git commit -m "feat(sim): apply meta mods to run start + tower damage; regenerate golden"
```

---

## Task 4: Session-Schicht (Meta laden/speichern, Run-Ende, Kauf) + UI-Store

**Files:** Create `src/app/session.ts`, `src/ui/stores/metaStore.svelte.ts`; Test `tests/app/session.test.ts`

- [ ] **Step 1: Test schreiben**

`tests/app/session.test.ts`:
```ts
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
    const bd = sess.endRun({ highestRoundCleared: 10, bossesKilledThisRun: 1, newRecord: true });
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
});
```

- [ ] **Step 2: Run → FAIL.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/app/session.test.ts`

- [ ] **Step 3: `session.ts` schreiben**

`src/app/session.ts`:
```ts
import { type MetaState, emptyMeta, deriveMetaMods, buyNode, awardTechPoints, type RunMods, type TpBreakdown, type BuyResult } from '../sim/meta';

// Abstrakte Persistenz, damit die Session ohne localStorage testbar ist.
export interface MetaStore { read(): string | null; write(raw: string): void; }

interface PersistShape { techPoints: number; skillNodes: Record<string, number>; }

export class Session {
  meta: MetaState;
  constructor(private store: MetaStore) {
    this.meta = this.load();
  }
  private load(): MetaState {
    const raw = this.store.read();
    if (!raw) return emptyMeta();
    try {
      const p = JSON.parse(raw) as Partial<PersistShape>;
      return {
        techPoints: typeof p.techPoints === 'number' ? p.techPoints : 0,
        skillNodes: p.skillNodes && typeof p.skillNodes === 'object' ? { ...p.skillNodes } : {},
      };
    } catch {
      return emptyMeta();
    }
  }
  private persist(): void {
    this.store.write(JSON.stringify({ techPoints: this.meta.techPoints, skillNodes: this.meta.skillNodes }));
  }
  runMods(): RunMods {
    return deriveMetaMods(this.meta.skillNodes);
  }
  endRun(run: { highestRoundCleared: number; bossesKilledThisRun: number; newRecord: boolean }): TpBreakdown {
    const bd = awardTechPoints(this.meta, run.highestRoundCleared, run.bossesKilledThisRun, run.newRecord);
    this.persist();
    return bd;
  }
  buy(nodeId: string): BuyResult {
    const r = buyNode(this.meta, nodeId);
    if (r.ok) this.persist();
    return r;
  }
}
```
> Hinweis: Diese Session nutzt eine eigene kompakte Persistenz (`techPoints`+`skillNodes`), unabhängig vom alten Save-Stub-Schema, um M4 schlank zu halten. Falls der Reviewer Konsolidierung mit `src/persistence/storage.ts` empfiehlt, ist das ein sinnvoller Folge-Schritt; für M4 reicht die abstrakte `MetaStore`. Der Browser-Wrapper (localStorage) wird in Task 5 verdrahtet.

- [ ] **Step 4: `metaStore.svelte.ts` schreiben (reaktiver Meta-Snapshot für UI)**

`src/ui/stores/metaStore.svelte.ts`:
```ts
import type { MetaState } from '../../sim/meta';

export interface MetaSnapshot { techPoints: number; skillNodes: Record<string, number>; }

class MetaStore {
  snapshot = $state<MetaSnapshot>({ techPoints: 0, skillNodes: {} });
  push(meta: MetaState): void {
    this.snapshot = { techPoints: meta.techPoints, skillNodes: { ...meta.skillNodes } };
  }
}
export const metaStore = new MetaStore();
```

- [ ] **Step 5: Run → PASS + Typecheck + volle Suite.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npx vitest run tests/app/session.test.ts && npm run typecheck && npm test`

- [ ] **Step 6: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/app/session.ts src/ui/stores/metaStore.svelte.ts tests/app/session.test.ts && git commit -m "feat(app): session meta lifecycle (load/save/endRun/buy) + reactive meta store"
```

---

## Task 5: Verdrahtung — Run-Ende vergibt TP, Restart aus Meta

**Files:** Modify `src/app/GameClock.ts`, `src/App.svelte`

- [ ] **Step 1: GameClock — Run-Ende-Übergang erkennen**

Lies `src/app/GameClock.ts`. Die Clock soll EINMALIG beim Übergang nach RUN_WON/RUN_OVER einen Callback feuern (damit die App TP vergibt + persistiert). Ergänze:
- Ein optionaler Callback `onRunEnd?: (state: GameState) => void` (im Konstruktor oder als Setter).
- Im `frame`, NACH dem Combat-Tick: wenn `state.phase` jetzt RUN_WON/RUN_OVER ist UND vorher nicht (Flag `endedFired`), `onRunEnd(state)` rufen und Flag setzen. Beim Start/neuem Run Flag zurücksetzen.
Konkret (minimaler Eingriff): Feld `private endedFired = false;`; in `start()` `this.endedFired = false;`; im `frame` nach dem Combat-Block:
```ts
    if (!this.endedFired && (this.state.phase === 'RUN_WON' || this.state.phase === 'RUN_OVER')) {
      this.endedFired = true;
      this.onRunEnd?.(this.state);
      gameStore.push(this.state);
    }
```
und Konstruktor/Property `onRunEnd?: (s: GameState) => void` ergänzen (public settable).

- [ ] **Step 2: App.svelte — Session verdrahten**

Lies `src/App.svelte`. Ergänze:
- Import `Session`, `metaStore`, `deriveMetaMods`-Pfad via session.runMods.
- Eine `session = new Session(browserMetaStore)` wo `browserMetaStore` localStorage kapselt (try/catch), Key z.B. `'planet_defense_meta_v1'`.
- `boot()`: `const state = createInitialState(SEED, session.runMods());` (statt ohne mods); `metaStore.push(session.meta)`.
- Track `bestRound` für newRecord: vor `endRun` `const prevBest = session.meta-bezogene Bestmarke` — M4-minimal: nutze eine in der Session gehaltene `bestRoundEver` ODER leite newRecord aus `state.highestRoundCleared > (gespeicherte Bestmarke)` ab. Minimal: führe in Session ein Feld `bestRound` (persistiert) und vergleiche. Für M4 reicht: `newRecord = state.highestRoundCleared > session.bestRound`, danach `session.bestRound = max(...)`. (Falls das Session-Bestmarken-Feld nicht existiert, ergänze es analog zu techPoints/skillNodes in Task 4 — ODER halte es simpel in App-State.)
- `clock.onRunEnd = (state) => { const bd = session.endRun({ highestRoundCleared: state.highestRoundCleared, bossesKilledThisRun: state.bossesKilledThisRun, newRecord: ... }); lastBreakdown = bd; metaStore.push(session.meta); }` — `lastBreakdown` als `$state` für die Run-Ende-Anzeige.
- `handleRestart()` → `boot()` (nutzt jetzt aktuelle Mods).
- Skilltree-Kauf-Handler: `function buySkill(id) { session.buy(id); metaStore.push(session.meta); }` — wird an das SkillTreePanel (Task 6) gereicht.
- Ein Toggle `showSkilltree` ($state) für den Skilltree-Screen.

> Da App.svelte-Details vom bestehenden Stand abhängen, lies die Datei und integriere minimal-invasiv. Halte die Run/Meta-Trennung: Run-State über GameClock, Meta über Session; UI liest `metaStore`.

- [ ] **Step 3: Typecheck + Build.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npm run typecheck && npm run build`

- [ ] **Step 4: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/app/GameClock.ts src/App.svelte && git commit -m "feat(app): award TP on run end + start runs from meta mods + skilltree wiring"
```

---

## Task 6: UI — Skilltree-Screen + Run-Ende-TP-Aufschlüsselung

**Files:** Create `src/ui/panels/SkillTreePanel.svelte`; Modify `src/ui/panels/WaveControl.svelte`, `src/App.svelte`

- [ ] **Step 1: `SkillTreePanel.svelte` schreiben**

`src/ui/panels/SkillTreePanel.svelte`:
```svelte
<script lang="ts">
  import { metaStore } from '../stores/metaStore.svelte';
  import { SKILL_NODE_IDS, SKILL_NODES } from '../../content/skilltree';
  import { nodeCost } from '../../sim/formulas';

  let { onBuy, onClose }: { onBuy: (id: string) => void; onClose: () => void } = $props();
  const meta = $derived(metaStore.snapshot);
</script>

<div class="tree">
  <header>
    <h2>Skilltree</h2>
    <span class="tp">{meta.techPoints} Tech-Punkte</span>
    <button class="close" onclick={() => onClose()}>Schließen</button>
  </header>
  <div class="nodes">
    {#each SKILL_NODE_IDS as id (id)}
      {@const node = SKILL_NODES[id]}
      {@const level = meta.skillNodes[id] ?? 0}
      {@const maxed = level >= node.maxStufe}
      {@const cost = nodeCost(node, level)}
      <div class="node {node.branch}">
        <div class="name">{node.nameDe} <span class="lvl">{level}/{node.maxStufe}</span></div>
        <div class="desc">{node.beschreibung}</div>
        <button disabled={maxed || meta.techPoints < cost} onclick={() => onBuy(id)}>
          {maxed ? 'Max' : `Kaufen · ${cost} TP`}
        </button>
      </div>
    {/each}
  </div>
</div>

<style>
  .tree { background: #141A33; border-radius: 14px; padding: 18px; max-width: 720px; margin: 0 auto; }
  header { display: flex; align-items: center; gap: 16px; margin-bottom: 14px; }
  h2 { margin: 0; font-size: 18px; }
  .tp { color: #FF7A59; font-weight: 800; }
  .close { margin-left: auto; background: #2C3760; border: none; color: #F2F5FF; padding: 8px 14px; border-radius: 8px; cursor: pointer; }
  .nodes { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .node { background: #1E2748; border: 1px solid #2C3760; border-radius: 10px; padding: 12px; }
  .node.eco { border-left: 3px solid #4DD0C2; } .node.defense { border-left: 3px solid #FF4D5E; } .node.survival { border-left: 3px solid #FFC53D; }
  .name { font-weight: 800; } .lvl { color: #9AA6D4; font-size: 12px; }
  .desc { font-size: 12px; color: #9AA6D4; margin: 6px 0 10px; }
  button { width: 100%; background: #4DD0C2; color: #06121f; border: none; padding: 8px; border-radius: 8px; font-weight: 800; cursor: pointer; }
  button:disabled { opacity: .45; cursor: not-allowed; background: #2C3760; color: #9AA6D4; }
</style>
```

- [ ] **Step 2: WaveControl — Run-Ende-TP-Aufschlüsselung + Skilltree-Button**

Lies `src/ui/panels/WaveControl.svelte`. In RUN_WON/RUN_OVER zusätzlich die TP-Aufschlüsselung (aus einem neuen Prop `breakdown?: TpBreakdown | null`) und einen „Skilltree"-Button (Prop `onOpenSkilltree`) zeigen. Ergänze Props:
```ts
  let { onCommand, onRestart, onOpenSkilltree, breakdown }:
    { onCommand: (c: UICommand) => void; onRestart: () => void; onOpenSkilltree: () => void; breakdown: { basis: number; bossBonus: number; recordBonus: number; gained: number } | null } = $props();
```
und in den RUN_WON/RUN_OVER-Zweigen z.B.:
```svelte
    {#if breakdown}
      <div class="tp-breakdown">+{breakdown.gained} Tech-Punkte (Basis {breakdown.basis} · Boss {breakdown.bossBonus} · Rekord {breakdown.recordBonus})</div>
    {/if}
    <button class="skill" onclick={() => onOpenSkilltree()}>Skilltree</button>
```
(CSS für `.tp-breakdown` (color #FF7A59) + `.skill` ergänzen.)

- [ ] **Step 3: App.svelte — Skilltree-Screen-Toggle + Props reichen**

Lies `src/App.svelte`. Verdrahte: `{#if showSkilltree}<SkillTreePanel onBuy={buySkill} onClose={() => showSkilltree=false} />{:else} ...Spiel... {/if}`; reiche `onOpenSkilltree={() => showSkilltree=true}` + `breakdown={lastBreakdown}` an WaveControl. Nach einem Kauf bleibt der Skilltree offen (Snapshot aktualisiert via metaStore.push in buySkill).

- [ ] **Step 4: Typecheck + Build + volle Suite.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npm run typecheck && npm run build && npm test`

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/pposc/Documents/PlanetDefense" && git add src/ui/panels/SkillTreePanel.svelte src/ui/panels/WaveControl.svelte src/App.svelte && git commit -m "feat(ui): skilltree screen + run-end TP breakdown + skilltree access"
```

---

## Task 7: Integrations-Verifikation

- [ ] **Step 1: Volle Suite + typecheck + build.** `cd "C:/Users/pposc/Documents/PlanetDefense" && npm test && npm run typecheck && npm run build` (alle grün).

- [ ] **Step 2: Dev-Server / Preview**
1. Erster Start: Skilltree leer, 0 TP.
2. Run spielen/verlieren → Run-Ende-Screen zeigt „+N Tech-Punkte (Basis/Boss/Rekord)".
3. „Skilltree" öffnen → Knoten kaufen (TP sinkt, Stufe steigt).
4. „Neu starten" → neuer Run zeigt die Boni (z.B. mehr Start-Erz / Strom / Planet-HP je nach Kauf).
5. Reload (F5) → Tech-Punkte + gekaufte Knoten sind noch da (Persistenz).
6. Konsole fehlerfrei.

- [ ] **Step 3: Abschluss-Commit (falls nötig).** `cd "C:/Users/pposc/Documents/PlanetDefense" && git add -A && git commit -m "chore(m4): meta/skilltree integration verified" || echo "nichts zu committen"`

---

## Definition of Done (M4)

- [ ] Volle Suite grün (techPunkte, nodeCost, deriveMetaMods, buyNode, awardTechPoints, metaApply, session, skilltree-content, neuer Golden).
- [ ] typecheck + build clean.
- [ ] TP werden am Run-Ende korrekt vergeben (Formel) und in der Aufschlüsselung gezeigt.
- [ ] Skilltree-Käufe geben TP aus, erhöhen Stufen, sind gedeckelt (maxStufe), und überleben einen Reload (Persistenz).
- [ ] Gekaufte Passive verändern den nächsten Run messbar (Start-Erz, Strom-gen, Erz-Rate, Turm-Schaden, Planet-HP).
- [ ] Run/Meta-Trennung sauber: Run-State im GameClock, Meta in der Session; Sim-Core bleibt headless (kein Date.now/localStorage im Sim-Core).

---

## Self-Review (vom Planautor)

**Spec-Abdeckung (Kap. 4.4 + 7):** TP-Formel (DIV=2-Variante) ✔ (T2), Passiv-Knoten front-geladen ✔ (T1), deriveMetaMods ✔ (T2), Anwendung auf Run ✔ (T3), Kauf + Kosten + maxStufe ✔ (T2), Persistenz ✔ (T4), Run-Ende-TP-Screen + Skilltree-UI ✔ (T6), Restart aus Meta ✔ (T5). Bewusst verschoben (M5): Unlock-Knoten/neue Waffen, Respec, weitere Planeten, Offline.

**Platzhalter-Scan:** Task 2 `awardTechPoints` enthält eine bewusst markierte Aufräum-Notiz (die `gained - bosse*0`-Zeile ist Lärm und SOLL entfernt werden; die Aufschlüsselung über die nachgerechneten Konstanten ist akzeptabel, ein Refactor von `techPunkte` zu strukturierter Rückgabe ist optional). Sonst überall vollständiger Code + erwartete Werte. Task 5 App.svelte ist read-then-modify mit klaren Integrationspunkten (kein erfundener Code).

**Typ-Konsistenz:** `MetaState`/`RunMods`/`TpBreakdown`/`BuyResult` (meta.ts) konsistent in formulas, session, tests, UI. `EcoMetaMods` += turmSchadenMult/planetHpMult konsistent GameState↔combat↔metaApply-Test. `RunMods` strukturell == die 5 EcoMetaMods-Keys (createInitialState akzeptiert beide). `SkillNode`/`PassivStat` (skilltree.ts) konsistent in meta/formulas/UI. `Session` API (runMods/endRun/buy) konsistent App↔Test. `nodeCost`/`techPunkte` Signaturen über Tests + Aufrufer stimmig. `metaStore.snapshot` konsistent Store↔SkillTreePanel.
```
