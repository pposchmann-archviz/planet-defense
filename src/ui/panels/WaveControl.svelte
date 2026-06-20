<script lang="ts">
  import { gameStore } from '../stores/gameStore.svelte';
  import { fmtInt } from '../format';
  import type { UICommand } from '../../sim/commands/command';

  let { onCommand, onRestart, onOpenSkilltree, breakdown }:
    { onCommand: (c: UICommand) => void; onRestart: () => void; onOpenSkilltree: () => void; breakdown: { basis: number; bossBonus: number; recordBonus: number; gained: number } | null } = $props();
  const snap = $derived(gameStore.snapshot);
  const hpFrac = $derived(snap.planetMaxHp > 0 ? snap.planetHp / snap.planetMaxHp : 0);
  const aliveCount = $derived(snap.enemies.filter((e) => e.alive).length);
</script>

<div class="wave">
  <div class="hp">
    <span class="label">PLANET</span>
    <div class="track"><div class="fill" class:low={hpFrac <= 0.3} style="width:{Math.max(0, hpFrac) * 100}%"></div></div>
    <span class="val">{fmtInt(snap.planetHp)} / {fmtInt(snap.planetMaxHp)}</span>
  </div>

  {#if snap.phase === 'BUILD'}
    <div class="build-row">
      <span class="round">Runde {snap.currentRound} / 10</span>
      <div class="preview">
        {#each snap.preview.groups as g (g.enemyId)}
          <span class="grp" class:boss={g.isBoss}>{g.count}× {g.nameDe}</span>
        {/each}
      </div>
      <span class="assess {snap.preview.assessment}">{snap.preview.assessment}</span>
      <button class="start" onclick={() => onCommand({ t: 'startWave' })}>Welle starten ▶</button>
    </div>
  {:else if snap.phase === 'COMBAT'}
    <div class="combat-info">
      <span class="round">Runde {snap.currentRound}</span>
      <span class="badge">COMBAT</span>
      <span>{aliveCount} Gegner</span>
      {#if !snap.focusUsed}<span class="hint">Klick einen Gegner → Fokus</span>{:else}<span class="hint used">Fokus genutzt</span>{/if}
    </div>
  {:else if snap.phase === 'RUN_WON'}
    <div class="overlay won">
      <strong>Planet geschafft! 🌍</strong>
      {#if breakdown}
        <div class="tp-breakdown">+{breakdown.gained} Tech-Punkte (Basis {breakdown.basis} · Boss {breakdown.bossBonus} · Rekord {breakdown.recordBonus})</div>
      {/if}
      <button class="start" onclick={() => onRestart()}>Neu starten</button>
      <button class="skill" onclick={() => onOpenSkilltree()}>Skilltree</button>
    </div>
  {:else if snap.phase === 'RUN_OVER'}
    <div class="overlay lost">
      <strong>Planet verloren: Runde {snap.highestRoundCleared} erreicht</strong>
      {#if breakdown}
        <div class="tp-breakdown">+{breakdown.gained} Tech-Punkte (Basis {breakdown.basis} · Boss {breakdown.bossBonus} · Rekord {breakdown.recordBonus})</div>
      {/if}
      <button class="start" onclick={() => onRestart()}>Neu starten</button>
      <button class="skill" onclick={() => onOpenSkilltree()}>Skilltree</button>
    </div>
  {/if}
</div>

<style>
  .wave { display: flex; align-items: center; gap: 20px; padding: 12px 18px; background: #141A33; border-radius: 12px; }
  .hp { display: flex; align-items: center; gap: 10px; }
  .label { font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #9AA6D4; }
  .track { width: 180px; height: 10px; background: #0B1026; border-radius: 6px; overflow: hidden; }
  .fill { height: 100%; background: #3DDC84; transition: width 0.2s; }
  .fill.low { background: #FF4D5E; }
  .val { font-size: 13px; font-weight: 800; font-variant-numeric: tabular-nums; color: #F2F5FF; }
  .start { padding: 10px 18px; background: #4DD0C2; color: #06121f; font-weight: 800; border: none; border-radius: 10px; cursor: pointer; font-size: 15px; }
  .combat-info { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #F2F5FF; }
  .badge { background: #FF4D5E; color: #fff; font-weight: 800; padding: 3px 10px; border-radius: 99px; font-size: 11px; }
  .hint { color: #FFB020; font-size: 12px; } .hint.used { color: #5A6699; }
  .overlay.lost { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; color: #FF4D5E; font-size: 16px; }
  .overlay.won { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; color: #3DDC84; font-size: 16px; }
  .tp-breakdown { color: #FF7A59; font-weight: 800; font-size: 14px; }
  .skill { padding: 10px 18px; background: #2C3760; color: #F2F5FF; font-weight: 800; border: none; border-radius: 10px; cursor: pointer; font-size: 15px; }
  .build-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .round { font-weight: 800; color: #9AA6D4; }
  .preview { display: flex; gap: 8px; flex-wrap: wrap; font-size: 12px; color: #F2F5FF; }
  .grp.boss { color: #FF4D5E; font-weight: 800; }
  .assess { padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; }
  .assess.leicht { background: #1d3a2a; color: #3DDC84; }
  .assess.machbar { background: #3a3320; color: #FFB020; }
  .assess.hart { background: #3a1820; color: #FF4D5E; }
</style>
