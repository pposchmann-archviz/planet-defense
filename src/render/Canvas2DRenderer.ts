import type { GameState } from '../sim/core/GameState';
import { getBuilding } from '../content/buildings';
import { getEnemy } from '../content/enemies';
import { BALANCE } from '../content/balance';
import { pathPosition, towerPosition } from '../sim/core/geometry';
import { viewScale } from './viewport';

const PALETTE = {
  bgDeep: '#0B1026', planet: '#4DD0C2', planetGlow: '#7FFFE6',
  turret: '#9AA6D4', turretCore: '#1E2748', tracer: '#FFE14D',
  hpGood: '#3DDC84', hpBad: '#FF4D5E', focus: '#FFB020',
};

export class Canvas2DRenderer {
  private ctx: CanvasRenderingContext2D;
  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D-Canvas-Kontext nicht verfügbar');
    this.ctx = ctx;
  }

  draw(state: GameState): void {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const s = viewScale(canvas.width, canvas.height);
    const toX = (x: number) => cx + x * s;
    const toY = (y: number) => cy + y * s;

    ctx.fillStyle = PALETTE.bgDeep;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Turm-Reichweiten-Ring (dezent)
    ctx.strokeStyle = 'rgba(154,166,212,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, BALANCE.R_TOWERS * s, 0, Math.PI * 2); ctx.stroke();

    // Planet mit Puls
    const pulse = Math.sin(state.timeS * 2) * 3;
    ctx.beginPath();
    ctx.arc(cx, cy, BALANCE.R_PLANET * s + pulse, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.planet; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = PALETTE.planetGlow; ctx.stroke();

    // Gegner
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const def = getEnemy(e.defId);
      const p = pathPosition(e.angle, e.progress);
      const ex = toX(p.x), ey = toY(p.y);
      const focused = state.focusEid === e.eid;
      ctx.fillStyle = def.colorVar;
      const sz = (def.shape === 'cluster' ? 5 : def.shape === 'hexagon' ? 11 : 8);
      ctx.beginPath(); ctx.arc(ex, ey, sz, 0, Math.PI * 2); ctx.fill();
      if (focused) { ctx.strokeStyle = PALETTE.focus; ctx.lineWidth = 2; ctx.stroke(); }
      // Mini-HP-Balken
      if (e.hp < e.maxHp) {
        const w = 16, frac = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = '#0008'; ctx.fillRect(ex - w / 2, ey - sz - 6, w, 3);
        ctx.fillStyle = PALETTE.hpGood; ctx.fillRect(ex - w / 2, ey - sz - 6, w * frac, 3);
      }
    }

    // Türme + Tracer auf das aktuelle Ziel
    for (const t of state.buildings) {
      const def = getBuilding(t.defId);
      if (def.category !== 'weapon') continue;
      const tp = towerPosition(t.slot ?? 0);
      const txp = toX(tp.x), typ = toY(tp.y);
      // Tracer: kurz nach Schuss (cooldown nahe Maximum) auf nächstes Ziel
      ctx.fillStyle = PALETTE.turretCore;
      ctx.strokeStyle = PALETTE.turret; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(txp, typ, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // Planet-HP-Bogen
    if (state.planet.maxHp > 0) {
      const frac = Math.max(0, state.planet.hp / state.planet.maxHp);
      ctx.lineWidth = 4;
      ctx.strokeStyle = frac > 0.3 ? PALETTE.hpGood : PALETTE.hpBad;
      ctx.beginPath();
      ctx.arc(cx, cy, BALANCE.R_PLANET * s + 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
    }
  }
}
