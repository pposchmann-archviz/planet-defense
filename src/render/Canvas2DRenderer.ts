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
  flying: '#CFE8FF', slow: '#5AB0FF',
};

// Türm-Typ-Farben (minimal): nur abweichende Türme; Rest fällt auf Default zurück.
const TURRET_COLOR: Record<string, string> = {
  frost: '#5AB0FF',   // blau
  flak: '#FF8A3D',    // orange
  railgun: '#A06BFF', // violett
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
      // Fliegende Gegner: dünner heller Outline-Ring (lesen als „in der Luft")
      if (e.flying) {
        ctx.strokeStyle = PALETTE.flying; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(ex, ey, sz + 3, 0, Math.PI * 2); ctx.stroke();
      }
      // Verlangsamte Gegner: hellblauer Ring (#5AB0FF)
      if ((e.slowTimerS ?? 0) > 0) {
        ctx.strokeStyle = PALETTE.slow; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ex, ey, sz + 1.5, 0, Math.PI * 2); ctx.stroke();
      }
      if (focused) { ctx.strokeStyle = PALETTE.focus; ctx.lineWidth = 2; ctx.stroke(); }
      // Boss-Visual: Telegraph (pulsierender Orange-Ring) / Schild (hellblauer Kreis)
      if (e.isBoss && e.bossPhase === 'telegraph') {
        ctx.strokeStyle = '#FFB020'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ex, ey, sz + 6 + Math.sin(state.timeS * 12) * 2, 0, Math.PI * 2); ctx.stroke();
      } else if (e.isBoss && e.bossPhase === 'shield') {
        ctx.strokeStyle = '#5AB0FF'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(ex, ey, sz + 7, 0, Math.PI * 2); ctx.stroke();
      }
      // Mini-HP-Balken
      if (e.hp < e.maxHp) {
        const w = 16, frac = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = '#0008'; ctx.fillRect(ex - w / 2, ey - sz - 6, w, 3);
        ctx.fillStyle = PALETTE.hpGood; ctx.fillRect(ex - w / 2, ey - sz - 6, w * frac, 3);
      }
    }

    // Lebende Projektile (kleine gelbe Kreise)
    ctx.fillStyle = PALETTE.tracer;
    for (const p of state.projectiles) {
      if (!p.alive) continue;
      ctx.beginPath(); ctx.arc(toX(p.x), toY(p.y), 3, 0, Math.PI * 2); ctx.fill();
    }

    // Türme + Tracer auf das aktuelle Ziel
    for (const t of state.buildings) {
      const def = getBuilding(t.defId);
      if (def.category !== 'weapon') continue;
      const tp = towerPosition(t.slot ?? 0);
      const txp = toX(tp.x), typ = toY(tp.y);
      // Tracer: kurz nach Schuss (cooldown nahe Maximum) auf nächstes Ziel
      ctx.fillStyle = PALETTE.turretCore;
      ctx.strokeStyle = TURRET_COLOR[def.id] ?? PALETTE.turret; ctx.lineWidth = 2;
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

    // Runden-Anzeige oben links
    ctx.fillStyle = '#9AA6D4';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Runde ' + state.currentRound, 12, 22);
  }
}
