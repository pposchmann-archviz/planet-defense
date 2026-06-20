import type { GameState } from '../sim/core/GameState';
import { getBuilding } from '../content/buildings';
import { getEnemy } from '../content/enemies';
import { selectTarget } from '../sim/systems/combatSystem';
import { planetView, surfacePoint, buildingLonLat, enemyScreen, type PlanetView } from './globeProjection';
import { RenderEffects } from './effects';

const PAL = {
  bg: '#06101f', lit: '#34c9b8', shadow: '#1d8e81', rim: 'rgba(150,255,235,0.55)',
  cloud: '#e6fbf5', turretCore: '#0a2230', tracer: '#FFE14D', flash: '#FFB020',
  hpGood: '#3DDC84', hpBad: '#FF4D5E', focus: '#FFB020', shield: '#5AB0FF', textMid: '#9AA6D4',
};
// Turm-Akzentfarbe nach Typ
const TURRET_COLOR: Record<string, string> = {
  geschuetz: '#7fffe6', artillery: '#FF8A3D', laser: '#5AB0FF',
  railgun: '#A06BFF', frost: '#5AB0FF', flak: '#FF8A3D',
  kraftwerk: '#FFC53D', erz_sammler: '#4DD0C2',
};

interface Cloud { x: number; y: number; w: number; spd: number; }

