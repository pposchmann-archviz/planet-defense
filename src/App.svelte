<script lang="ts">
  import { onMount } from 'svelte';
  import { createInitialState } from './sim/core/GameState';
  import { Canvas2DRenderer } from './render/Canvas2DRenderer';
  import { GameClock } from './app/GameClock';
  import { readSave } from './persistence/storage';

  let canvas: HTMLCanvasElement;

  onMount(() => {
    const save = readSave(); // Save-Stub exerzieren (M0: nur Boot-Check)
    console.log('[boot] Save geladen, schemaVersion', save.schemaVersion);

    const state = createInitialState(12345);
    const renderer = new Canvas2DRenderer(canvas);
    const clock = new GameClock(state, renderer);
    clock.start();
    return () => clock.stop();
  });
</script>

<canvas bind:this={canvas} width="800" height="600"></canvas>

<style>
  :global(body) {
    margin: 0;
    background: #0b1026;
    display: grid;
    place-items: center;
    height: 100vh;
  }
  canvas {
    border-radius: 12px;
  }
</style>
