# Planet Defense Idle — Design & Umsetzungsplan

> **Status:** Konsolidierte Spec v1.0 (20.06.2026). Vereint alle Design-Abschnitte zu einem widerspruchsfreien Plan. Adversariale Review-Befunde sind aktiv eingearbeitet: ein einziger verbindlicher MVP-Scope, **eine** kanonische Zahlen-/Formel-Quelle (`content/balance.ts`), gestrichener Über-Scope, und ein in die Bau-/Combat-Phase eingebauter Spaß-Hebel.
>
> **Verbindlichkeits-Regel:** Bei jedem Zahlen-/Formel-Konflikt gilt ausschließlich Kapitel 4.0 (Kanonische Balance-Tabelle). Alle Prosa-Tabellen in diesem Dokument sind **illustrativ**; Implementiert wird nur, was in `content/balance.ts`, `content/towers.ts`, `content/enemies.ts` und `content/damageMatrix.ts` steht.

---

## 1. Vision & Pitch

**Planet Defense Idle** ist ein Solo-Hobby-Spiel: Strategie-Idle + Tower-Defense + Roguelite-Meta. Man verteidigt einen Planeten gegen eskalierende Gegnerwellen. Pro Run zieht man in einer ruhigen Bau-Phase die Wirtschaft hoch (Erz und Strom), baut Verteidigung, startet dann per Knopfdruck eine Welle und schaut im zentralen Combat-Viewport zu, wie die Türme feuern. Übersteht der Planet alle Wellen inklusive Endboss, ist der Planet geschafft; geht der Planet kaputt, ist der Run vorbei — aber jeder Run, auch ein gescheiterter, schüttet Tech-Punkte aus, die einen permanenten Skilltree füttern. Der nächste Versuch ist dadurch dauerhaft stärker. Man beißt sich an einem Planeten fest, bis man stark genug ist.

**USP:** Strom ist ein harter, strategischer Engpass. Jedes Gebäude und jeder Turm verbraucht Strom; Kraftwerke erzeugen ihn. Bei Strom-Defizit feuert alles proportional schwächer. Die zentrale Spannung jedes Runs ist: erst Eco hochziehen, dann auf Verteidigung umschwenken — und dabei nie das Strombudget sprengen.

**Look:** Modern, minimalistisch, „Kurzgesagt"-Stil — flache Vektorformen, kräftige Farben auf dunklem Space-Hintergrund. Form + Farbe = Rolle, auf einen Blick lesbar.

---

## 2. Bestätigte Eckdaten

| Punkt | Festlegung |
|---|---|
| **Genre** | Strategie-Idle + Tower-Defense + Roguelite-Meta |
| **Präsentation** | Hybrid: Kommandozentralen-UI (Ressourcen, Bau-/Upgrade-Panels) + zentraler Live-Combat-Viewport |
| **Tempo** | Rundenbasiert, ruhige Bau-Phase, Welle per Knopfdruck (kein Zwangstimer) |
| **Plattform** | NUR Desktop-Browser (kein Mobile) |
| **Sprache** | Spiel UND Doku auf Deutsch |
| **Ziel** | Tiefes Hobby-Projekt (Tiefe + Politur), Solo-Dev, kein kommerzieller Druck |
| **Tech-Stack (fix)** | TypeScript + Svelte 5 (Runes) + Vite + Canvas2D + Vitest |
| **Architektur-Prinzip** | Headless Sim-Core = einzige Quelle der Wahrheit; Content als typisierte Daten-Configs; UI liest reaktiv (kalt); Render zeichnet nur (heiß, direkt) |
| **Zahlen-Typ** | Nativ `number` hinter Alias `type Num = number`. Kein `break_infinity` im MVP (Zahlen moderat, Viewport lesbar). Alias kostet nichts → Swap später ein reiner Serializer-Tausch. |
| **Determinismus** | Pflicht ab Tag 1: seedbarer PRNG, fixed-timestep, kein `Math.random()`/`Date.now()` im Sim-Core. |
| **Projektordner** | `C:/Users/pposc/Documents/PlanetDefense` |
| **Kanonischer MVP-Planet** | ID `p1`, Anzeigename **„Terra-1"** (durchgängig in Code und UI) |

---

## 3. Core-Loop

### Innen-Loop (ein Run = ein Planet-Versuch)

1. **Bau-/Eco-Phase (`BUILD`):** Eco tickt idle (Erz + Strom-Bilanz). Spieler baut/upgradet Gebäude und Türme, managt das Strombudget. Vor dem Wellenstart zeigt eine Wellen-Vorschau die kommende Gegner-Komposition **und** eine grobe Bedrohungs-Einschätzung (deine Verteidigung vs. diese Welle). Endet per Knopfdruck.
2. **Combat-Phase (`COMBAT`):** Die Welle läuft im Viewport. Gegner fliegen radial auf den Planeten zu, Türme feuern automatisch. Der Spieler hat **eine aktive Mikroentscheidung pro Welle** (Fokus-Markieren, siehe 4.2), ansonsten Antizipation statt Hektik. Welle überlebt → zurück zu `BUILD`, nächste Runde härter. Alle 5 Runden eine Boss-Welle.
3. **Run-Ende:** Planet-HP ≤ 0 → `RUN_OVER`. Endboss besiegt → `RUN_WON` (Planet geschafft, nächster freigeschaltet).

### Außen-Loop (Meta, dauerhaft)

Am Run-Ende gibt es Tech-Punkte je nach Fortschritt (erreichte Runde + Bosse + neue Bestmarke) — **auch bei Niederlage**. Tech-Punkte fließen in einen permanenten Skilltree, der neue Gebäude/Waffen freischaltet (horizontale Achse) und passive Boni gibt (vertikale Achse). Der nächste Run ist dadurch sichtbar stärker. „Festbeissen": denselben Planeten mehrfach versuchen, bis stark genug; Sieg schaltet den nächsten Planeten frei.

**Reset-Vertrag:** Pro Run resetten In-Run-Eco (Ressourcen-Vorräte + gebaute Gebäude). Dauerhaft bleiben nur Meta (Skilltree, Tech-Punkte, Planet-Unlocks, Bestmarken, Settings). Ein Reload mitten im Run wirft auf den Run-Anfang zurück (Run verloren) — roguelite-konform, kein Resume im MVP.

---

## 4. Spielsysteme

### 4.0 Kanonische Balance-Tabelle (Single Source of Truth)

> Diese Werte sind die **einzig gültige** Quelle. Sie leben in `content/balance.ts`, `content/towers.ts`, `content/enemies.ts`, `content/damageMatrix.ts`. Alle anderen Tabellen im Dokument sind illustrativ. Werte sind **Tuning-Startwerte**, per Vitest-Balance-Sim justierbar — aber an genau dieser Stelle, nicht verstreut.

```ts
// content/balance.ts — die EINE Quelle für alle globalen Tuning-Werte
export const BALANCE = {
  // --- Tick-Raten (KANONISCH: Eco = 1 Hz; alle "pro Tick"-Werte sind "pro Sekunde") ---
  ECO_STEP_S:        1.0,      // Eco-Tick = 1 Hz, läuft immer
  COMBAT_STEP_S:     1 / 30,   // Combat-Tick = 30 Hz, nur während aktiver Welle
  MAX_STEPS:         5,        // Spiral-of-Death-Cap
  SNAPSHOT_HZ:       8,        // kalter UI-Snapshot

  // --- Eco / Kosten ---
  costGrowth:        1.12,     // r für Bau/Upgrade (gesenkt von 1.15 → 3–5 Käufe/Bauphase)
  rewardGrowth:      'linear', // Ertrag linear (n+1), flacher als Kosten
  startOre:          50,
  oreStorageCapBase: 600,      // Terra-1 Start-Cap
  oreStorageCapPerWave: 120,   // Cap wächst pro überlebter Welle (Soft-Pull, ersetzt Hardcap)
  startPowerGen:     20,       // Sockel-Kraftwerk am Kommandozentrum (gratis)

  // --- Strom (KANONISCH: Kraftwerk +20, Turm-Draw -8; 1 KW ≈ 2,5 Türme) ---
  // Erzeuger ziehen vollen Strom; Verbraucher werden bei coverage<1 gedrosselt (Produktion+DPS).
  // Eco-Verbraucher (Minen) ziehen reduzierten Draw bei Drosselung → stabilisiert, keine Todesspirale.

  // --- Wellen / Gegner ---
  enemyHpGrowth:     1.10,     // KANONISCH (gesenkt von 1.12 → DPS-Wachstum schlägt es sicher)
  countBase:         6,
  countSlope:        1.5,
  countCap:          40,
  bossInterval:      5,
  bossHpMult:        8,        // KANONISCH (eine Methode: Formel, kein fixer baseHp-Override)

  // --- In-Run-Turm-Upgrade (MULTIPLIKATIV — schlägt enemyHpGrowth) ---
  towerLevelDamageMult: 1.25,  // dmg = baseDamage * 1.25^level → geometrisches DPS-Wachstum
  towerMaxLevel:     8,

  // --- Tech-Punkte (KANONISCH: EINE Formel, DIV=2) ---
  // tp = floor(techBase * (besteRunde / techDiv)^techExp) + bosse*techBossBonus + (neueBestmarke ? techRecordBonus : 0)
  techBase:          3,
  techDiv:           2,
  techExp:           0.7,
  techBossBonus:     10,
  techRecordBonus:   5,

  // --- Skilltree-Passiv-Kosten ---
  passiveCostGrowth: 1.6,      // kostenStufe(n) = basisKosten * 1.6^n

  // --- Planet-HP ---
  planetHpBase:      120,
} as const;
```

