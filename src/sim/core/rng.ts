// Deterministischer, seedbarer PRNG (mulberry32). KEIN Math.random() im Sim-Core.
export interface RngState {
  s: number; // 32-bit interner Zustand
}

export function createRng(seed: number): RngState {
  return { s: seed >>> 0 };
}

export function nextFloat(rng: RngState): number {
  rng.s = (rng.s + 0x6d2b79f5) >>> 0;
  let t = rng.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Ganzzahl in [0, max) — später von der Spawn-Logik genutzt.
export function nextInt(rng: RngState, max: number): number {
  return Math.floor(nextFloat(rng) * max);
}
