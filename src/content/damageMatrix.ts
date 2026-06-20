import type { DamageType, ArmorType } from './types';

// EINE kanonische Counter-Matrix (M2-Teilmenge). Multiplikatoren Schaden↓ × Rüstung→.
export const DAMAGE_MATRIX: Record<DamageType, Record<ArmorType, number>> = {
  kinetic: { light: 1.5, heavy: 0.6 },
};
