import type { GameState } from '../sim/core/GameState';
import { tickEconomy } from '../sim/systems/ecoSystem';
import { tickWave } from '../sim/systems/waveSystem';
import { applyCommand, type UICommand, type CommandResult } from '../sim/commands/command';
import type { Canvas2DRenderer } from '../render/Canvas2DRenderer';
import { gameStore } from '../ui/stores/gameStore.svelte';
import { ECO_STEP, COMBAT_STEP, MAX_STEPS, SNAPSHOT_HZ } from './config';

export class GameClock {
  private raf = 0;
  private last = 0;
  private accEco = 0;
  private accCombat = 0;
  private lastSnap = 0;
  private running = false;
  private queue: UICommand[] = [];
  private endedFired = false;
  // Feuert EINMALIG beim Übergang nach RUN_WON/RUN_OVER (App vergibt TP + persistiert).
  onRunEnd?: (state: GameState) => void;

  constructor(private state: GameState, private renderer: Canvas2DRenderer) {}

  enqueue(cmd: UICommand): void { this.queue.push(cmd); }

  private drainCommands(): boolean {
    if (this.queue.length === 0) return false;
    for (const cmd of this.queue) applyCommand(this.state, cmd);
    this.queue.length = 0;
    return true;
  }

  start(): void {
    this.running = true;
    this.endedFired = false;
    this.last = performance.now();
    this.lastSnap = this.last;
    gameStore.push(this.state);
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void { this.running = false; cancelAnimationFrame(this.raf); }

  private frame = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min((now - this.last) / 1000, MAX_STEPS * ECO_STEP);
    this.last = now;

    const applied = this.drainCommands();

    // Eco läuft immer (1 Hz)
    this.accEco += dt;
    let nEco = 0;
    while (this.accEco >= ECO_STEP && nEco++ < MAX_STEPS) {
      tickEconomy(this.state, ECO_STEP);
      this.accEco -= ECO_STEP;
    }

    // Combat nur in COMBAT (30 Hz)
    if (this.state.phase === 'COMBAT') {
      this.accCombat += dt;
      let nC = 0;
      while (this.accCombat >= COMBAT_STEP && nC++ < MAX_STEPS) {
        tickWave(this.state, COMBAT_STEP);
        this.accCombat -= COMBAT_STEP;
      }
    } else {
      this.accCombat = 0; // außerhalb Combat zurücksetzen
    }

    // Run-Ende-Übergang einmalig erkennen (nach dem Combat-Tick).
    if (!this.endedFired && (this.state.phase === 'RUN_WON' || this.state.phase === 'RUN_OVER')) {
      this.endedFired = true;
      this.onRunEnd?.(this.state);
      gameStore.push(this.state);
    }

    this.renderer.draw(this.state);

    if (applied || now - this.lastSnap >= 1000 / SNAPSHOT_HZ) {
      gameStore.push(this.state);
      this.lastSnap = now;
    }
    this.raf = requestAnimationFrame(this.frame);
  };
}

export type { UICommand, CommandResult };
