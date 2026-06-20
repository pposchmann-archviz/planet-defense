// content/balance.ts — die EINE Quelle für globale Tuning-Werte.
export const BALANCE = {
  // --- Tick-Raten ---
  ECO_STEP_S: 1.0,
  COMBAT_STEP_S: 1 / 30,
  MAX_STEPS: 5,
  SNAPSHOT_HZ: 8,

  // --- Eco / Kosten ---
  costGrowth: 1.12,
  startOre: 50,
  oreStorageCapBase: 600,
  startPowerGen: 20,

  // --- Combat-Geometrie (Sim-Einheiten) ---
  R_PLANET: 60,
  R_TOWERS: 140,
  R_SPAWN: 1000,
  TOWER_SLOTS: 12, // feste Ring-Plätze für Türme (M2: keine Slot-Cap-Erzwingung)

  // --- Planet ---
  planetHpBase: 120,

  // --- Fokus-Mark ---
  focusDurationS: 3,

  // --- In-Run-Turm-Level (multiplikativ) ---
  towerLevelDamageMult: 1.25,

  // --- Runden / Eskalation (M3) ---
  enemyHpGrowth: 1.10,
  TERRA1_ROUNDS: 10,

  // --- Boss (M3, provisorisch — finales Tuning in M5) ---
  // Geschütz-schaffbar getunt: bossHpMult moderat, Boss-baseHp in enemies.ts.
  bossHpMult: 3,
  bossTelegraphS: 1.5,
  bossShieldDurationS: 2.0,
  bossShieldIntervalS: 6.0,

  // --- Meta / Tech-Punkte (M4) ---
  techBase: 3,
  techDiv: 2,
  techExp: 0.7,
  techBossBonus: 10,
  techRecordBonus: 5,
  passiveCostGrowth: 1.6,
} as const;