**Aufgelöste Review-Konflikte (verbindlich):**

| Konflikt | Auflösung |
|---|---|
| Eco-Tick 1 Hz vs. 4 Hz | **1 Hz.** Alle „pro Tick"-Produktionswerte sind „pro Sekunde". |
| Kraftwerk-Gen 10 vs. 20 | **+20.** Turm-Draw **−8**. → 1 KW deckt ~2,5 Türme. Eine feste Pivot-Zahl. |
| Turm-Draw −4 / −5 / −6 / −8 | **−8** (Geschütz). |
| Geschütz-DPS 8 / 10 / 24 | `baseDamage 6 × fireRate 2 = 12 DPS` auf Level 0 (siehe `towers.ts` unten). |
| `enemyHpGrowth` 1.10 vs. 1.12 | **1.10.** |
| TP-Formel (4 Varianten) | **DIV=2-Variante**, kalibriert (siehe unten). |
| Boss-HP fix 4500 vs. ×8 vs. ×10 | **Formel ×8**, kein fixer Override. |
| Damage/Armor-Matrix (3 Versionen) | **Eine** kanonische Matrix (siehe 5.). MVP: kinetic vs. heavy = **0.6** (Tank zäh, aber mit Burst-Level-Up + Splash lösbar). |
| Strom-Cap-Wall unausweichlich | **Multiplikative In-Run-Achse** (`towerLevelDamageMult 1.25^level`) gibt geometrisches DPS-Wachstum, das `enemyHpGrowth 1.10` schlägt. Testbare Pacing-Invariante. |
| Online-Hardcap vs. Offline-Akkumulation | Online-Hardcap **gestrichen**; einziger Bremsmechanismus = `oreStorageCap` (wächst pro Welle, Soft-Pull). Offline-Progress ganz aus MVP (Phase 2). |

---

### 4.1 Wirtschaft & Strom

**Zwei Engpass-Achsen.** **Erz** = exponentiell teurer werdende Klassik-Währung (kann ich es bezahlen?). **Strom** = harter Run-Budget-Cap (kann ich es gleichzeitig betreiben?). Diese Doppelachse ist der strategische Kern.

**Ressourcen (MVP = 2):**

| Ressource | Rolle | Typ | Cap |
|---|---|---|---|
| **Erz** (`ore`) | Hauptwährung: baut/upgradet alles | Bestand (Lager) | `oreStorageCap` (wächst pro Welle) |
| **Strom** (`power`) | Betriebs-Engpass | Momentanbilanz (kein Lager) | — |

