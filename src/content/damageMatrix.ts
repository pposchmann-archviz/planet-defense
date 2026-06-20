import type { DamageType, ArmorType } from './types';

// Kanonische Counter-Matrix (Spec 5.1). Schaden↓ × Rüstung→.
export const DAMAGE_MATRIX: Record<DamageType, Record<ArmorType, number>> = {
  kinetic:   { light: 1.5, heavy: 0.6, shield: 0.5 },
  explosive: { light: 1.2, heavy: 1.5, shield: 0.4 },
  energy:    { light: 0.8, heavy: 0.7, shield: 2.0 },
};
