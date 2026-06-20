<script lang="ts">
  import { onMount } from 'svelte';
  import { createInitialState } from './sim/core/GameState';
  import { Canvas2DRenderer } from './render/Canvas2DRenderer';
  import { GameClock } from './app/GameClock';
  import { readSave } from './persistence/storage';
  import { gameStore } from './ui/stores/gameStore.svelte';
  import { pathPosition } from './sim/core/geometry';
  import { viewScale } from './render/viewport';
  import type { UICommand } from './sim/commands/command';
  import ResourceBar from './ui/panels/ResourceBar.svelte';
  import BuildPanel from './ui/panels/BuildPanel.svelte';
  import WaveControl from './ui/panels/WaveControl.svelte';

  let canvas: HTMLCanvasElement;
  let clock: GameClock | undefined;
  const SEED = 12345;

  function handleCommand(cmd: UICommand) { clock?.enqueue(cmd); }

  function boot() {
    const state = createInitialState(SEED);
    const renderer = new Canvas2DRenderer(canvas);
    clock?.stop();
    clock = new GameClock(state, renderer);
    clock.start();
  }
  function handleRestart() { boot(); }

  // Canvas-Klick → nächsten Gegner finden → focusMark
  function handleCanvasClick(ev: MouseEvent) {
    const snap = gameStore.snapshot;
    if (snap.phase !== 'COMBAT' || snap.focusUsed) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const s = viewScale(canvas.width, canvas.height);
    let bestEid: number | null = null, bestDist = Infinity;
    for (const e of snap.enemies) {
      if (!e.alive) continue;
      const p = pathPosition(e.angle, e.progress);
      const sx = cx + p.x * s, sy = cy + p.y * s;
      const d = Math.hypot(sx - mx, sy - my);
      if (d < 24 && d < bestDist) { bestDist = d; bestEid = e.eid; }
    }
    if (bestEid !== null) handleCommand({ t: 'focusMark', eid: bestEid });
  }

  onMount(() => {
    const save = readSave();
    console.log('[boot] Save geladen, schemaVersion', save.schemaVersion);
    boot();
    return () => clock?.stop();
  });
</script>

<main>
  <header><ResourceBar /></header>
  <WaveControl onCommand={handleCommand} onRestart={handleRestart} />
  <div class="stage">
    <canvas bind:this={canvas} width="640" height="560" onclick={handleCanvasClick}></canvas>
    <BuildPanel onCommand={handleCommand} />
  </div>
</main>

<style>
  :global(body) { margin: 0; background: #0b1026; color: #F2F5FF; font-family: 'Nunito Sans', system-ui, sans-serif; }
  main { max-width: 1040px; margin: 0 auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
  .stage { display: flex; gap: 16px; align-items: flex-start; }
  canvas { border-radius: 12px; background: #0B1026; flex: 0 0 auto; cursor: crosshair; }
</style>
