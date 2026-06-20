export interface Tracer { x1: number; y1: number; x2: number; y2: number; color: string; life: number; }
export interface Pop { x: number; y: number; color: string; life: number; }

const TRACER_FADE = 5; // 1/life-Sekunden
const POP_FADE = 3;

// Transiente, render-only Effekte (KEIN Teil des Sim-States → Determinismus/Golden unberührt).
export class RenderEffects {
  tracers: Tracer[] = [];
  pops: Pop[] = [];

  addTracer(x1: number, y1: number, x2: number, y2: number, color: string): void {
    this.tracers.push({ x1, y1, x2, y2, color, life: 1 });
  }
  addPop(x: number, y: number, color: string): void {
    this.pops.push({ x, y, color, life: 1 });
  }
  tick(dt: number): void {
    for (const t of this.tracers) t.life -= dt * TRACER_FADE;
    for (const p of this.pops) p.life -= dt * POP_FADE;
    this.tracers = this.tracers.filter((t) => t.life > 0);
    this.pops = this.pops.filter((p) => p.life > 0);
  }
}
