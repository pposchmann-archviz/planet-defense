<!-- src/ui/panels/BuildingIcon.svelte -->
<script lang="ts">
  // Geometrische SVG-Glyphe je Gebäude-id. Farbe via currentColor (Parent setzt color).
  let { id, size = 22 }: { id: string; size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if id === 'kraftwerk'}
    <path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="currentColor" stroke="none" />
  {:else if id === 'erz_sammler'}
    <path d="M12 2 3 9l9 13 9-13z" fill="currentColor" stroke="none" />
  {:else if id === 'geschuetz'}
    <circle cx="9" cy="15" r="5" /><path d="M12 12 21 5" />
  {:else if id === 'artillery'}
    <circle cx="7" cy="17" r="4" /><path d="M9 14 19 7" /><path d="M16 5h4v4" />
  {:else if id === 'laser'}
    <circle cx="6" cy="12" r="3" /><path d="M9 12h12" /><path d="M18 9l3 3-3 3" />
  {:else if id === 'railgun'}
    <rect x="3" y="10" width="8" height="4" rx="1" /><path d="M11 12h10" />
  {:else if id === 'frost'}
    <path d="M12 2v20M4 7l16 10M20 7 4 17" />
  {:else if id === 'flak'}
    <path d="M5 14l7-7 7 7" /><path d="M5 19l7-7 7 7" />
  {:else}
    <circle cx="12" cy="12" r="8" />
  {/if}
</svg>
