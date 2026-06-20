<script lang="ts">
  import { onMount } from 'svelte';
  import { createInitialState } from './sim/core/GameState';
  import { Canvas2DRenderer } from './render/Canvas2DRenderer';
  import { GameClock } from './app/GameClock';
  import { readSave } from './persistence/storage';
  import type { UICommand } from './sim/commands/command';
  import ResourceBar from './ui/panels/ResourceBar.svelte';
  import BuildPanel from './ui/panels/BuildPanel.svelte';

  let canvas: HTMLCanvasElement;
  let clock: GameClock | undefined;

  function handleCommand(cmd: UICommand) {
    clock?.enqueue(cmd);
  }

  onMount(() => {
    const save = readSave();
    console.log('[boot] Save geladen, schemaVersion', save.schemaVersion);

    const state = createInitialState(12345);
    const renderer = new Canvas2DRenderer(canvas);
    clock = new GameClock(state, renderer);
    clock.start();
    return () => clock?.stop();
  });
</script>

<main>
  <header><ResourceBar /></header>
  <div class="stage">
    <canvas bind:this={canvas} width="640" height="520"></canvas>
    <BuildPanel onCommand={handleCommand} />
  </div>
</main>

<style>
  :global(body) { margin: 0; background: #0b1026; color: #F2F5FF; font-family: 'Nunito Sans', system-ui, sans-serif; }
  main { max-width: 1000px; margin: 0 auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
  .stage { display: flex; gap: 16px; align-items: flex-start; }
  canvas { border-radius: 12px; background: #0B1026; flex: 0 0 auto; }
</style>
