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
        <div class="name">{node.nameDe} <span class="lvl">{level}/{node.maxStufe}</span></div>
        <div class="desc">{node.beschreibung}</div>
        <button disabled={maxed || meta.techPoints < cost} onclick={() => onBuy(id)}>
          {maxed ? 'Max' : `Kaufen · ${cost} TP`}
        </button>
      </div>
    {/each}
  </div>
</div>

<style>
  .tree { background: #141A33; border-radius: 14px; padding: 18px; max-width: 720px; margin: 0 auto; }
  header { display: flex; align-items: center; gap: 16px; margin-bottom: 14px; }
  h2 { margin: 0; font-size: 18px; }
  .tp { color: #FF7A59; font-weight: 800; }
  .close { margin-left: auto; background: #2C3760; border: none; color: #F2F5FF; padding: 8px 14px; border-radius: 8px; cursor: pointer; }
  .nodes { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .node { background: #1E2748; border: 1px solid #2C3760; border-radius: 10px; padding: 12px; }
  .node.eco { border-left: 3px solid #4DD0C2; } .node.defense { border-left: 3px solid #FF4D5E; } .node.survival { border-left: 3px solid #FFC53D; }
  .name { font-weight: 800; } .lvl { color: #9AA6D4; font-size: 12px; }
  .desc { font-size: 12px; color: #9AA6D4; margin: 6px 0 10px; }
  button { width: 100%; background: #4DD0C2; color: #06121f; border: none; padding: 8px; border-radius: 8px; font-weight: 800; cursor: pointer; }
  button:disabled { opacity: .45; cursor: not-allowed; background: #2C3760; color: #9AA6D4; }
</style>
