<!-- src/ui/panels/ResourceBar.svelte -->
<script lang="ts">
  import { gameStore } from '../stores/gameStore.svelte';
  import { fmt, fmtInt } from '../format';

  const snap = $derived(gameStore.snapshot);
  const coveragePct = $derived(Math.round(snap.power.coverage * 100));
  const deficit = $derived(snap.power.coverage < 1);
</script>

<div class="bar">
  <div class="chip ore">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2 3 9l9 13 9-13z" /></svg>
    <span class="txt"><b>{fmt(snap.ore)}</b><span class="cap"> / {fmt(snap.oreStorageCap)}</span></span>
  </div>

  <div class="chip power" class:deficit>
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>
    <span class="txt"><b>{fmtInt(snap.power.gen)}</b> / {fmtInt(snap.power.draw)}</span>
    {#if deficit}<span class="warn">{coveragePct}% · Produktion gedrosselt</span>{/if}
  </div>
</div>

<style>
  .bar { display: flex; gap: 12px; }
  .chip {
    display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px;
    background: #141A33; border: 1px solid #2C3760; border-radius: 999px;
  }
  .chip.ore { color: #4DD0C2; } .chip.power { color: #FFC53D; }
  .txt { color: #F2F5FF; font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .txt b { font-weight: 800; }
  .cap { color: #5A6699; font-size: 12px; font-weight: 600; }
  .warn { color: #FF4D5E; font-size: 11px; font-weight: 700; margin-left: 2px; }
  .chip.deficit { border-color: #FF4D5E; }
  .chip.deficit .txt b { color: #FF4D5E; animation: pulse 1s ease-in-out infinite; display: inline-block; }
  @keyframes pulse { 50% { opacity: 0.5; } }
  @media (prefers-reduced-motion: reduce) { .chip.deficit .txt b { animation: none; } }
</style>
