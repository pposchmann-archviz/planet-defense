<script lang="ts">
  import { gameStore } from '../stores/gameStore.svelte';
  import { BUILDINGS, ECO_BUILDING_IDS, getBuilding } from '../../content/buildings';
  import { BALANCE } from '../../content/balance';
  import { nextCost } from '../../sim/formulas';
  import { fmt } from '../format';
  import type { UICommand } from '../../sim/commands/command';

  // Callback wird von App.svelte gesetzt und reicht den Befehl an die GameClock-Queue.
  let { onCommand }: { onCommand: (cmd: UICommand) => void } = $props();

  const snap = $derived(gameStore.snapshot);

  function buildCost(defId: string): number {
    const def = getBuilding(defId);
    const count = snap.buildings.filter((b) => b.defId === def.id).length;
    return nextCost(def.baseCost, BALANCE.costGrowth, count);
  }
  function upgradeCost(iid: number): number {
    const b = snap.buildings.find((x) => x.iid === iid)!;
    const def = getBuilding(b.defId);
    return nextCost(def.baseCost, BALANCE.costGrowth, b.level);
  }
</script>

<div class="panel">
  <h2>Bauen</h2>
  {#each ECO_BUILDING_IDS as id (id)}
    {@const def = BUILDINGS[id]}
    {@const cost = buildCost(id)}
    <button class="build" disabled={snap.ore < cost} onclick={() => onCommand({ t: 'build', buildingId: id })}>
      <span class="name">{def.nameDe}</span>
      <span class="meta">
        {#if def.powerGen > 0}<span class="pwr-plus">+{def.powerGen} Strom</span>{/if}
        {#if def.powerCost > 0}<span class="pwr-minus">−{def.powerCost} Strom</span>{/if}
        {#if def.producesOrePerTick > 0}<span class="ore">+{def.producesOrePerTick} Erz/s</span>{/if}
      </span>
      <span class="cost">{fmt(cost)} Erz</span>
    </button>
  {/each}

  {#if snap.buildings.length > 0}
    <h2>Anlagen</h2>
    {#each snap.buildings as b (b.iid)}
      {@const def = getBuilding(b.defId)}
      {@const uc = upgradeCost(b.iid)}
      {@const maxed = b.level >= def.maxLevel}
      <div class="owned">
        <span class="name">{def.nameDe} <span class="lvl">Lv {b.level}</span></span>
        <button class="up" disabled={maxed || snap.ore < uc} onclick={() => onCommand({ t: 'upgrade', iid: b.iid })}>
          {maxed ? 'Max' : `Upgrade · ${fmt(uc)} Erz`}
        </button>
      </div>
    {/each}
  {/if}
</div>

<style>
  .panel { display: flex; flex-direction: column; gap: 8px; width: 280px; padding: 16px; background: #141A33; border-radius: 14px; }
  h2 { font-size: 12px; letter-spacing: 1px; color: #9AA6D4; margin: 8px 0 2px; text-transform: uppercase; }
  .build { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; padding: 10px 12px; background: #1E2748; border: 1px solid #2C3760; border-radius: 10px; color: #F2F5FF; cursor: pointer; text-align: left; }
  .build:hover:not(:disabled) { border-color: #4DD0C2; }
  .build:disabled { opacity: 0.5; cursor: not-allowed; }
  .name { font-weight: 800; font-size: 14px; }
  .meta { grid-column: 1 / -1; display: flex; gap: 8px; font-size: 11px; font-weight: 700; }
  .pwr-plus { color: #FFC53D; } .pwr-minus { color: #FFB020; } .ore { color: #4DD0C2; }
  .cost { align-self: center; font-weight: 800; color: #4DD0C2; font-variant-numeric: tabular-nums; }
  .owned { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #1E2748; border-radius: 8px; }
  .lvl { color: #7FFFE6; font-size: 12px; }
  .up { padding: 6px 10px; background: #2C3760; border: none; border-radius: 8px; color: #F2F5FF; font-weight: 700; cursor: pointer; font-size: 12px; }
  .up:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
