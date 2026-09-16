<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title, description, action, children }: { title?: string; description?: string; action?: Snippet; children: Snippet } = $props();
</script>
<section>{#if title || action}<header><div>{#if title}<h2>{title}</h2>{/if}{#if description}<p>{description}</p>{/if}</div>{#if action}<aside>{@render action()}</aside>{/if}</header>{/if}<div class="body">{@render children()}</div></section>
<style>section { margin-top: var(--space-8); } header { display: flex; justify-content: space-between; gap: var(--space-5); align-items: end; margin-bottom: var(--space-4); } h2 { margin: 0 0 var(--space-1); } p { margin: 0; color: var(--color-muted); } @media(max-width: 40rem) { header { align-items: stretch; flex-direction: column; } }</style>
