<script lang="ts">
  import { onMount } from 'svelte';
  import { createInitialState } from './sim/core/GameState';
  import { Canvas2DRenderer } from './render/Canvas2DRenderer';
  import { GameClock } from './app/GameClock';
  import { readSave } from './persistence/storage';
  import { gameStore } from './ui/stores/gameStore.svelte';
  import { metaStore } from './ui/stores/metaStore.svelte';
  import { Session, type MetaStore } from './app/session';
  import type { GameState } from './sim/core/GameState';
  import type { RunEndBreakdown } from './app/session';
  import { pathPosition } from './sim/core/geometry';
  import { viewScale } from './render/viewport';
  import type { UICommand } from './sim/commands/command';
  import ResourceBar from './ui/panels/ResourceBar.svelte';
  import BuildPanel from './ui/panels/BuildPanel.svelte';
  import WaveControl from './ui/panels/WaveControl.svelte';

  let canvas: HTMLCanvasElement;
  let clock: GameClock | undefined;
  const SEED = 12345;

  // localStorage-gekapselter MetaStore (try/catch, headless-sicher).
  const META_KEY = 'planet_defense_meta_v1';
  const browserMetaStore: MetaStore = {
    read() {
      try { return localStorage.getItem(META_KEY); } catch { return null; }
    },
    write(raw: string) {
      try { localStorage.setItem(META_KEY, raw); } catch { /* ignore */ }
    },
  };
  const session = new Session(browserMetaStore);

  // Run-Ende-Aufschlüsselung für die Anzeige + Skilltree-Screen-Toggle.
  let lastBreakdown = $state<RunEndBreakdown | null>(null);
  let showSkilltree = $state(false);

  function handleCommand(cmd: UICommand) { clock?.enqueue(cmd); }

  function boot() {
    lastBreakdown = null;
    const state = createInitialState(SEED, session.runMods());
    const renderer = new Canvas2DRenderer(canvas);
    clock?.stop();
    clock = new GameClock(state, renderer);
    clock.onRunEnd = (s: GameState) => {
      const bd = session.endRun({
        highestRoundCleared: s.highestRoundCleared,
        bossesKilledThisRun: s.bossesKilledThisRun,
      });
      lastBreakdown = bd;
      metaStore.push(session.meta);
    };
    clock.start();
    metaStore.push(session.meta);
  }
  function handleRestart() { boot(); }

  function buySkill(id: string) {
    session.buy(id);
    metaStore.push(session.meta);
  }

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
  <!-- Task 6 verdrahtet SkillTreePanel + WaveControl-Breakdown. Wiring (Session/Toggle/Buy) ist bereits aktiv. -->
  {#if showSkilltree}
    <div class="skilltree-host">
      Skilltree ({metaStore.snapshot.techPoints} TP)
      <button onclick={() => buySkill('p_stromcap')}>Netzausbau kaufen</button>
      <button onclick={() => (showSkilltree = false)}>Schließen</button>
    </div>
  {:else if lastBreakdown}
    <div class="run-end-host">
      +{lastBreakdown.gained} Tech-Punkte
      <button onclick={() => (showSkilltree = true)}>Skilltree</button>
    </div>
  {/if}
</main>

<style>
  :global(body) { margin: 0; background: #0b1026; color: #F2F5FF; font-family: 'Nunito Sans', system-ui, sans-serif; }
  main { max-width: 1040px; margin: 0 auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
  .stage { display: flex; gap: 16px; align-items: flex-start; }
  canvas { border-radius: 12px; background: #0B1026; flex: 0 0 auto; cursor: crosshair; }
  .skilltree-host, .run-end-host { background: #141A33; border-radius: 12px; padding: 14px; display: flex; gap: 12px; align-items: center; }
  .skilltree-host button, .run-end-host button { background: #4DD0C2; color: #06121f; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 800; cursor: pointer; }
</style>
