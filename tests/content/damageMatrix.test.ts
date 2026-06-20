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
