// content/balance.ts — die EINE Quelle für globale Tuning-Werte.
// M0 enthält nur die Tick-Raten; weitere Werte kommen in M1+.
export const BALANCE = {
  ECO_STEP_S: 1.0, // Eco-Tick = 1 Hz (M0 ungenutzt, schon definiert)
  COMBAT_STEP_S: 1 / 30, // Combat-Tick = 30 Hz
  MAX_STEPS: 5, // Spiral-of-Death-Cap
} as const;
