import { BALANCE } from '../content/balance';

// Sichtbarer Sim-Radius = Verteidigungs-Zone (Turm-Ring + Turm-Reichweite + Rand).
// Gegner erscheinen am Rand dieser Zone und werden hereinfliegend bekämpft,
// statt erst kurz vor dem Planeten aufzutauchen.
export const VIEW_RADIUS = BALANCE.R_TOWERS + 240; // ~380 Sim-Einheiten sichtbar

export function viewScale(w: number, h: number): number {
  return Math.min(w, h) / (VIEW_RADIUS * 2);
}

export interface ScreenVec { x: number; y: number; }

// Sim-Koordinate (Ursprung = Planetzentrum) → Canvas-Pixel.
export function simToScreen(simX: number, simY: number, w: number, h: number): ScreenVec {
  const s = viewScale(w, h);
  return { x: w / 2 + simX * s, y: h / 2 + simY * s };
}
