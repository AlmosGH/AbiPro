<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children, label = 'Filter' }: { children: Snippet; label?: string } = $props();
</script>
<details><summary>{label}<span>Öffnen</span></summary><div>{@render children()}</div></details>
<style>details { padding: 0; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow-sm); } summary { display: none; min-height: 2.75rem; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-4); color: var(--color-ink); font-weight: 700; cursor: pointer; } summary span { color: var(--color-brand); font-size: .8rem; } details > div { padding: var(--space-4); } @media(min-width: 48rem) { details:not([open]) > div { display: block; } } @media(max-width: 47.99rem) { summary { display: flex; } details:not([open]) > div { display: none; } details[open] summary { border-bottom: 1px solid var(--color-border); } }</style>
