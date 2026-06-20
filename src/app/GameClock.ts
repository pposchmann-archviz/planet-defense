import type { GameState } from '../sim/core/GameState';
import { tick } from '../sim/core/engine';
import type { Canvas2DRenderer } from '../render/Canvas2DRenderer';
import { COMBAT_STEP, MAX_STEPS } from './config';

// Einziger Ort mit performance.now()/requestAnimationFrame.
export class GameClock {
  private raf = 0;
  private last = 0;
  private acc = 0;
  private running = false;

  constructor(
    private state: GameState,
    private renderer: Canvas2DRenderer,
  ) {}

  start(): void {
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min((now - this.last) / 1000, MAX_STEPS * COMBAT_STEP);
    this.last = now;
    this.acc += dt;
    let n = 0;
    while (this.acc >= COMBAT_STEP && n++ < MAX_STEPS) {
      tick(this.state, COMBAT_STEP);
      this.acc -= COMBAT_STEP;
    }
    this.renderer.draw(this.state);
    this.raf = requestAnimationFrame(this.frame);
  };
}
