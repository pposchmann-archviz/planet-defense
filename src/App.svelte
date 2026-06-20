<!-- src/App.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { createInitialState } from './sim/core/GameState';
  import { deriveUnlocks } from './sim/meta';
  import { Canvas2DRenderer } from './render/Canvas2DRenderer';
  import { GameClock } from './app/GameClock';
  import { readSave } from './persistence/storage';
  import { gameStore } from './ui/stores/gameStore.svelte';
  import { metaStore } from './ui/stores/metaStore.svelte';
  import { Session, type MetaStore } from './app/session';
  import type { GameState } from './sim/core/GameState';
  import type { RunEndBreakdown } from './app/session';
  import { planetView, surfacePoint, buildingLonLat } from './render/globeProjection';
  import { pickFrontBuilding, pickEnemy } from './render/hitTest';
  import type { UICommand } from './sim/commands/command';
  import ResourceBar from './ui/panels/ResourceBar.svelte';
  import BuildMenu from './ui/panels/BuildMenu.svelte';
  import WaveControl from './ui/panels/WaveControl.svelte';
  import SkillTreePanel from './ui/panels/SkillTreePanel.svelte';
  import TurretPopover from './ui/panels/TurretPopover.svelte';

  const CANVAS_W = 640, CANVAS_H = 560;
  let canvas: HTMLCanvasElement;
  let clock: GameClock | undefined;
  const SEED = 12345;

  const META_KEY = 'planet_defense_meta_v1';
  const browserMetaStore: MetaStore = {
    read() { try { return localStorage.getItem(META_KEY); } catch { return null; } },
    write(raw: string) { try { localStorage.setItem(META_KEY, raw); } catch { /* ignore */ } },
  };
  const session = new Session(browserMetaStore);
  metaStore.push(session.meta);

  let lastBreakdown = $state<RunEndBreakdown | null>(null);
  let showSkilltree = $state(false);
  let selectedTurretIid = $state<number | null>(null);

  const snap = $derived(gameStore.snapshot);

  // Popover-Position: exakt dieselbe Globus-Mathe wie der Renderer (timeS aus dem Snapshot).
  const popoverPos = $derived.by(() => {
    if (selectedTurretIid === null) return null;
    const b = snap.buildings.find((x) => x.iid === selectedTurretIid);
    if (!b) return null;
    const view = planetView(CANVAS_W, CANVAS_H);
    const ll = buildingLonLat(b);
    return surfacePoint(ll.lon, ll.lat, snap.timeS, view);
  });

  // Schließen, sobald das Gebäude weg ist, nach hinten rotiert oder die Phase wechselt.
  $effect(() => {
    if (selectedTurretIid === null) return;
    const gone = !snap.buildings.some((b) => b.iid === selectedTurretIid);
    const back = popoverPos !== null && popoverPos.depth <= 0.05;
    if (gone || back || snap.phase !== 'BUILD') selectedTurretIid = null;
  });

  function handleCommand(cmd: UICommand) { clock?.enqueue(cmd); }

  function boot() {
    lastBreakdown = null;
    selectedTurretIid = null;
    const unlocks = ['kraftwerk', 'erz_sammler', 'geschuetz', ...deriveUnlocks(session.meta.skillNodes)];
    const state = createInitialState(SEED, session.runMods(), unlocks);
    const renderer = new Canvas2DRenderer(canvas);
    clock?.stop();
    clock = new GameClock(state, renderer);
    clock.onRunEnd = (s: GameState) => {
      const bd = session.endRun({ highestRoundCleared: s.highestRoundCleared, bossesKilledThisRun: s.bossesKilledThisRun });
      lastBreakdown = bd;
      metaStore.push(session.meta);
    };
    clock.start();
    metaStore.push(session.meta);
  }
  function handleRestart() { boot(); }

  function buySkill(id: string) { session.buy(id); metaStore.push(session.meta); }

  function handleCanvasClick(ev: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
    const view = planetView(CANVAS_W, CANVAS_H);

    if (snap.phase === 'BUILD') {
      const iid = pickFrontBuilding(snap.buildings, snap.timeS, view, mx, my);
      selectedTurretIid = iid; // Treffer wählt aus, Leerklick schließt
      return;
    }
    if (snap.phase === 'COMBAT' && !snap.focusUsed) {
      const eid = pickEnemy(snap.enemies, view, CANVAS_W, CANVAS_H, mx, my);
      if (eid !== null) handleCommand({ t: 'focusMark', eid });
    }
  }

  onMount(() => {
    const save = readSave();
    console.log('[boot] Save geladen, schemaVersion', save.schemaVersion);
    boot();
    return () => clock?.stop();
  });
</script>

<main>
  {#if showSkilltree}
    <SkillTreePanel onBuy={buySkill} onClose={() => (showSkilltree = false)} />
  {:else}
    <header class="topbar">
      <ResourceBar />
      <button class="skilltree-btn" onclick={() => (showSkilltree = true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="5" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="18" r="2.5" />
          <path d="M12 7.5v4M12 11.5 7 15.8M12 11.5l5 4.3" />
        </svg>
        Skilltree
      </button>
    </header>

    <div class="stage">
      <div class="canvas-wrap" style="width:{CANVAS_W}px; height:{CANVAS_H}px;">
        <canvas bind:this={canvas} width={CANVAS_W} height={CANVAS_H} onclick={handleCanvasClick}></canvas>
        {#if selectedTurretIid !== null && popoverPos}
          <TurretPopover
            iid={selectedTurretIid}
            x={popoverPos.x}
            y={popoverPos.y}
            onCommand={handleCommand}
            onClose={() => (selectedTurretIid = null)}
          />
        {/if}
      </div>
    </div>

    <WaveControl onCommand={handleCommand} onRestart={handleRestart} onOpenSkilltree={() => (showSkilltree = true)} breakdown={lastBreakdown} />

    {#if snap.phase === 'BUILD'}
      <BuildMenu onCommand={handleCommand} />
    {/if}
  {/if}
</main>

<style>
  :global(body) { margin: 0; background: #0b1026; color: #F2F5FF; font-family: 'Nunito Sans', system-ui, sans-serif; }
  main { max-width: 1040px; margin: 0 auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
  .topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .skilltree-btn {
    display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px;
    background: #1E2748; border: 1px solid #2C3760; border-radius: 999px; color: #FF7A59;
    font-weight: 800; font-size: 13px; cursor: pointer; transition: border-color 0.18s ease;
  }
  .skilltree-btn:hover { border-color: #FF7A59; }
  .skilltree-btn:focus-visible { outline: 2px solid #FF7A59; outline-offset: 2px; }
  .stage { display: flex; justify-content: center; }
  .canvas-wrap { position: relative; flex: 0 0 auto; }
  canvas { display: block; border-radius: 12px; background: #0B1026; cursor: crosshair; }
  @media (prefers-reduced-motion: reduce) { .skilltree-btn { transition: none; } }
</style>
