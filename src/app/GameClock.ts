import type { GameState } from '../sim/core/GameState';
import { tickEconomy } from '../sim/systems/ecoSystem';
import { applyCommand, type UICommand, type CommandResult } from '../sim/commands/command';
import type { Canvas2DRenderer } from '../render/Canvas2DRenderer';
import { gameStore } from '../ui/stores/gameStore.svelte';
import { ECO_STEP, MAX_STEPS, SNAPSHOT_HZ } from './config';

// Einziger Ort mit performance.now()/requestAnimationFrame.
export class GameClock {
  private raf = 0;
  private last = 0;
  private accEco = 0;
  private lastSnap = 0;
  private running = false;
  private queue: UICommand[] = [];

  constructor(
    private state: GameState,
    private renderer: Canvas2DRenderer,
  ) {}

  // UI ruft das auf; Befehle werden synchron zum Tick abgearbeitet (Determinismus).
  enqueue(cmd: UICommand): void {
    this.queue.push(cmd);
  }

  // Für sofortiges UI-Feedback (z.B. Button-Disable) kann die UI auch direkt prüfen –
  // hier die maßgebliche Anwendung im Loop.
  private drainCommands(): void {
    for (const cmd of this.queue) applyCommand(this.state, cmd);
    this.queue.length = 0;
  }

  start(): void {
    this.running = true;
    this.last = performance.now();
    this.lastSnap = this.last;
    gameStore.push(this.state);
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min((now - this.last) / 1000, MAX_STEPS * ECO_STEP);
    this.last = now;

    this.drainCommands();

    this.accEco += dt;
    let n = 0;
    while (this.accEco >= ECO_STEP && n++ < MAX_STEPS) {
      tickEconomy(this.state, ECO_STEP);
      this.accEco -= ECO_STEP;
    }

    this.renderer.draw(this.state);

    if (now - this.lastSnap >= 1000 / SNAPSHOT_HZ) {
      gameStore.push(this.state);
      this.lastSnap = now;
    }
    this.raf = requestAnimationFrame(this.frame);
  };
}

export type { UICommand, CommandResult };