export class Canvas2DRenderer {
  private ctx: CanvasRenderingContext2D;
  private fx = new RenderEffects();
  private prevCd = new Map<number, number>(); // iid → letzter cooldown (Schuss-Erkennung)
  private prevAlive = new Set<number>();       // eid der letzten Frame-lebenden Gegner (Tod-Erkennung)
  private clouds: Cloud[] = [];
  private last = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D-Canvas-Kontext nicht verfügbar');
    this.ctx = ctx;
  }

  draw(state: GameState): void {
    const { ctx, canvas } = this;
    const w = canvas.width, h = canvas.height;
    const now = performance.now();
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.05) : 0;
    this.last = now;
    const view = planetView(w, h);
    if (this.clouds.length === 0) this.initClouds(view);

    // Schuss- + Tod-Erkennung (render-only Effekte) BEVOR gezeichnet wird
    this.detectShots(state, view);
    this.detectDeaths(state, view);
    this.fx.tick(dt);
    for (const c of this.clouds) { c.x += c.spd * dt; if (c.x > 1.3) c.x = -0.3; }

    // 1) Hintergrund + Sterne
    ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#9fb6c6';
    for (let i = 0; i < 60; i++) { ctx.globalAlpha = 0.18; ctx.fillRect((i * 97 % w), (i * 61 % h), 1.5, 1.5); }
    ctx.globalAlpha = 1;

    // Türme nach depth sortiert (hintere zuerst, hinter der Kugel)
    const turrets = state.buildings.map((b) => {
      const ll = buildingLonLat(b);
      return { b, p: surfacePoint(ll.lon, ll.lat, state.timeS, view) };
    }).sort((a, z) => a.p.depth - z.p.depth);
    for (const { b, p } of turrets) if (p.depth <= 0) this.drawTurret(b, p, false);

    // 2) Planet-Scheibe (flache Schattierung Variante A)
    this.drawPlanet(view, state.timeS);

    // 3) vordere Türme
    for (const { b, p } of turrets) if (p.depth > 0) this.drawTurret(b, p, true, state);

    // 4) Gegner
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const s = enemyScreen(e.angle, e.progress, view, w, h);
      this.drawEnemy(e, s, state.timeS);
    }

    // 5) Effekte (Tracer + Pops)
    for (const t of this.fx.tracers) {
      ctx.globalAlpha = Math.max(0, t.life);
      ctx.strokeStyle = t.color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke();
      ctx.beginPath(); ctx.arc(t.x1, t.y1, 6 * t.life, 0, Math.PI * 2); ctx.fillStyle = PAL.flash; ctx.fill();
    }
    for (const pop of this.fx.pops) {
      ctx.globalAlpha = Math.max(0, pop.life);
      ctx.fillStyle = pop.color;
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; const r = 10 * (1 - pop.life) + 4; ctx.beginPath(); ctx.arc(pop.x + Math.cos(a) * r, pop.y + Math.sin(a) * r, 2, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;

    // 6) Planet-HP-Bogen + Runden-Label
    if (state.planet.maxHp > 0) {
      const frac = Math.max(0, state.planet.hp / state.planet.maxHp);
      ctx.lineWidth = 4; ctx.strokeStyle = frac > 0.3 ? PAL.hpGood : PAL.hpBad;
      ctx.beginPath(); ctx.arc(view.cx, view.cy, view.R + 10, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = PAL.textMid; ctx.font = '14px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('Runde ' + state.currentRound, 12, 22);
  }

  private initClouds(view: PlanetView): void {
    for (let i = 0; i < 4; i++) this.clouds.push({ x: Math.random(), y: view.cy - view.R * 0.55 + Math.random() * view.R * 1.1, w: 46 + Math.random() * 50, spd: 0.12 + Math.random() * 0.1 });
  }

  private drawPlanet(view: PlanetView, _timeS: number): void {
    const { ctx } = this; const { cx, cy, R } = view;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = PAL.lit; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    // EINE flache Sichel-Schatten-Ellipse rechts (harte Kante = Variante A)
    ctx.fillStyle = PAL.shadow;
    ctx.beginPath(); ctx.ellipse(cx + R * 0.52, cy, R * 0.82, R * 1.05, 0, 0, Math.PI * 2); ctx.fill();
    // Wolken
    for (const c of this.clouds) { const px = cx - R * 1.1 + c.x * (R * 2.2); ctx.globalAlpha = 0.42; ctx.fillStyle = PAL.cloud; this.roundRect(px, c.y, c.w, 12, 6); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.restore();
    // Lichtrand links
    ctx.lineWidth = 3; ctx.strokeStyle = PAL.rim; ctx.beginPath(); ctx.arc(cx, cy, R - 1, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
  }

  private drawTurret(b: GameState['buildings'][number], p: { x: number; y: number; depth: number }, front: boolean, state?: GameState): void {
    const { ctx } = this;
    const size = 6 + 7 * Math.max(0, p.depth);
    ctx.globalAlpha = front ? 1 : 0.18 + 0.2 * (p.depth + 1);
    ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fillStyle = PAL.turretCore; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = front ? (TURRET_COLOR[b.defId] ?? '#7fffe6') : '#3a6e66'; ctx.stroke();
    // kleines Rohr Richtung aktuelles Ziel (nur vorne + nur Waffen)
    if (front && state) {
      const def = getBuilding(b.defId);
      if (def.category === 'weapon') {
        const tgt = selectTarget(state, b);
        if (tgt) {
          const ts = enemyScreen(tgt.angle, tgt.progress, planetView(this.canvas.width, this.canvas.height), this.canvas.width, this.canvas.height);
          const a = Math.atan2(ts.y - p.y, ts.x - p.x);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(a) * size * 1.6, p.y + Math.sin(a) * size * 1.6);
          ctx.lineWidth = 3; ctx.strokeStyle = '#9fffe6'; ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: GameState['enemies'][number], s: { x: number; y: number }, timeS: number): void {
    const { ctx } = this; const def = getEnemy(e.defId);
    const sz = def.shape === 'cluster' ? 5 : def.shape === 'hexagon' ? 11 : 8;
    ctx.fillStyle = def.colorVar;
    if (def.shape === 'hexagon') { this.poly(s.x, s.y, sz, 6); } else if (def.shape === 'triangle') { this.poly(s.x, s.y, sz, 3); } else { ctx.beginPath(); ctx.arc(s.x, s.y, sz, 0, Math.PI * 2); ctx.fill(); }
    if (e.flying) { ctx.strokeStyle = '#CFE8FF'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x, s.y, sz + 3, 0, Math.PI * 2); ctx.stroke(); }
    if ((e.slowTimerS ?? 0) > 0) { ctx.strokeStyle = PAL.shield; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, sz + 1.5, 0, Math.PI * 2); ctx.stroke(); }
    if (e.isBoss && e.bossPhase === 'telegraph') { ctx.strokeStyle = PAL.focus; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, sz + 6 + Math.sin(timeS * 12) * 2, 0, Math.PI * 2); ctx.stroke(); }
    if (e.isBoss && e.bossPhase === 'shield') { ctx.strokeStyle = PAL.shield; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, sz + 7, 0, Math.PI * 2); ctx.stroke(); }
    if (e.hp < e.maxHp) { const wbar = 16, frac = Math.max(0, e.hp / e.maxHp); ctx.fillStyle = '#0008'; ctx.fillRect(s.x - wbar / 2, s.y - sz - 6, wbar, 3); ctx.fillStyle = PAL.hpGood; ctx.fillRect(s.x - wbar / 2, s.y - sz - 6, wbar * frac, 3); }
  }

  // Schuss-Erkennung: cooldown stieg sprunghaft → Turm hat gefeuert → Tracer zum aktuellen Ziel.
  private detectShots(state: GameState, view: PlanetView): void {
    const w = this.canvas.width, h = this.canvas.height;
    for (const b of state.buildings) {
      const def = getBuilding(b.defId);
      if (def.category !== 'weapon') continue;
      const cd = b.cooldown ?? 0;
      const prev = this.prevCd.get(b.iid) ?? cd;
      if (cd > prev + 0.05) { // Cooldown wurde nach Schuss neu gesetzt
        const ll = buildingLonLat(b);
        const sp = surfacePoint(ll.lon, ll.lat, state.timeS, view);
        if (sp.depth > 0) {
          const tgt = selectTarget(state, b);
          if (tgt) { const ts = enemyScreen(tgt.angle, tgt.progress, view, w, h); this.fx.addTracer(sp.x, sp.y, ts.x, ts.y, PAL.tracer); }
        }
      }
      this.prevCd.set(b.iid, cd);
    }
  }

  // Tod-Erkennung: war letztes Frame lebend, jetzt weg/tot → Pop am letzten Bildschirmort.
  private detectDeaths(state: GameState, view: PlanetView): void {
    const w = this.canvas.width, h = this.canvas.height;
    const aliveNow = new Set<number>();
    const posByEid = new Map<number, { x: number; y: number; color: string }>();
    for (const e of state.enemies) { if (e.alive) { aliveNow.add(e.eid); const s = enemyScreen(e.angle, e.progress, view, w, h); posByEid.set(e.eid, { x: s.x, y: s.y, color: getEnemy(e.defId).colorVar }); } }
    for (const eid of this.prevAlive) { if (!aliveNow.has(eid)) { const last = this.lastEnemyPos.get(eid); if (last) this.fx.addPop(last.x, last.y, last.color); } }
    // Positionen für nächstes Frame merken
    this.lastEnemyPos = posByEid;
    this.prevAlive = aliveNow;
  }
  private lastEnemyPos = new Map<number, { x: number; y: number; color: string }>();

  private poly(x: number, y: number, r: number, n: number): void {
    const { ctx } = this; ctx.beginPath();
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / n * Math.PI * 2; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fill();
  }
  private roundRect(x: number, y: number, wd: number, ht: number, r: number): void {
    const { ctx } = this; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + wd, y, x + wd, y + ht, r); ctx.arcTo(x + wd, y + ht, x, y + ht, r); ctx.arcTo(x, y + ht, x, y, r); ctx.arcTo(x, y, x + wd, y, r); ctx.closePath();
  }
}
