<!-- src/ui/panels/TurretPopover.svelte -->
<script lang="ts">
  import { gameStore } from '../stores/gameStore.svelte';
  import { popoverModel } from '../hud/model';
  import { fmt } from '../format';
  import BuildingIcon from './BuildingIcon.svelte';
  import { getBuilding } from '../../content/buildings';
  import type { UICommand } from '../../sim/commands/command';

  // x/y = Bildschirmposition des Gebäudes im Canvas (px). iid = ausgewähltes Gebäude.
  let { iid, x, y, onCommand, onClose }:
    { iid: number; x: number; y: number; onCommand: (c: UICommand) => void; onClose: () => void } = $props();

  const snap = $derived(gameStore.snapshot);
  const model = $derived(popoverModel(snap, iid));
  const defId = $derived(snap.buildings.find((b) => b.iid === iid)?.defId ?? 'geschuetz');
  const accent = $derived(getBuilding(defId).category === 'eco' ? '#4DD0C2' : '#7FFFE6');
</script>

{#if model}
  <div class="popover" style="left:{x}px; top:{y}px;" role="dialog" aria-label="{model.nameDe} verwalten">
    <button class="x" onclick={() => onClose()} aria-label="Schließen">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>

    <header>
      <span class="ic" style="color:{accent}"><BuildingIcon id={defId} size={20} /></span>
      <span class="title">{model.nameDe}</span>
      <span class="lvl">Lv {model.level}/{model.maxLevel}</span>
    </header>

    <div class="stats">
      {#if model.isWeapon}
        <span><b>{model.damage}</b> Schaden</span>
        <span><b>{model.range}</b> Reichw.</span>
      {:else if model.producesOre > 0}
        <span><b>+{model.producesOre}</b> Erz/s</span>
      {/if}
    </div>

    <button class="up" disabled={!model.canUpgrade} onclick={() => onCommand({ t: 'upgrade', iid: model.iid })}>
      {model.maxed ? 'Maximal ausgebaut' : `Upgrade · ${fmt(model.upgradeCost)} Erz`}
    </button>
  </div>
{/if}

<style>
  .popover {
    position: absolute; transform: translate(-50%, calc(-100% - 16px)); z-index: 30;
    min-width: 180px; padding: 12px 12px 12px; background: #141A33; border: 1px solid #2C3760;
    border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45); color: #F2F5FF;
  }
  .popover::after { /* Pfeil nach unten zum Turm */
    content: ''; position: absolute; left: 50%; top: 100%; transform: translateX(-50%);
    border: 7px solid transparent; border-top-color: #141A33;
  }
  .x { position: absolute; top: 6px; right: 6px; width: 22px; height: 22px; display: grid; place-items: center;
    background: transparent; border: none; color: #9AA6D4; cursor: pointer; border-radius: 6px; }
  .x:hover { color: #F2F5FF; background: #1E2748; }
  .x:focus-visible { outline: 2px solid #4DD0C2; outline-offset: 1px; }
  header { display: flex; align-items: center; gap: 8px; padding-right: 22px; }
  .title { font-weight: 800; font-size: 14px; }
  .lvl { margin-left: auto; color: #7FFFE6; font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .stats { display: flex; gap: 14px; margin: 8px 0 10px; font-size: 12px; color: #9AA6D4; font-variant-numeric: tabular-nums; }
  .stats b { color: #F2F5FF; }
  .up { width: 100%; padding: 8px; background: #4DD0C2; color: #06121f; border: none; border-radius: 9px;
    font-weight: 800; font-size: 13px; cursor: pointer; font-variant-numeric: tabular-nums; transition: opacity 0.18s ease; }
  .up:hover:not(:disabled) { opacity: 0.9; }
  .up:disabled { background: #2C3760; color: #9AA6D4; cursor: not-allowed; }
  .up:focus-visible { outline: 2px solid #F2F5FF; outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { .up { transition: none; } }
</style>
