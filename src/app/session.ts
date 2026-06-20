import { type MetaState, emptyMeta, deriveMetaMods, buyNode, awardTechPoints, type RunMods, type TpBreakdown, type BuyResult } from '../sim/meta';

// Abstrakte Persistenz, damit die Session ohne localStorage testbar ist.
export interface MetaStore { read(): string | null; write(raw: string): void; }

interface PersistShape { techPoints: number; skillNodes: Record<string, number>; bestRound: number; }

// Run-Ende-Aufschlüsselung inkl. intern berechnetem newRecord-Flag.
export interface RunEndBreakdown extends TpBreakdown { newRecord: boolean; }

export class Session {
  meta: MetaState;
  bestRound = 0;
  constructor(private store: MetaStore) {
    const loaded = this.load();
    this.meta = loaded.meta;
    this.bestRound = loaded.bestRound;
  }
  private load(): { meta: MetaState; bestRound: number } {
    const raw = this.store.read();
    if (!raw) return { meta: emptyMeta(), bestRound: 0 };
    try {
      const p = JSON.parse(raw) as Partial<PersistShape>;
      return {
        meta: {
          techPoints: typeof p.techPoints === 'number' ? p.techPoints : 0,
          skillNodes: p.skillNodes && typeof p.skillNodes === 'object' ? { ...p.skillNodes } : {},
        },
        bestRound: typeof p.bestRound === 'number' ? p.bestRound : 0,
      };
    } catch {
      return { meta: emptyMeta(), bestRound: 0 };
    }
  }
  private persist(): void {
    this.store.write(JSON.stringify({
      techPoints: this.meta.techPoints,
      skillNodes: this.meta.skillNodes,
      bestRound: this.bestRound,
    }));
  }
  runMods(): RunMods {
    return deriveMetaMods(this.meta.skillNodes);
  }
  // newRecord wird intern aus der persistierten bestRound berechnet.
  endRun(run: { highestRoundCleared: number; bossesKilledThisRun: number }): RunEndBreakdown {
    const newRecord = run.highestRoundCleared > this.bestRound;
    const bd = awardTechPoints(this.meta, run.highestRoundCleared, run.bossesKilledThisRun, newRecord);
    this.bestRound = Math.max(this.bestRound, run.highestRoundCleared);
    this.persist();
    return { ...bd, newRecord };
  }
  buy(nodeId: string): BuyResult {
    const r = buyNode(this.meta, nodeId);
    if (r.ok) this.persist();
    return r;
  }
}
