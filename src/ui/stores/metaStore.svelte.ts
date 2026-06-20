import type { MetaState } from '../../sim/meta';

export interface MetaSnapshot { techPoints: number; skillNodes: Record<string, number>; }

class MetaStore {
  snapshot = $state<MetaSnapshot>({ techPoints: 0, skillNodes: {} });
  push(meta: MetaState): void {
    this.snapshot = { techPoints: meta.techPoints, skillNodes: { ...meta.skillNodes } };
  }
}
export const metaStore = new MetaStore();
