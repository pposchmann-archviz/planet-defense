<!-- src/ui/panels/BuildMenu.svelte -->
<script lang="ts">
  import { gameStore } from '../stores/gameStore.svelte';
  import { ECO_BUILDING_IDS, WEAPON_BUILDING_IDS } from '../../content/buildings';
  import { buildTile } from '../hud/model';
  import { fmt } from '../format';
  import BuildingIcon from './BuildingIcon.svelte';
  import type { UICommand } from '../../sim/commands/command';

  let { onCommand }: { onCommand: (c: UICommand) => void } = $props();
  const snap = $derived(gameStore.snapshot);

  let open = $state(true);
  let tab = $state<'eco' | 'weapon'>('eco');
  const ids = $derived(tab === 'eco' ? ECO_BUILDING_IDS : WEAPON_BUILDING_IDS);
  const tiles = $derived(ids.map((id) => buildTile(snap, id)));
</script>

<div class="buildmenu">
  <button class="toggle" onclick={() => (open = !open)} aria-expanded={open}>
    <BuildingIcon id="geschuetz" size={16} />
    <span>Bauen</span>
    <svg class="chev" class:up={open} width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  </button>

  {#if open}
    <div class="menu">
      <div class="tabs" role="tablist" aria-label="Bau-Kategorie">
        <button role="tab" aria-selected={tab === 'eco'} class:active={tab === 'eco'} onclick={() => (tab = 'eco')}>Eco</button>
        <button role="tab" aria-selected={tab === 'weapon'} class:active={tab === 'weapon'} onclick={() => (tab = 'weapon')}>Waffen</button>
      </div>

      <div class="grid">
        {#each tiles as t (t.id)}
          <button
            class="tile"
            class:locked={t.locked}
            disabled={!t.buildable}
            title={t.locked ? `${t.nameDe} (im Skilltree freischalten)` : t.nameDe}
            onclick={() => onCommand({ t: 'build', buildingId: t.id })}
          >
            <span class="ic"><BuildingIcon id={t.id} size={26} /></span>
            <span class="nm">{t.nameDe}</span>
            <span class="stats">
              {#if t.powerGen > 0}<span class="pwr">+{t.powerGen} Strom</span>{/if}
              {#if t.powerCost > 0}<span class="pwr neg">−{t.powerCost} Strom</span>{/if}
              {#if t.producesOre > 0}<span class="ore">+{t.producesOre} Erz/s</span>{/if}
              {#if t.damage > 0}<span class="dmg">{t.damage} Schaden</span>{/if}
              {#each t.tags as tag}<span class="tag">{tag}</span>{/each}
            </span>
            {#if t.locked}
              <span class="cost lk">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                gesperrt
              </span>
            {:else}
              <span class="cost">{fmt(t.cost)} Erz</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .buildmenu { display: flex; flex-direction: column; gap: 10px; }
  .toggle {
    align-self: flex-start; display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 16px; background: #1E2748; border: 1px solid #2C3760; border-radius: 12px;
    color: #F2F5FF; font-weight: 800; font-size: 14px; cursor: pointer; transition: border-color 0.18s ease;
  }
  .toggle:hover { border-color: #4DD0C2; }
  .toggle:focus-visible { outline: 2px solid #4DD0C2; outline-offset: 2px; }
  .chev { transition: transform 0.2s ease; }
  .chev.up { transform: rotate(180deg); }

  .menu { background: #141A33; border-radius: 14px; padding: 14px; }
  .tabs { display: inline-flex; gap: 4px; padding: 4px; background: #0B1026; border-radius: 10px; margin-bottom: 12px; }
  .tabs button {
    padding: 6px 18px; border: none; border-radius: 7px; background: transparent;
    color: #9AA6D4; font-weight: 800; font-size: 13px; cursor: pointer; transition: background 0.18s ease, color 0.18s ease;
  }
  .tabs button.active { background: #2C3760; color: #F2F5FF; }
  .tabs button:focus-visible { outline: 2px solid #4DD0C2; outline-offset: 1px; }

  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .tile {
    display: grid; grid-template-rows: auto auto 1fr auto; gap: 4px; min-height: 116px;
    padding: 12px 12px 10px; background: #1E2748; border: 1px solid #2C3760; border-radius: 12px;
    color: #F2F5FF; cursor: pointer; text-align: left; transition: border-color 0.18s ease, transform 0.18s ease;
  }
  .tile:hover:not(:disabled) { border-color: #4DD0C2; transform: translateY(-1px); }
  .tile:focus-visible { outline: 2px solid #4DD0C2; outline-offset: 2px; }
  .tile:disabled { opacity: 0.5; cursor: not-allowed; }
  .tile.locked { opacity: 0.55; }
  .ic { color: #7FFFE6; }
  .tile.locked .ic { color: #5A6699; }
  .nm { font-weight: 800; font-size: 13.5px; }
  .stats { display: flex; flex-wrap: wrap; gap: 4px 8px; font-size: 10.5px; font-weight: 700; align-content: start; }
  .pwr { color: #FFC53D; } .pwr.neg { color: #FFB020; } .ore { color: #4DD0C2; } .dmg { color: #FF8A8A; }
  .tag { color: #5AB0FF; background: #1B2F4A; padding: 0 6px; border-radius: 6px; }
  .cost { font-weight: 800; color: #4DD0C2; font-variant-numeric: tabular-nums; font-size: 12px; }
  .cost.lk { display: inline-flex; align-items: center; gap: 4px; color: #9AA6D4; }

  @media (prefers-reduced-motion: reduce) {
    .toggle, .chev, .tabs button, .tile { transition: none; }
  }
</style>
