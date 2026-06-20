// content/balance.ts — die EINE Quelle für globale Tuning-Werte.
export const BALANCE = {
  // --- Tick-Raten ---
  ECO_STEP_S: 1.0, // Eco-Tick = 1 Hz; alle "pro Tick"-Produktionswerte sind "pro Sekunde"
  COMBAT_STEP_S: 1 / 30, // Combat-Tick = 30 Hz (ab M2)
  MAX_STEPS: 5, // Spiral-of-Death-Cap
  SNAPSHOT_HZ: 8, // kalter UI-Snapshot

  // --- Eco / Kosten ---
  costGrowth: 1.12, // r für Bau/Upgrade
  startOre: 50,
  oreStorageCapBase: 600, // Terra-1 Start-Cap (M1: konstant; wächst ab M3 pro Welle)
  startPowerGen: 20, // Sockel-Kraftwerk am Kommandozentrum (gratis)
} as const;
