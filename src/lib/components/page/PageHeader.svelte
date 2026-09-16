<script lang="ts">
	import type { Snippet } from 'svelte';
	let { eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: Snippet } = $props();
</script>
<header>{#if eyebrow}<span>{eyebrow}</span>{/if}<div><section><h1>{title}</h1>{#if description}<p>{description}</p>{/if}</section>{#if actions}<aside>{@render actions()}</aside>{/if}</div></header>
<style>header { margin-bottom: var(--space-8); } header > span { display: block; margin-bottom: var(--space-2); color: var(--color-brand); font-size: .75rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; } header > div { display: flex; justify-content: space-between; gap: var(--space-6); align-items: end; } section { max-width: 45rem; } h1 { margin-bottom: var(--space-3); } p { margin: 0; color: var(--color-muted); font-size: 1.02rem; } aside { display: flex; flex-wrap: wrap; gap: var(--space-3); } @media(max-width: 40rem) { header > div { align-items: stretch; flex-direction: column; } }</style>
