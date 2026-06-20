import { describe, it, expect } from 'vitest';
import { fmt, fmtInt } from '../../src/ui/format';

describe('fmt (deutsche Zahlen)', () => {
  it('kleine Zahlen ohne Suffix', () => {
    expect(fmt(0)).toBe('0');
    expect(fmt(42)).toBe('42');
    expect(fmt(999)).toBe('999');
  });
  it('Tausender mit Komma + Tsd.', () => {
    expect(fmt(1500)).toBe('1,5 Tsd.');
    expect(fmt(12000)).toBe('12 Tsd.');
  });
  it('Millionen', () => {
    expect(fmt(1_500_000)).toBe('1,5 Mio.');
  });
  it('fmtInt rundet ab und gruppiert nicht', () => {
    expect(fmtInt(6.9)).toBe('6');
    expect(fmtInt(20)).toBe('20');
  });
  it('Randfälle: Grenze, Abschneiden, Negativ, nicht-endlich', () => {
    expect(fmt(1000)).toBe('1 Tsd.'); // genau an der Tausender-Grenze
    expect(fmt(1990)).toBe('1,9 Tsd.'); // abgeschnitten, NICHT gerundet (sonst 2 Tsd.)
    expect(fmt(-1500)).toBe('-1,5 Tsd.'); // negativ
    expect(fmt(NaN)).toBe('–'); // nicht-endlich
    expect(fmt(Infinity)).toBe('–');
  });

  it('saturiert an der größten Stufe (Bio.) statt aus dem Suffix-Array zu fallen', () => {
    const s = fmt(1e18);
    expect(s.endsWith(' Bio.')).toBe(true); // bleibt bei Bio., kein undefined-Suffix
  });
});
