// Kurzgesagt-Palette. Auch in CSS gespiegelt, aber Canvas/Logik lesen die TS-Konstante.
export const PALETTE = {
  bgDeep: '#0B1026',
  bgPanel: '#141A33',
  bgPanelHi: '#1E2748',
  stroke: '#2C3760',
  textHi: '#F2F5FF',
  textMid: '#9AA6D4',
  textLow: '#5A6699',
  power: '#FFC53D', // Strom = immer Gelb
  ore: '#4DD0C2', // Erz = immer Türkis
  good: '#3DDC84',
  warn: '#FFB020',
  bad: '#FF4D5E',
} as const;
