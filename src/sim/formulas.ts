// Reine, deterministische Spielformeln. Kein Zustand, keine I/O.

// Ganzzahlige Kosten der n-ten Anschaffung: base * growth^n, abgerundet.
export function nextCost(base: number, growth: number, n: number): number {
  return Math.floor(base * Math.pow(growth, n));
}
