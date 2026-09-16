<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children, padded = true }: { children: Snippet; padded?: boolean } = $props();
</script>
<article class:padded>{@render children()}</article>
<style>article { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow-sm); overflow: hidden; } .padded { padding: var(--space-6); }</style>
