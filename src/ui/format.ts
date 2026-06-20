const SUFFIXES = ['', ' Tsd.', ' Mio.', ' Mrd.', ' Bio.'];

// Deutsche Kurzformatierung: Dezimal-Komma, Tsd./Mio.-Suffixe.
export function fmt(value: number): string {
  if (!isFinite(value)) return '–';
  const sign = value < 0 ? '-' : '';
  let v = Math.abs(value);
  let tier = 0;
  while (v >= 1000 && tier < SUFFIXES.length - 1) {
    v /= 1000;
    tier++;
  }
  if (tier === 0) return sign + String(Math.floor(v));
  // 1 Nachkommastelle, abgeschnitten, Komma als Dezimaltrenner
  const rounded = Math.floor(v * 10) / 10;
  const str = (rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1)).replace('.', ',');
  return sign + str + SUFFIXES[tier];
}

// Ganze Zahl, abgerundet, ohne Suffix (für Strom-Werte).
export function fmtInt(value: number): string {
  return String(Math.floor(value));
}
