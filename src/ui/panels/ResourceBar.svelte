<script lang="ts">
  import { gameStore } from '../stores/gameStore.svelte';
  import { fmt, fmtInt } from '../format';
  import { PALETTE } from '../theme';

  const snap = $derived(gameStore.snapshot);
  const coveragePct = $derived(Math.round(snap.power.coverage * 100));
  const deficit = $derived(snap.power.coverage < 1);
</script>

<div class="bar">
  <div class="stat">
    <span class="label" style="color:{PALETTE.ore}">ERZ</span>
    <span class="val">{fmt(snap.ore)} <span class="cap">/ {fmt(snap.oreStorageCap)}</span></span>
  </div>
  <div class="stat" class:deficit>
    <span class="label" style="color:{PALETTE.power}">STROM</span>
    <span class="val">{fmtInt(snap.power.gen)} / {fmtInt(snap.power.draw)}</span>
    {#if deficit}
      <span class="warn">⚠ {coveragePct}% — Produktion gedrosselt</span>
    {/if}
  </div>
</div>

<style>
  .bar { display: flex; gap: 32px; padding: 12px 18px; background: #141A33; border-radius: 12px; }
  .stat { display: flex; flex-direction: column; gap: 2px; }
  .label { font-size: 11px; font-weight: 800; letter-spacing: 1px; }
  .val { font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; color: #F2F5FF; }
  .cap { font-size: 13px; color: #5A6699; font-weight: 600; }
  .warn { font-size: 11px; color: #FF4D5E; font-weight: 700; }
  .deficit .val { color: #FF4D5E; animation: pulse 1s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: 0.55; } }
</style>
