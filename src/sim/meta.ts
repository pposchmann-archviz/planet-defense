import { SKILL_NODES, getSkillNode, type PassivStat } from '../content/skilltree';
import { BALANCE } from '../content/balance';
import { techPunkte, nodeCost } from './formulas';

export interface MetaState {
  techPoints: number;
  skillNodes: Record<string, number>; // nodeId -> Stufe
}

export interface RunMods {
  oreMult: number;
  powerGenMult: number;
  turmSchadenMult: number;
  planetHpMult: number;
  startOreBonus: number;
}

export function emptyMeta(): MetaState {
  return { techPoints: 0, skillNodes: {} };
}

const STAT_TO_MOD: Record<PassivStat, keyof RunMods> = {
  stromCap: 'powerGenMult',
  erzRate: 'oreMult',
  turmSchaden: 'turmSchadenMult',
  planetHp: 'planetHpMult',
  startErz: 'startOreBonus',
};

// Gekaufte Knoten -> Run-Modifikatoren (reine Funktion).
export function deriveMetaMods(skillNodes: Record<string, number>): RunMods {
  const mods: RunMods = { oreMult: 1, powerGenMult: 1, turmSchadenMult: 1, planetHpMult: 1, startOreBonus: 0 };
  for (const [id, level] of Object.entries(skillNodes)) {
    if (level <= 0) continue;
    const node = SKILL_NODES[id];
    if (!node?.effekt) continue;
    const { stat, stufe1, folge, modus } = node.effekt;
    const total = stufe1 + (level - 1) * folge;
    const key = STAT_TO_MOD[stat];
    if (modus === 'flat') {
      (mods[key] as number) += total;
    } else {
      (mods[key] as number) *= 1 + total / 100;
    }
  }
  return mods;
}

export type BuyReason = 'notEnoughTp' | 'maxLevel' | 'unknownNode';
export interface BuyResult { ok: boolean; reason?: BuyReason; }

export function buyNode(meta: MetaState, nodeId: string): BuyResult {
  let node;
  try { node = getSkillNode(nodeId); } catch { return { ok: false, reason: 'unknownNode' }; }
  const current = meta.skillNodes[nodeId] ?? 0;
  if (current >= node.maxStufe) return { ok: false, reason: 'maxLevel' };
  const cost = nodeCost(node, current);
  if (meta.techPoints < cost) return { ok: false, reason: 'notEnoughTp' };
  meta.techPoints -= cost;
  meta.skillNodes[nodeId] = current + 1;
  return { ok: true };
}

export interface TpBreakdown { basis: number; bossBonus: number; recordBonus: number; gained: number; }

// Vergibt TP am Run-Ende, mutiert meta.techPoints, liefert Aufschlüsselung.
// Aufschlüsselung nutzt dieselben BALANCE-Konstanten wie techPunkte (keine duplizierten Magic Numbers).
export function awardTechPoints(meta: MetaState, besteRunde: number, bosse: number, neueBestmarke: boolean): TpBreakdown {
  const gained = techPunkte(besteRunde, bosse, neueBestmarke);
  const basis = besteRunde <= 0 ? 0 : Math.floor(BALANCE.techBase * Math.pow(besteRunde / BALANCE.techDiv, BALANCE.techExp));
  const bossBonus = bosse * BALANCE.techBossBonus;
  const recordBonus = neueBestmarke ? BALANCE.techRecordBonus : 0;
  meta.techPoints += gained;
  return { basis, bossBonus, recordBonus, gained };
}
