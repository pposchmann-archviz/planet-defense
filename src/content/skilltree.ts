export type KnotenTyp = 'unlock' | 'passiv';
export type Branch = 'eco' | 'defense' | 'survival';
// Run-Stats, die Passive modifizieren:
export type PassivStat = 'stromCap' | 'erzRate' | 'turmSchaden' | 'planetHp' | 'startErz';

export interface SkillNode {
  id: string;
  branch: Branch;
  typ: KnotenTyp;
  nameDe: string;
  beschreibung: string;
  kostenTp: number; // passiv: Basispreis (Stufe 0->1); unlock: Festpreis
  maxStufe: number;
  effekt?: { stat: PassivStat; stufe1: number; folge: number; modus: 'prozent' | 'flat' };
}

// M4: nur Passive (front-geladen). Unlock-Achse folgt in M5.
export const SKILL_NODES: Record<string, SkillNode> = {
  p_stromcap: { id: 'p_stromcap', branch: 'eco', typ: 'passiv', nameDe: 'Netzausbau', beschreibung: 'Mehr Strom-Erzeugung.', kostenTp: 4, maxStufe: 4, effekt: { stat: 'stromCap', stufe1: 30, folge: 12, modus: 'prozent' } },
  p_erzrate: { id: 'p_erzrate', branch: 'eco', typ: 'passiv', nameDe: 'Bohrtechnik', beschreibung: 'Mehr Erz pro Sekunde.', kostenTp: 3, maxStufe: 4, effekt: { stat: 'erzRate', stufe1: 25, folge: 10, modus: 'prozent' } },
  p_turmschaden: { id: 'p_turmschaden', branch: 'defense', typ: 'passiv', nameDe: 'Munitionsforschung', beschreibung: 'Mehr Turm-Schaden.', kostenTp: 5, maxStufe: 4, effekt: { stat: 'turmSchaden', stufe1: 30, folge: 10, modus: 'prozent' } },
  p_planethp: { id: 'p_planethp', branch: 'survival', typ: 'passiv', nameDe: 'Schildgenerator', beschreibung: 'Mehr Planet-HP.', kostenTp: 6, maxStufe: 3, effekt: { stat: 'planetHp', stufe1: 35, folge: 15, modus: 'prozent' } },
  p_starterz: { id: 'p_starterz', branch: 'survival', typ: 'passiv', nameDe: 'Vorrats-Depot', beschreibung: 'Mehr Start-Erz.', kostenTp: 4, maxStufe: 3, effekt: { stat: 'startErz', stufe1: 50, folge: 50, modus: 'flat' } },
};

export const SKILL_NODE_IDS: string[] = Object.keys(SKILL_NODES);

export function getSkillNode(id: string): SkillNode {
  const n = SKILL_NODES[id];
  if (!n) throw new Error(`Unbekannter Skill-Knoten: ${id}`);
  return n;
}
