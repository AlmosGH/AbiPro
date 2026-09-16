<script lang="ts">
	let { items, active = $bindable() }: { items: Array<{ label: string; value: string }>; active?: string } = $props();
</script>
<div role="tablist" aria-label="Ansicht wählen">{#each items as item (item.value)}<button type="button" role="tab" aria-selected={active === item.value} onclick={() => active = item.value}>{item.label}</button>{/each}</div>
<style>div { display: inline-flex; gap: var(--space-1); padding: var(--space-1); border-radius: var(--radius-md); background: var(--color-surface-soft); } button { min-height: 2.5rem; border-color: transparent; background: transparent; color: var(--color-muted); } button[aria-selected='true'] { background: var(--color-surface); color: var(--color-ink); box-shadow: var(--shadow-sm); }</style>