> **Forschung im MVP gestrichen** (Review-Konsens: „speist nichts Spürbares", widerspricht sich in der Doku, verwässert die Erz-vs-Strom-Doppelachse). Forschung kehrt in Phase 2 mit dem In-Run-Tech-Baum zurück. Tier-2-Gating im MVP läuft über Wellenzahl/Skilltree, nicht über eine eigene Ressource.

**Strom-Bilanz pro Eco-Tick (1 Hz):**

```
powerGen   = startPowerGen + Σ (Kraftwerk.gen)        * meta.powerGenMult
powerDraw  = Σ (powerCost aller AKTIVEN Verbraucher: Minen, Türme)
coverage   = powerDraw <= 0 ? 1 : clamp(powerGen / powerDraw, 0, 1)
```

- **Mindustry-Modell, kein Hard-Off:** Bei `coverage < 1` werden alle Verbraucher **proportional** gedrosselt. `coverage = 0.7` → Minen produzieren 70 %, Türme feuern mit 70 % DPS.
- **Drosselungs-Semantik (Review-Fix):** Gedrosselte Eco-Verbraucher ziehen auch **weniger Strom** (Draw sinkt mit), wodurch sich das System stabilisiert statt in eine Todesspirale zu laufen. Erzeuger (Kraftwerke) ziehen nie Strom.
- **Batterie im MVP gestrichen** (Review-Konsens: schwer kalibrierbar, fast wirkungslos). MVP: `coverage = min(1, gen/draw)` ohne Batterie-Term. Batterie kommt als eigenes v2-Gebäude.
- **Strom-Feedback ist Pflicht-sichtbar** (Review-Fix gegen „unsichtbarer USP"): Bei Defizit pulsiert der `PowerMeter` rot, ein permanenter Warn-Toast erscheint („Strom-Defizit: Türme feuern mit 70 %"), und gedrosselte Türme werden im Viewport sichtbar langsamer/dunkler.

**Eco → Defense Pivot:** Türme haben relativ hohen Draw (−8) gegenüber Kraftwerk-Gen (+20). 1 Kraftwerk deckt ~2,5 Türme. Mehr Verteidigung heißt zwangsläufig mehr/größere Kraftwerke. **Strom-Cap dauerhaft erhöhbar nur über den Skilltree** (`powerGenMult`) → zentrale Eco-vs-Defense-Spannung ist gleichzeitig Haupt-Belohnungsachse.

**Lager als Soft-Pull (Review-Fix):** Statt hartem „Akkumulation stoppt nach 1 Tank" wächst `oreStorageCap` pro überlebter Welle (`+120`). In frühen Runden erlaubt längeres Warten **mehr** Käufe → der Spieler entscheidet aktiv „noch warten für 2. Kraftwerk vs. jetzt riskieren". Bei vollem Lager stoppt die Produktion (sanfter Pull zu bauen statt warten), aber das Cap ist nie ein Trivialisierer.

**Bau-Phase-Spaß (Review-Fix gegen tote Bau-Phase):**
1. `costGrowth = 1.12` (gesenkt) → 3–5 sinnvolle Käufe pro Bau-Phase.
2. **Early-Start-Bonus INS MVP gezogen:** Wer früh startet (Bedrohungs-Einschätzung zeigt komfortablen Vorsprung), bekommt einen kleinen Erz-Bonus auf die nächste Bau-Phase → macht „Sicherheit vs. Tempo" zur echten Entscheidung.
3. Soft-Pull-Lager (oben) gibt einen Grund zu verweilen.

**TS-Interfaces (Eco):**

```ts
export type Num = number;
export type ResourceId = 'ore';

export interface ResourceState { ore: Num; }
export interface PowerState { gen: Num; draw: Num; coverage: Num; } // coverage abgeleitet, 0..1

export interface EcoMetaMods {
  oreMult: number;       // default 1.0
  powerGenMult: number;  // default 1.0
  startOreBonus: Num;
}

export interface EconomyState {
  resources: ResourceState;
  oreStorageCap: Num;    // wächst pro Welle
  power: PowerState;
  meta: EcoMetaMods;
}

// Reine Sim-Funktionen
export function tickEconomy(state: EconomyState, defs: BuildingRegistry, dt: number): void;
export function recomputePower(state: EconomyState, defs: BuildingRegistry): void;
export function getPowerCoverage(state: EconomyState): number; // 0..1, von Combat gelesen
export function nextCost(base: Num, growth: number, count: number): Num; // base * growth^count
```

---

### 4.2 Combat & Viewport

**Leitprinzip:** Bewusst leichtgewichtig, lesbar, planbar — kein Action-Game. Aber **mit einer echten Mikroentscheidung** pro Welle (Review-Fix gegen Zuschauer-Dead-Time).

**Designgrenzen:** Keine Pfadfindung, keine Gegner-Kollision. Gegner laufen auf parametrisierten radialen Bahnen `pos(progress) -> {x,y}` (`progress` 0 = Spawn am Rand, 1 = Planet erreicht). Sim ist 2D top-down: Planet im Ursprung `(0,0)`, Türme auf festen Slots im Ring. Sim liefert nur Zahlen + Events; aller Juice lebt im Render-Layer.

**Koordinaten:** `R_planet = 60`, `R_towers = 140`, `R_spawn = 1000` (Sim-Einheiten, abstrakt; Render skaliert in den Viewport).

```ts
// Bahn als reine Funktion (MVP: nur 'straight')
function pathPosition(spawnAngle: number, progress: number): { x: number; y: number } {
  const r = R_SPAWN + (R_PLANET - R_SPAWN) * progress;
  return { x: Math.cos(spawnAngle) * r, y: Math.sin(spawnAngle) * r };
}
```

**Speed-Einheit (Review-Fix):** Kanonisch in **`progress/s`**. `speed = 0.06` → ~16,7 s vom Rand bis zum Planeten. Welt-Einheiten/s-Angaben aus alten Tabellen sind reine Render-Skalierung.

**Die eine Echtzeit-Mikroentscheidung (MVP):** **Fokus-Markieren.** Klick auf einen Gegner → alle Türme fokussieren ihn für ~3 s (Cooldown 1× pro Welle). Rettet gegen Tank/Boss-Spikes, fühlt sich mächtig an, passt zum ruhigen Tempo. Das ist die einzige nötige In-Combat-Taktik im MVP — die 5 Targeting-Modi bleiben Datenschema, aber im MVP läuft jeder Turm auf **`first`** (Review-Fix: Modi-Umschaltung erst sinnvoll mit mehreren Türmen/Gegnern, spart UI- und Hotkey-Komplexität).

**Tempo-Schalter umgedreht (Review-Fix):** Standard-Combat läuft **2×**; Verlangsamung auf 1× ist die bewusste Wahl in spannenden Momenten. 4× zum Wegspulen trivialer Wellen.

**Turm-Feuer-Logik (Combat-Tick, fixed 1/30 s):**

```ts
function tickTower(t: Tower, def: TowerDef, ctx: SimContext) {
  if (!t.enabled) return;
  const effFireRate = def.fireRate * ctx.powerCoverage; // Strom-Drossel
  t.cooldown -= ctx.stepSeconds;
  if (t.cooldown > 0) return;
  const target = selectTarget(t, def, ctx); // 'first' im MVP; Fokus-Mark überschreibt
  if (!target) return;
  t.cooldown += 1 / Math.max(effFireRate, 1e-6); // additiv → stabile Feuerrate
  if (def.projectileSpeed === undefined) applyHit(target, t, def, ctx); // Hitscan
  else spawnProjectile(t, def, target, ctx);                            // ballistisch (Pool)
  ctx.emit({ type: 'tower_fired', towerId: t.id, targetId: target.id });
}
```

**Effektiver Schaden pro Treffer:**

```
dmg = def.baseDamage
    * BALANCE.towerLevelDamageMult ^ t.level   // MULTIPLIKATIV (1.25^level)
    * DAMAGE_MATRIX[def.damageType][enemy.armor]
    * meta.skilltreeDamageMult
```

**Projektile** als Objekt-Pool (kein `new` pro Schuss). Splash trifft alle im `splashRadius`. Fixed STEP + moderate `projectileSpeed` → kein Tunneling. Bei `targetId`-Tod: weiter geradeaus, Splash-on-arrival.

**Planet-HP:** Verlust-Kriterium. Gegner mit `progress >= 1` richtet `planetDamage` an und verschwindet. `planetHp <= 0` → Run-Ende. MVP: `planetHpBase = 120`, **kein Planet-Schild** (Schild erst als Skilltree-Unlock in Phase 2).

```ts
interface PlanetState { hp: number; maxHp: number; }
```

**Targeting-Determinismus:** Bei Gleichstand entscheidet niedrigste `enemy.id`. Arrays, nie `Set`/`Map` für geordnetes Durchlaufen.

---

### 4.3 Runden-/Run-Struktur

**RunState-Maschine** (Sim-Core hält Phase, UI liest kalt):

```ts
type RunPhase = 'BUILD' | 'COMBAT' | 'RUN_OVER' | 'RUN_WON';

interface RunState {
  planetId: string;            // 'p1'
  seed: number;                // Run-Seed (deterministisch)
  phase: RunPhase;
  currentRound: number;        // 1-basiert
  highestRoundCleared: number; // für Tech-Punkte
  planetHp: number;
  planetHpMax: number;
  bossesKilledThisRun: number;
  attemptIndex: number;        // wievielter Versuch (Festbeissen-Statistik)
}
```

```
   Run-Start
   ──────────► BUILD ──[startWave()]──► COMBAT ──onWaveCleared──► BUILD (round++)
                ▲                          │
                │                  planetHp≤0 │ Endboss besiegt?
                │                          ▼            ▼ ja
        nächste Runde              RUN_OVER          RUN_WON
                                  (Tech-Punkte)   (Tech-Punkte + Planet-Unlock)
```

**Bau-Phase:** zeitlos by default (keine Welle ohne Knopfdruck). Nächste Welle einsehbar (Vorschau-Icons + Bedrohungs-Einschätzung). Eco tickt.

**Welle-Trigger MVP:** **nur Knopf** (`BUTTON_ONLY`). Auto-Timer **gestrichen** (Review: widerspricht dem anwesend-zu-spielenden Combat-Kerngefühl — nicht „später", sondern raus). `startWave()` erzeugt die `WaveComposition` deterministisch aus `seed + currentRound`; die Bau-Phasen-Vorschau ruft **dieselbe** Funktion read-only auf (garantiert identisch zur real gespawnten Welle).

**Eskalation:**

```
enemyHpMul(round)  = BALANCE.enemyHpGrowth ^ (round - 1)        // 1.10
enemyCount(round)  = min(countCap, countBase + floor((round-1)*countSlope))
```

**Pacing-Invariante (testbar):** erreichbares DPS-Wachstum pro Runde (durch leistbare Käufe + multiplikative Turm-Level unter Strom-Cap) **>** `enemyHpGrowth`. Per Vitest verifiziert, nicht geraten.

**Boss-Kadenz:** alle 5 Runden (`bossInterval`) — generische Regel; **Terra-1 ist handgesetzt mit dem einzigen Boss auf Welle 10** (Welle 5 ist ein Brocken-Spike, kein Boss). Boss = neue **telegraphierte Mechanik**, nicht HP×10. `bossHp = bossBaseHp * enemyHpMul(round) * bossHpMult(8)`. Boss CC-immun. Telegraph 1,5 s vor jedem Effekt.

> **MVP-Boss-Mechanik (Review-Fix, KRITISCH):** Statt Add-Spawns (verlangt Splash, der im Single-Turm-Slice fehlt) ist die MVP-Boss-Mechanik eine **reine Schild-Phase** — der Boss wird ~2 s unverwundbar (1,5 s vorher Telegraph-Glow). Mit Single-Target + Fokus-Mark + multiplikativem Level-Up lösbar. Regel „kein Gegner ohne erreichbaren Counter" eingehalten. Der Artillerie-Turm (Splash) ist aber **im MVP enthalten** (siehe Scope-Auflösung 9.), wodurch auch ein späterer Add-Boss machbar wird.

**Run-Ende-Bedingungen:**

| Bedingung | Übergang | Folge |
|---|---|---|
| `planetHp ≤ 0` | COMBAT → RUN_OVER | Tech-Punkte, `attemptIndex++` |
| Endboss besiegt | COMBAT → RUN_WON | Tech-Punkte (inkl. Sieg-Bonus) + nächster Planet |
| Aufgeben-Knopf | BUILD/COMBAT → RUN_OVER | Tech-Punkte nach erreichter Runde, kein Strafabzug |

**Roguelite-Vertrag:** Jeder beendete Run gibt Tech-Punkte (auch verloren/abgebrochen), gekoppelt an `highestRoundCleared` + Boss-Kills. Der erste Boss darf den ersten Run absichtlich killen.

---

### 4.4 Meta & Skilltree

**Tech-Punkte (einzige permanente Währung), KANONISCHE Formel:**

```ts
// tp = floor(techBase * (besteRunde / techDiv)^techExp) + bosse*techBossBonus + (neueBestmarke ? techRecordBonus : 0)
function techPunkte(besteRunde: number, bosseBesiegt: number, neueBestmarke: boolean): number {
  const { techBase, techDiv, techExp, techBossBonus, techRecordBonus } = BALANCE;
  const basis = Math.floor(techBase * Math.pow(besteRunde / techDiv, techExp)); // BASE=3, DIV=2, EXP=0.7
  return basis + bosseBesiegt * techBossBonus + (neueBestmarke ? techRecordBonus : 0);
}
```

Beispiel-Erträge (kalibriert gegen Ziel „1. Sieg in 2–4 Versuchen", siehe Risiken):

| Erreichte Runde | Basis `floor(3·(r/2)^0.7)` | + Bosse | + Sieg-Bestmarke | TP gesamt (Bsp.) |
|---|---|---|---|---|
| 5 (1 Boss, dann tot) | 6 | 10 | 5 | **21** |
| 7 (1 Boss) | 8 | 10 | 5 | **23** |
| 10 (Endboss, Sieg) | 10 | 20 | 5 | **35** |

> 3 Fehlversuche (~21 TP) ≈ 63 TP — deckt 1 Unlock (Laser-Emitter, billiger gemacht, siehe unten) + die ersten, **front-geladenen** Passiv-Stufen. Per Balance-Sim final zu verifizieren. *(Die Beispielzeilen oben illustrieren die Formel mit generischen Eingaben; auf Terra-1 fällt der erste Boss-Bonus erst bei Welle 10, daher ist die echte TP-Kurve pro Fehlversuch im M5-Tuning zu kalibrieren.)*

**Was resettet vs. bleibt:**

| Bleibt (Save) | Resettet pro Run |
|---|---|
| Tech-Punkte, gekaufte Skill-Knoten | In-Run-Erz, Strom-Bilanz |
| Freigeschaltete Gebäude/Waffen | Alle gebauten Gebäude/Türme |
| Freigeschaltete Planeten, Bestmarken | Aktuelle Runde, Run-Seed |
| Fehlversuch-Zähler pro Planet, Settings | Fokus-/Targeting-Zustand |

**Branches (3) + Knoten-Typen (2 im MVP):**

```ts
type KnotenTyp = 'unlock' | 'passiv'; // 'schluessel' = POST-MVP (nur Kommentar-Stub)
type Branch = 'eco' | 'defense' | 'survival';

interface SkilltreeKnoten {
  id: string;
  branch: Branch;
  typ: KnotenTyp;
  name: string;              // deutsch, kein "KI"/Insider-Sprech
  beschreibung: string;
  kostenTp: number;          // unlock: Festpreis; passiv: Basispreis
  voraussetzungen: string[];
  unlocks?: { gebaeudeId?: string };          // typ 'unlock'
  maxStufe?: number;                          // typ 'passiv'
  effekt?: { stat: PassivStat; proStufe: number; modus: 'prozent' | 'flat' };
}
type PassivStat = 'stromCap' | 'erzRate' | 'turmSchaden' | 'planetHp' | 'startErz' | 'techGewinn';
```

- **`unlock`** (horizontal): einmalig, schaltet neues Gebäude/Waffe in den Bau-Pool → Run wird **breiter**. Trägt die qualitative Tiefe.
- **`passiv`** (vertikal): mehrstufig. **Front-geladen (Review-Fix):** erste Stufe jedes Knotens spürbar groß, danach abflachend.

**Front-Loading-Regel (Review-Fix gegen unsichtbaren Fortschritt):** Erste Passiv-Stufe = **+25–40 %**, Folgestufen flachen ab (diminishing). Der erste Kauf MUSS den nächsten Run sichtbar verändern.

**Passiv-Kostenkurve:** `kostenStufe(n) = basisKosten * 1.6^n`. Multiplikatoren kombinieren **multiplikativ** (`mGesamt = Π(1 + bonus_i)`).

**MVP-Knoten (kanonisch — löst die ~5/~8/3-4-Divergenz auf):**

*Unlock-Knoten (3):*

| ID | Branch | Name | Kosten | Voraussetzung | Schaltet frei |
|---|---|---|---|---|---|
| `u_artillerie` | defense | Artilleriegeschütz | 14 TP | — | Splash-Turm (Anti-Schwarm) |
| `u_laser` | defense | Laser-Emitter | 12 TP | — | Laser (Anti-Brocken/Schild-Phase) |
| `u_kraftwerk2` | eco | Fusionskraftwerk | 16 TP | — | Kraftwerk-Tier 2 (mehr Strom) |

*Passiv-Knoten (5), front-geladen:*

| ID | Branch | Name | Basispreis | maxStufe | Effekt Stufe 1 → danach |
|---|---|---|---|---|---|
| `p_stromcap` | eco | Netzausbau | 4 TP | 4 | +30 % Strom-Cap → +12 %/Folgestufe |
| `p_erzrate` | eco | Bohrtechnik | 3 TP | 4 | +25 % Erz-Rate → +10 %/Folgestufe |
| `p_turmschaden` | defense | Munitionsforschung | 5 TP | 4 | +30 % Turm-Schaden → +10 %/Folgestufe |
| `p_planethp` | survival | Schildgenerator | 6 TP | 3 | +35 % Planet-HP → +15 %/Folgestufe |
| `p_starterz` | survival | Vorrats-Depot | 4 TP | 3 | +50 Start-Erz (flat) |

> `u_laser` und `u_artillerie` sind die qualitativen „noch ein Versuch"-Treiber. Beide billig + ohne Voraussetzung → nach ~1 Run erreichbar.

**Respec (Review-Fix gegen „kauf alles, respec situativ"):** Im MVP sind **nur Unlock-Knoten frei respecbar**; Passiv-Stufen sind **nicht respecbar** (oder nur gegen TP-Kosten). So haben Verteilungsentscheidungen Gewicht und der „zwei getrennte Achsen gegen Power-Creep"-Anspruch bleibt intakt. Respec nur in der Bau-Phase / im Meta-Menü, nie während einer Welle.

**Festbeissen-Trostbonus:** Komplett **POST-MVP** (Review-Konsens: doppelt definiert, verwässert die TP-Kalibrierung). Wenn die TP-Formel sauber „2–4 Versuche zum Sieg" liefert, braucht das MVP keinen Zusatzbonus.

**Planet-Freischaltung:** Endboss besiegt → nächster Planet permanent frei. Bestmarken/Fehlversuche pro Planet getrennt. Jeder neue Planet führt **1 neues System** ein (Paperclips-Prinzip) — POST-MVP, der Slice hat genau 1 Planet.

```ts
interface PlanetFortschritt {
  planetId: string; freigeschaltet: boolean;
  bestmarkeRunde: number; fehlversuche: number; geschafft: boolean;
}
interface SkilltreeState {
  techPunkteKonto: number;
  gekaufteKnoten: Record<string, number>; // knotenId → Stufe (1 bei unlock)
}
```

---

## 5. Content-Kataloge

### 5.1 Counter-Matrix (kanonisch — `content/damageMatrix.ts`)

> EINE Matrix für das ganze Projekt. Anti-Air ist im MVP **gestrichen** (Flying + Flak gemeinsam raus, Review-Konsens), daher keine `air`-Spalte/`flak`-Typ im MVP. `DamageType` bleibt `'kinetic' | 'explosive' | 'energy'` (passt zum Code-Architektur-Union-Typ). Resistenz statt Immunität (`0.5`–`1.5`).

| Schaden ↓ \ Armor → | `light` | `heavy` | `shield` |
|---|---|---|---|
| **kinetic** (Geschütz) | 1.5 | **0.6** | 0.5 |
| **explosive** (Artillerie) | 1.2 | 1.5 | 0.4 |
| **energy** (Laser) | 0.8 | 0.7 | **2.0** |

`shield`-Gegner erscheinen erst, wenn `u_laser` erreichbar ist. (`air`/`flak`/Flying → Phase 2, gemeinsam.)

### 5.2 Gebäude & Waffen (`content/buildings.ts`, `content/towers.ts`)

```ts
export type DamageType = 'kinetic' | 'explosive' | 'energy';
export type ArmorType  = 'light' | 'heavy' | 'shield';
export type TargetingMode = 'first' | 'last' | 'strongest' | 'weakest' | 'closest'; // MVP nutzt nur 'first'

export interface BuildingDef {
  id: string;
  nameDe: string;
  category: 'eco' | 'weapon';
  baseCost: Num;            // Erz
  costGrowth: number;       // = BALANCE.costGrowth
  powerGen: number;         // >0 nur Kraftwerke
  powerCost: number;        // >0 Verbraucher
  buildLimit: number;       // 0 = unbegrenzt (Slot-Cap greift separat)
  maxLevel: number;
  unlockNode: string | null;
  mvp: boolean;
}
export interface EcoBuildingDef extends BuildingDef {
  category: 'eco';
  producesOrePerTick?: Num; // pro Eco-Tick = pro Sekunde
}
export interface WeaponDef extends BuildingDef {
  category: 'weapon';
  damageType: DamageType;
  baseDamage: Num;          // pro Schuss, Level 0
  fireRate: number;         // Schuss/s
  range: number;            // Sim-Einheiten
  splashRadius: number;     // 0 = Single-Target
  projectileSpeed?: number; // undefined = Hitscan
  defaultTargeting: TargetingMode; // 'first' im MVP
}
```

**Kanonische MVP-Defs:**

| ID | Name (DE) | Kategorie | baseCost | powerGen | powerCost | Effekt | MVP |
|---|---|---|---|---|---|---|---|
| `kraftwerk` | Kraftwerk | eco | 50 | **+20** | 0 | Strom-Cap | ✅ |
| `erz_sammler` | Erz-Sammler | eco | 30 | 0 | **−4** | +2 Erz/s (Lvl 1, ×Level) | ✅ |
| `turret_kinetic` | Geschützturm | weapon | 80 | 0 | **−8** | kinetic, baseDamage 6, fireRate 2 (= 12 DPS Lvl 0), range 220, Single-Target | ✅ |
| `artillery` | Artilleriegeschütz | weapon | 130 | 0 | **−14** | explosive, baseDamage 18, fireRate 0.6, range 200, splash 60 | ✅ (via `u_artillerie`) |
| `laser` | Laser-Emitter | weapon | 150 | 0 | **−12** | energy, baseDamage 9, fireRate 1.5, range 200, Hitscan | ✅ (via `u_laser`) |

**Kostenformel (geschlossen, testbar):**
```
cost(n)      = baseCost * costGrowth^n
totalCost(k) = baseCost * costGrowth^n * (costGrowth^k - 1) / (costGrowth - 1)   // Bulk-Buy v2
```

**Pivot-Sanity-Check:** Sockel (`startPowerGen 20`) deckt z. B. 1 Sammler (−4) + 1 Geschütz (−8) = 12 → coverage 1.0. Drittes Gebäude (Geschütz, −8 → 20 Draw) → coverage 1.0 noch okay; viertes (−8 → 28) → coverage = 20/28 ≈ 0.71 → spürbare Drosselung → 2. Kraftwerk nötig. Pivot bei ~Welle 3–4.

> **Slot-Cap (Review-Fix gegen fehlenden zweiten Cap):** `PlanetDef.slotCount` definiert die Anzahl Ring-Slots. Terra-1: **`slotCount = 12`**. **Kraftwerke belegen KEINEN Ring-Slot** (eigene Eco-Plätze, unbegrenzt) — nur Türme + Eco-Sammler konkurrieren um Slots. Damit ist die Pivot-Rechnung verifizierbar.

### 5.3 Gegner & Bosse (`content/enemies.ts`)

```ts
export interface EnemyDef {
  id: string;
  nameDe: string;
  baseHp: Num;              // HP auf Runde 1 (Skalierung via Formel, nicht hier)
  speed: number;           // progress/s (KANONISCH)
  armor: ArmorType;
  planetDamage: Num;
  reward: Num;             // In-Run-Erz pro Kill
  // Render-only:
  shape: 'circle' | 'triangle' | 'hexagon' | 'cluster';
  colorVar: string;
  clusterCount?: number;
}
export interface BossDef extends Omit<EnemyDef, 'reward'> {
  isBoss: true;
  ability: { kind: 'shieldPhase'; durationS: number };  // MVP: nur Schild-Phase
  telegraphS: number;      // 1.5
  ccImmune: true;
  techBonus: number;
}
export interface WaveDef {
  index: number;
  isBoss: boolean;
  spawns: { enemyId: string; count: number; spacingS: number; startDelayS: number }[];
  bossId?: string;
  previewIcons: string[];  // enemyIds für Bau-Phasen-Vorschau
}
```

**Kanonisches MVP-Roster (3 Gegner + 1 Boss):**

| ID | Name (DE) | baseHp | speed (progress/s) | armor | reward | planetDamage | Form/Farbe | Lehrt |
|---|---|---|---|---|---|---|---|---|
| `laeufer` | Läufer | 50 | 0.06 | light | 4 | 1 | Kreis, blau | Grundtakt |
| `schwarm` | Schwarm | 12 (je) | 0.08 | light | 1 (je) | 1 (je) | Cluster, grün | Splash zwingend |
| `brocken` | Brocken | 320 | 0.035 | heavy | 14 | 3 | Hexagon, rot | Burst/Level-Up |
| `boss_zitadelle` | Zitadelle (Endboss) | 600 | 0.03 | heavy | — | 999 | 8-Eck, rot | Schild-Phase |

> Boss-HP zur Laufzeit: `600 * enemyHpMul(10) * bossHpMult(8)` — auf real erreichbare DPS bei Runde 10 kalibriert (per Balance-Sim final getunt). Schild-Phase reduziert keine DPS-Anforderung künstlich, ist aber mit `u_artillerie`/`u_laser` + Fokus-Mark + multiplikativem Level-Up schaffbar.

**Wellen-Komposition Terra-1 (10 Runden, handgesetzt, Lehrkurve):**

| Runde | `enemyHpMul` | Komposition | Lehrziel |
|---|---|---|---|
| 1–2 | 1.00 / 1.10 | nur Läufer (6 → 8) | Grundloop, erstes Geschütz |
| 3 | 1.21 | nur Schwarm | Splash lernen (Artillerie sinnvoll) |
| 4 | 1.33 | Läufer + Schwarm | kombinieren |
| **5** | 1.46 | **Mini-Boss-Spike:** 1 Brocken | Burst/Level-Up lernen |
| 6 | 1.61 | Schwarm-Cluster + Läufer | Splash zwingend |
| 7 | 1.77 | nur Brocken (2) | Anti-Tank-Burst |
| 8 | 1.95 | Brocken + Schwarm | Tank vs. Swarm gleichzeitig |
| 9 | 2.14 | Läufer + Schwarm + Brocken | Druck-Mix |
| **10** | 2.36 | **ENDBOSS Zitadelle** + Mix-Adds | Schild-Phase + alles |

> **Erste-Minute-Wahl (Review-Verbesserung):** Schon Welle 1 gibt eine winzige Entscheidung: 2 Slot-Positionen mit unterschiedlicher Reichweiten-Abdeckung, damit die erste Minute nicht nach Tutorial-Gängelung schmeckt.

> **Heiler/Tarnung/Radar-Turm** (alte Skizzen #7/#8): nicht weiter ausspezifiziert bis MVP steht — reine v2+-Reserve.

---

## 6. UI/UX & Kurzgesagt-Visualsystem

**Designprinzipien:** Lesbarkeit vor Spektakel · eine visuelle Sprache (flache Vektorformen) · Strom immer sichtbar · Entscheidungen brauchen Zahlen (jeder Bau-Button zeigt Kosten + Stromdelta + Payback) · durchgängig Deutsch (Tsd./Mio., Dezimal-Komma).

**Farbpalette (`src/ui/theme.ts`, CSS-Var + TS-Konstante, weil Canvas keine CSS-Vars liest):**

```ts
export const PALETTE = {
  bgDeep: '#0B1026', bgPanel: '#141A33', bgPanelHi: '#1E2748', stroke: '#2C3760',
  textHi: '#F2F5FF', textMid: '#9AA6D4', textLow: '#5A6699',
  power: '#FFC53D',   // STROM = immer Gelb
  ore:   '#4DD0C2',   // ERZ = immer Türkis
  techPoint: '#FF7A59',
  good: '#3DDC84', warn: '#FFB020', bad: '#FF4D5E', shield: '#5AB0FF',
  enemyLaeufer: '#5AB0FF', enemySchwarm: '#B5E853', enemyBrocken: '#7A8AB0', boss: '#FF4D5E',
} as const;
```

**Regel:** Strom IMMER Gelb, Erz IMMER Türkis — periphere Wahrnehmung („das Gelbe wird knapp").

**Typografie:** Nunito Sans, 6-Stufen-Skala (display 34 / h1 24 / h2 18 / body 15 / small 13 / micro 11), Zahlen `tabular-nums` + `font-weight: 800`.

**Screen-Inventar:**

| Screen | Zweck | MVP? |
|---|---|---|
| Run-Screen (Hybrid) | Eco/Bau + Live-Combat-Viewport | ✅ |
| Planet-Auswahl | Planet wählen, Festbeissen-Fortschritt | ✅ (1 spielbar, 2–3 gesperrt als Teaser) |
| Skilltree-Screen | Tech-Punkte ausgeben | ✅ (klein) |
| Run-Summary | TP-Ertrag + Vorschau | ✅ |
| Settings | Audio, Tempo, Save-Export/Import | ✅ (reduziert) |
| Hauptmenü | Einstieg | ✅ (minimal) |
| Onboarding-Overlay, Codex | — | v2 |

**Run-Screen-Layout (Desktop, Basis 1600×900, min 1280):** Top-Bar (Ressourcen + `PowerMeter` prominent) · Center Combat-Viewport (Canvas) · rechte Bau-Leiste (BuildCards mit Kosten/Stromdelta/Payback, gesperrte Items ausgegraut mit Schloss, max. 2 sichtbar) · untere Leiste (`WavePreviewStrip` mit Icons + **Bedrohungs-Einschätzung-Balken**, „Welle starten"-Knopf, Tempo 1×/2×/4× mit Default 2×).

**Interaktion:** BuildCard → Geist-Vorschau auf Slots → platzieren. Turm-Klick → Upgrade-Panel (nächste Stufe, An/Aus-Toggle für Strom). Gegner-Klick im Combat → Fokus-Mark (~3 s, 1×/Welle).

**Run-Summary (wichtigster Retention-Hebel):** drei Zahlen-Kacheln (Runden-TP / Boss-TP / Neue-Bestmarke), Gesamt mit Delta zum letzten Run, **konkrete Vorschau** des nächsten Starts („+30 % Start-Strom", „Laser-Emitter verfügbar"). Reset als Belohnung framen.

**Zahlenformat (`src/ui/format.ts`, Vitest-testbar):** deutsche Suffixe `['', ' Tsd.', ' Mio.', ' Mrd.', ' Bio.']`, Dezimal-Komma, `fmt(1500000) === '1,5 Mio.'`, `fmtRate` mit Vorzeichen. Strom als ganze Zahlen (`142/180`, keine Suffixe).

**MVP-Juice (billig, hohe Wirkung):** Treffer-Flash, Death-Pop (4–6 Polygon-Scherben), Strom-Defizit-Pulsieren + roter Vignette-Rand + Warn-Toast, Boss-Telegraph-Glow, Eco-Tick-NumberFlash, Kauf-Glow. Kein Partikelsystem, kein Hit-Stop, keine Interpolation (→ Phase 3). Aller Juice im Render-Layer, Sim liefert nur Events.

**Hotkeys MVP (reduziert, Review-Fix):** **Leertaste** (Welle starten), **+/−** (Tempo), **P/Esc** (Pause/schließen). Volles Q/W/E/R/T-Targeting-Set → Phase 2 (kein Nutzen bei `first`-only).

**UI→Sim Commands (typisiert, kein direkter State-Mutate):**

```ts
type UICommand =
  | { t: 'build'; buildingId: string; slot: number }
  | { t: 'upgrade'; towerId: string }
  | { t: 'toggleTower'; towerId: string; on: boolean }
  | { t: 'focusMark'; enemyId: number }     // die MVP-Mikroentscheidung
  | { t: 'startWave' }
  | { t: 'surrender' }
  | { t: 'setSpeed'; mult: 1 | 2 | 4 }
  | { t: 'buySkill'; nodeId: string }
  | { t: 'respec' }
  | { t: 'selectPlanet'; planetId: string };
```

---

## 7. Persistence / Save / Offline

> **Radikal gekürzt für MVP (Review-Konsens):** Nur Meta wird gespeichert. **Kein** Run-Resume, **kein** Offline-Progress, **keine** Migrations-Kette im MVP (erst wenn `schemaVersion` erstmals steigt). Ein Run dauert Minuten; Reload = Run verloren ist roguelite-konform.

**MVP-Save-Schema:**

```ts
const SAVE_KEY = 'planet_defense_save_v1';
const SCHEMA_VERSION = 1;

interface SaveState {
  schemaVersion: number;     // Pflicht
  savedAt: number;
  meta: {
    techPoints: number;
    skillNodes: Record<string, number>;   // nodeId → Stufe
    unlockedPlanets: string[];
    clearedPlanets: string[];
    bestRound: Record<string, number>;
    failedAttempts: Record<string, number>;
  };
  settings: { masterVolume: number; sfxVolume: number; musicVolume: number;
              combatTickHz: 30; reducedMotion: boolean; locale: 'de'; };
}
```

**Laden:** `schemaVersion` lesen; ist sie unbekannt/fehlend → frischer Default-Save (kein Crash, Warnung mit Roh-String-Export zur Rettung). `mergeDefaults` füllt fehlende Felder defensiv.

**Autosave:** throttled, **nur in der Bau-Phase** + bei Schlüssel-Events (Run-Ende, Skill-Kauf, Planet-Freischaltung, `visibilitychange`, `beforeunload`). Nie pro Frame (dirty-Flag). `localStorage.setItem` immer in `try/catch` (Quota/Privatmodus → einmalige UI-Warnung statt Crash).

**Reset-Vertrag (Review-Klarstellung):** „In-Run-State wird nicht gespeichert" gilt vollständig im MVP — auch kein Bau-Layout. Der widersprüchliche `ActiveRunSnapshot` ist **Phase-2-Material**.

**POST-MVP:** Run-Resume (`seed + waveIndex + layout`, deterministisches Vorspulen), Offline-Progress (Closed-Form, 4-h-Cap, Banner), Migrations-Kette + `mergeDefaults`-Maschinerie bei erster Version-Erhöhung, Base64-Export/Import mit Bestätigungsdialog, Backup-Slot + CRC, `break_infinity`-Serializer-Swap.

---

## 8. Code-Architektur, Module, Datenfluss, Tests

**Drei-Schicht-Trennung:** headless Sim-Core (Single Source of Truth) · reaktive Svelte-5-UI für kalte Werte · Canvas2D-Renderer der heißen Sim-State pro Frame direkt liest. Content als typisierte Daten-Configs.

**Ordnerstruktur (MVP-Schnitt; `[v2]` = später):**

```
PlanetDefense/
├─ src/
│  ├─ sim/                      # headless: KEIN Svelte-/DOM-Import
│  │  ├─ core/  GameState.ts · engine.ts · loop.ts · rng.ts · ids.ts
│  │  ├─ systems/ ecoSystem.ts · buildSystem.ts · waveSystem.ts
│  │  │           combatSystem.ts · enemySystem.ts · runEndSystem.ts
│  │  ├─ commands/ Command.ts · dispatch.ts
│  │  ├─ formulas.ts            # cost, hp, techPoints, format (rein)
│  │  └─ index.ts
│  ├─ content/  types.ts · buildings.ts · towers.ts · enemies.ts
│  │            damageMatrix.ts · planets.ts · skilltree.ts · balance.ts · registry.ts
│  ├─ ui/  stores/(gameStore·metaStore·uiStore).svelte.ts
│  │       panels/(ResourceBar·BuildPanel·TowerInspector·WaveControl
│  │               ·SkillTreePanel·RunEndScreen).svelte · App.svelte · commandBridge.ts
│  ├─ render/  Canvas2DRenderer.ts · layers/(background·entity·fx).ts · pool.ts · shapes.ts
│  ├─ persistence/  schema.ts · storage.ts          # [v2] migrations.ts · exportImport.ts
│  └─ app/  GameClock.ts · bootstrap.ts · config.ts
├─ tests/  sim/ · content/ · balance/               # [v2] persistence/
└─ vite.config.ts · package.json
```

> **Render entschlackt (Review-Fix):** **Kein** abstraktes `Renderer`-Interface im MVP — direkt gegen Canvas2D zeichnen (PixiJS-Swap ist „falls jemals", in 1 Tag nachrüstbar, kein Lock-in). **Keine** Interpolation (bei langsamen radialen Bahnen optisch vernachlässigbar). Objekt-Pool **nur** für Projektile; Partikel-Pool erst wenn Partikel existieren (Phase 3).

**Game-Loop (ein rAF-Master, zwei Tick-Raten):**

```ts
// app/config.ts
export const COMBAT_STEP = BALANCE.COMBAT_STEP_S; // 1/30
export const ECO_STEP    = BALANCE.ECO_STEP_S;    // 1.0
export const MAX_STEPS   = BALANCE.MAX_STEPS;     // 5
export const SNAPSHOT_HZ = BALANCE.SNAPSHOT_HZ;   // 8
```

```ts
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, MAX_STEPS * COMBAT_STEP); last = now;
  accEco += dt;
  while (accEco >= ECO_STEP) { ecoSystem(state, ECO_STEP); accEco -= ECO_STEP; }   // immer
  if (state.phase === 'COMBAT') {
    accCombat += dt; let n = 0;
    while (accCombat >= COMBAT_STEP && n++ < MAX_STEPS) { engine.tick(state, COMBAT_STEP); accCombat -= COMBAT_STEP; }
  }
  renderer.draw(state);                                  // heiß, direkt, jeden Frame
  if (now - lastSnap > 1000 / SNAPSHOT_HZ) { gameStore.pushSnapshot(buildSnapshot(state)); lastSnap = now; }
  requestAnimationFrame(frame);
}
```

**Datenfluss:** Zwei Lesepfade auf denselben State — **heiß** (Renderer, jeden Frame, direkt am Reaktivsystem vorbei) und **kalt** (Snapshot, 8×/s, durch Svelte-Runes). Beide nur lesend. Geschrieben wird nur durch `engine.tick` (Zeit) und `applyCommand` (Spieler).

**Command-Pattern (zentrale Validierung + Determinismus):**

```ts
export function applyCommand(state: GameState, cmd: Command): CommandResult {
  switch (cmd.t) {
    case 'build': {
      const def = registry.building(cmd.buildingId);
      if (state.phase !== 'BUILD')                  return fail('wrongPhase');
      if (state.ore < def.baseCost)                 return fail('notEnoughOre');
      if (def.category !== 'eco' && !slotFree(state, cmd.slot)) return fail('noFreeSlot');
      // KEIN harter Strom-Block: Über-Draw ist erlaubt und senkt nur die Coverage (Mindustry-Soft-Throttle, siehe 4.1).
      // ... mutiere State, ok()
    }
    // ...
  }
}
```

**Determinismus (Review-reduziert):** fixed-timestep + **EIN** seedbarer PRNG (`mulberry32`) + „kein `Math.random()`/`Date.now()` im Core"-Disziplin (Lint-Regel). **Getrennte RNG-Streams gestrichen** im MVP — nur Spawn-Logik zieht RNG; Stream-Trennung nachrüsten, sobald ein zweiter Konsument existiert. Golden-Test schlank: ein Test, fixer Seed, End-State-Hash.

**Test-Strategie (Vitest):**

1. **Formel-Tests:** `cost(0)===base`, geom. Summe, `fmt(1_500_000)==='1,5 Mio.'`.
2. **Command-Tests:** `build` bei zu wenig Erz → `{ok:false, reason:'notEnoughOre'}`; `build` auf belegtem Slot → `noFreeSlot`; State unverändert. (Über-Draw wird NICHT geblockt — Strom-Defizit drosselt nur die Coverage.)
3. **Golden-/Determinismus-Test:** fixer Seed + Command-Sequenz → End-State-Hash gegen Snapshot; zwei Läufe byte-identisch.
4. **Balance-Smoke-Test:** „Spieler mit Skilltree-Stand X kommt bis Runde Y±2"; verifiziert Pacing-Invariante `DPS-Wachstum > enemyHpGrowth`. Bot-Policy als **simpelste Heuristik** markiert (nicht als Auto-Balance-Orakel überverkauft).

MVP-Minimum: Ebenen 1–3 + ein Balance-Smoke-Test. Migrations-Tests erst wenn `schemaVersion` steigt. Render/Svelte-Komponenten nicht per Vitest (dünn, mutieren keinen State).

---

## 9. MVP / Vertical-Slice (verbindliche Scope-Tabelle)

> **EINE Wahrheit** (löst die drei divergierenden MVP-Listen auf). Bei künftigen Änderungen nur diese Tabelle pflegen.

| Bereich | MVP-Inhalt |
|---|---|
| **Planet** | 1 (`p1` / „Terra-1"), 12 Ring-Slots, 10 handgesetzte Runden |
| **Ressourcen** | Erz (Stock) + Strom (Bilanz). **Keine Forschung.** **Keine Batterie.** |
| **Eco-Gebäude** | Kraftwerk, Erz-Sammler |
| **Türme** | Geschütz (Start) + Artillerie (via `u_artillerie`) + Laser (via `u_laser`) → **echtes Counter-Gefühl** (Splash vs. Schwarm, Energy vs. Schild-Phase) |
| **Gegner** | Läufer, Schwarm, Brocken (3) |
| **Boss** | 1 Endboss „Zitadelle" mit telegraphierter **Schild-Phase** (Single-Target-lösbar) |
| **Wellen** | 10, Lehrkurve (sortenrein → Mischwellen), Boss = Welle 10, Vorschau + Bedrohungs-Einschätzung |
| **Combat-Taktik** | Auto-Feuer (`first`-Targeting) + **1 Fokus-Mark pro Welle** (die Mikroentscheidung) |
| **Strom** | Coverage-Drosselung proportional, **deutlich sichtbares Feedback** |
| **In-Run-Upgrade** | Multiplikatives Turm-Level (`1.25^level`) — die DPS-Achse, die HP-Wachstum schlägt |
| **Meta** | TP-Formel (DIV=2), 3 Unlock + 5 Passiv (front-geladen), Respec nur für Unlocks |
| **Run-Ende-Screen** | 3-Term-Aufschlüsselung + Delta + konkrete Vorschau |
| **Save** | nur Meta, `schemaVersion`, Autosave throttled. Kein Resume, kein Offline, keine Migrations-Kette. |
| **UI** | Run-Screen-Hybrid, Planet-Auswahl, kleiner Skilltree, Run-Summary, Settings (reduziert) |
| **Visuals** | Kurzgesagt-Designsystem (Palette/Formen/Typo), deutsche Zahlenformatierung, MVP-Juice |
| **Render** | Canvas2D direkt (kein Interface, keine Interpolation), Projektil-Pool |
| **Determinismus** | fixed-timestep + 1 PRNG (mulberry32) + 1 Golden-Test |
| **Hotkeys** | Leertaste, +/−, P/Esc |
| **Tempo** | Default 2×, 1× als bewusste Verlangsamung, 4× zum Spulen |

**Bewusst NICHT im MVP:** Forschung · Batterie · Flying + Flak · Schild-Gegner (Shielded als Gegnerklasse; Schild-**Phase** des Bosses ist drin) · Heiler/Tarnung/Radar · 4 weitere Türme (Frost, Flak, Railgun, Auren) · Targeting-Modi-Umschaltung · Schlüssel-/Run-Modifier-Knoten · Festbeissen-Trostbonus · Auto-Timer · Run-Resume · Offline-Progress · Migrations-Kette · Base64-Export/Import · Renderer-Interface/PixiJS · Interpolation · getrennte RNG-Streams · `break_infinity` · volles Hotkey-Set.

---

## 10. Phasen-Roadmap

> Grobe Zeitschätzungen für Solo-Dev (Review-Verbesserung), Richtwert.

### Phase 0 — Fundament (~3–4 Tage)
**M0:** Sim-Core-Skelett mit fixed-timestep-Loop, `mulberry32`-PRNG, leerer State, ein Vitest-Golden-Test grün. Direktes Canvas2D zeichnet einen Kreis aus Sim-State. Save-Stub mit `schemaVersion`.
*Abnahme:* Loop läuft deterministisch, Test reproduziert End-State-Hash.

### Phase 1 — Vertical-Slice = MVP (~5–7 Wochen)
- **M1 – Eco-Phase (~1 Woche):** Erz + Strom-Bilanz, Kraftwerk/Sammler baubar/upgradebar, Kosten-/Produktionskurven, Soft-Pull-Lager, Strom-Coverage berechnet (noch ohne Combat-Wirkung). *Abnahme:* Eco planbar, Strom-Cap spürbar, 3–5 Käufe/Bauphase.
- **M2 – Combat (~1 Woche):** Geschütz feuert im Viewport, 3 Gegner, `first`-Targeting, Coverage drosselt DPS (sichtbar), Planet-HP, Durchbruch, Fokus-Mark. *Abnahme:* eine Welle gewinn- und verlierbar; Strom-Engpass fühlbar.
- **M2.5 – FUN-PROBE (Wegwerf, ~2–3 Tage) [Review-Fix]:** Hardcode-Loop: 3 Wellen → fixe TP → EIN hardgecodeter Skilltree-Bonus (+Schaden) → Run-Neustart. Kein Save, keine echte Formel, keine Politur. **Ziel:** beweisen, dass „noch ein Versuch" zieht UND dass der Spieler den Strom-Engpass überhaupt spürt/versteht, BEVOR die schweren Systeme entstehen. Explizit als Wegwerf markiert. *Gate: trägt der Loop nicht, wird umgesteuert statt M3/M4 zu bauen.*
- **M3 – Runden-Loop (~1 Woche):** 10 Runden + Endboss (Schild-Phase, telegraphiert), Wellen-Vorschau + Bedrohungs-Einschätzung, Lehr-Pacing, Run-Ende. *Abnahme:* ein Run von Start bis Ende durchspielbar.
- **M4 – Meta-Loop (~1 Woche):** kanonische TP-Formel, Run-Summary mit Vorschau, 8-Knoten-Skilltree (3 Unlock front-geladen + 5 Passiv), Respec-Regel, Save (nur Meta), multiplikatives Turm-Level. *Abnahme:* Skilltree-Kauf macht nächsten Run **sichtbar** stärker; Festbeissen funktioniert.
- **M5 – Politur-Pass (~1 Woche):** MVP-Juice (Flash/Pop/Glow/Strom-Pulsieren), deutsche Zahlenformatierung, Balance-Tuning via Vitest-Sim (Ziel: 1. Sieg in 2–4 Versuchen; Pacing-Invariante grün). *Abnahme:* Slice fühlt sich wie ein fertiges Mini-Spiel an.

### Phase 2 — Tiefe & Counter-Rätsel
Restliche Türme (Frost/Slow, Flak, Railgun, Buff-Aura) als Unlocks · Shielded + Flying **verzahnt** mit Schild-Brecher/Flak (nie counter-los) · `air`-Spalte/`flak`-Typ in die Matrix · alle Targeting-Modi + Umschalt-UI + Hotkeys · Schlüssel-/Run-Modifier-Knoten · Batterie als Gebäude · Forschung + In-Run-Tech-Baum (Tier-2/3-Gating) · Festbeissen-Trostbonus · Run-Resume + Offline-Progress + Migrations-Kette · getrennte RNG-Streams. **P2-Milestone:** ≥4 Türme × 5 Gegner spielen ein echtes Counter-Rätsel; jede Bau-Wahl ist auch eine Strom-Wahl.

### Phase 3 — Breite & Politur
Mehr Planeten (je **1 neues System**: Schild-Mechanik, mobile Einheiten) · mehrere Boss-Mechaniken · voller Juice (Partikel, Hit-Stop, Interpolation) ggf. PixiJS-Swap · Base64-Export/Import · höherer Offline-Cap via QoL-Knoten · erweiterte Notation/`break_infinity` falls ein Layer es braucht. **P3-Milestone:** 2–3 Planeten mit je eigenem System, Langzeit-Motivation ohne Zahlen-Inflation.

---

## 11. Risiken & offene Balance-Fragen

**Technische Risiken**
- **Hot-State-Leck:** Gegner/Projektile versehentlich in `$state` → Reaktivitäts-Sturm. *Gegenmittel:* Sim(plain)/UI(state)-Trennung ab Tag 1, Golden-Test, Frame-Budget-Check.
- **Nichtdeterminismus-Leck:** `Math.random()`/`Date.now()` im Core. *Gegenmittel:* Golden-Test, Lint-Regel.
- **Fun-Probe-Gate:** zentrales Reihenfolge-Risiko — der Loop wird bei M2.5 fun-getestet, nicht erst nach M4 (vermeidet größten Fehl-Invest).

**Offene Balance-Fragen (im M5-Tuning empirisch zu klären, KEINE geratenen Finalwerte)**
- **`costGrowth` 1.12:** liefert es real 3–5 Käufe/Bauphase? Sim-Test.
- **`enemyHpGrowth` 1.10 vs. erreichbares DPS-Wachstum:** Pacing-Invariante muss messbar grün sein (multiplikatives Level-Up `1.25^level` muss `1.10` schlagen).
- **TP-Kalibrierung (BASE=3, DIV=2, EXP=0.7):** liefern 2–4 Fehlversuche genug TP für die Sieg-nötigen Unlocks? Rückwärts kalibrieren (Ziel-Run-Anzahl → nötige TP → DIV final).
- **Boss-HP-Kalibrierung:** `600 * 1.10^10 * 8` gegen reale DPS bei Runde 10 — fair vorbaubar?
- **Schild-Phasen-Fenster:** Dauer (~2 s) vs. Durchbruchs-Risiko — echte Hürde, nicht unfair?
- **Strom-Cap-Hebel (`p_stromcap` front-geladen +30 %):** stark genug fühlbar, ohne zu trivialisieren?
- **Slot-Cap 12:** genug für Eco+Defense-Spannung, nicht zu eng?

**Scope-Risiken (Solo-Dev)**
- **Turm-/Gegner-Zoo zu früh:** Disziplin — MVP bleibt bei 3 Türmen / 3 Gegnern + 1 Boss.
- **Politur-Falle:** erst Loop fun (M2.5/M4), dann Juice (M5/Phase 3).
- **Over-Engineering-Falle:** Persistence/Render bewusst entschlackt; nichts für noch-nicht-existierende Features vorbauen.

---

## 12. Glossar

| Begriff | Bedeutung |
|---|---|
| **Run** | Ein Planet-Versuch von Start bis Sieg/Niederlage |
| **Runde / Welle** | Eine Bau-Phase + Combat-Phase innerhalb eines Runs |
| **Bau-Phase (`BUILD`)** | Ruhige Phase: Eco tickt, bauen/upgraden, Welle per Knopf starten |
| **Combat-Phase (`COMBAT`)** | Welle läuft im Viewport, Türme feuern automatisch |
| **Eco** | In-Run-Wirtschaft (Erz + Strom) |
| **Strom-Coverage** | `min(1, gen/draw)`; drosselt alle Verbraucher proportional |
| **Pivot** | Umschwenken von Eco-Aufbau zu Verteidigung, wenn Strom knapp wird |
| **Fokus-Mark** | Die eine Echtzeit-Mikroentscheidung: alle Türme auf einen Gegner (~3 s, 1×/Welle) |
| **Tech-Punkte (TP)** | Permanente Meta-Währung, am Run-Ende vergeben |
| **Skilltree** | Permanenter Baum: Unlocks (horizontal) + Passive (vertikal) |
| **Festbeissen** | Denselben Planeten mehrfach versuchen, bis stark genug |
| **Soft-Pull-Lager** | Erz-Cap wächst pro Welle; sanfter Anreiz zu bauen statt warten |
| **Coverage-Drosselung** | Proportionale Schwächung bei Strom-Defizit (Mindustry-Modell) |
| **Counter-Matrix** | `DamageType × ArmorType`-Multiplikatoren (kinetic/explosive/energy × light/heavy/shield) |
| **Telegraph** | Sichtbare Vorwarnung (1,5 s) einer Boss-Fähigkeit |
| **Golden-Test** | Determinismus-Test: fixer Seed → End-State-Hash gegen Snapshot |
| **Hot/Cold-Daten** | Heiß = jeden Frame direkt gelesen (Render); kalt = throttled Snapshot (UI) |
| **Slot** | Fester Ring-Platz für einen Turm/Sammler; Kraftwerke belegen keine Slots |
| **Num** | `type Num = number` — Alias für späteren `break_infinity`-Swap |
| **MVP / Vertical-Slice** | Kapitel 9: kompletter Innen+Außen-Loop, minimale Content-Breite |
