<script lang="ts">
  import { metaStore } from '../stores/metaStore.svelte';
  import { SKILL_NODE_IDS, SKILL_NODES } from '../../content/skilltree';
  import { nodeCost } from '../../sim/formulas';

  let { onBuy, onClose }: { onBuy: (id: string) => void; onClose: () => void } = $props();
  const meta = $derived(metaStore.snapshot);
</script>

<div class="tree">
  <header>
    <h2>Skilltree</h2>
    <span class="tp">{meta.techPoints} Tech-Punkte</span>
    <button class="close" onclick={() => onClose()}>Schließen</button>
  </header>
  <div class="nodes">
    {#each SKILL_NODE_IDS as id (id)}
      {@const node = SKILL_NODES[id]}
      {@const level = meta.skillNodes[id] ?? 0}
      {@const maxed = level >= node.maxStufe}
      {@const cost = nodeCost(node, level)}
      <div class="node {node.branch}">
        <div class="name">
          {node.nameDe}
          {#if node.typ === 'unlock'}
            <span class="lvl">{level >= 1 ? 'freigeschaltet' : 'gesperrt'}</span>
          {:else}
            <span class="lvl">{level}/{node.maxStufe}</span>
          {/if}
        </div>
        <div class="desc">{node.beschreibung}</div>
        <button disabled={maxed || meta.techPoints < cost} onclick={() => onBuy(id)}>
          {#if node.typ === 'unlock'}
            {maxed ? 'freigeschaltet' : `Freischalten · ${cost} TP`}
          {:else}
            {maxed ? 'Max' : `Kaufen · ${cost} TP`}
          {/if}
        </button>
      </div>
    {/each}
  </div>
</div>

<style>
  .tree { background: #141A33; border-radius: 14px; padding: 18px; max-width: 760px; margin: 0 auto; }
  header { display: flex; align-items: center; gap: 16px; margin-bottom: 14px; }
  h2 { margin: 0; font-size: 18px; }
  .tp { color: #FF7A59; font-weight: 800; font-variant-numeric: tabular-nums; }
  .close { margin-left: auto; background: #2C3760; border: none; color: #F2F5FF; padding: 8px 14px; border-radius: 9px; cursor: pointer; font-weight: 700; transition: background 0.18s ease; }
  .close:hover { background: #3a477a; }
  .close:focus-visible { outline: 2px solid #4DD0C2; outline-offset: 2px; }
  .nodes { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
  .node { background: #1E2748; border: 1px solid #2C3760; border-radius: 12px; padding: 12px; }
  .node.eco { border-left: 3px solid #4DD0C2; } .node.defense { border-left: 3px solid #FF4D5E; } .node.survival { border-left: 3px solid #FFC53D; }
  .name { font-weight: 800; } .lvl { color: #9AA6D4; font-size: 12px; font-variant-numeric: tabular-nums; }
  .desc { font-size: 12px; color: #9AA6D4; margin: 6px 0 10px; }
  button { width: 100%; background: #4DD0C2; color: #06121f; border: none; padding: 8px; border-radius: 9px; font-weight: 800; cursor: pointer; font-variant-numeric: tabular-nums; transition: opacity 0.18s ease; }
  button:hover:not(:disabled) { opacity: 0.9; }
  button:focus-visible { outline: 2px solid #F2F5FF; outline-offset: 2px; }
  button:disabled { opacity: .45; cursor: not-allowed; background: #2C3760; color: #9AA6D4; }
  @media (prefers-reduced-motion: reduce) { .close, button { transition: none; } }
</style>
