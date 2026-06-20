import type { GameState } from '../sim/core/GameState';

const PALETTE = {
  bgDeep: '#0B1026',
  planet: '#4DD0C2',
  planetGlow: '#7FFFE6',
};

// Liest nur den State, zeichnet. Mutiert nichts.
export class Canvas2DRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D-Canvas-Kontext nicht verfügbar');
    this.ctx = ctx;
  }

  draw(state: GameState): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = PALETTE.bgDeep;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sim-Ursprung (0,0) → Canvas-Mitte.
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const pulse = Math.sin(state.timeS * 2) * 4; // sichtbares Lebenszeichen
    const r = state.planet.radius + pulse;

    ctx.beginPath();
    ctx.arc(cx + state.planet.x, cy + state.planet.y, r, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.planet;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = PALETTE.planetGlow;
    ctx.stroke();
  }
}
