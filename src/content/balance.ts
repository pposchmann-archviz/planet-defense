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
} as const;
