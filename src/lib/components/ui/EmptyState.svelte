<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title, description, action }: { title: string; description: string; action?: Snippet } = $props();
</script>
<div><span aria-hidden="true">✦</span><h3>{title}</h3><p>{description}</p>{#if action}<footer>{@render action()}</footer>{/if}</div>
<style>div { display: grid; justify-items: center; padding: var(--space-10) var(--space-5); text-align: center; color: var(--color-muted); } span { display: grid; width: 3rem; height: 3rem; place-items: center; margin-bottom: var(--space-3); border-radius: 50%; background: var(--color-brand-soft); color: var(--color-brand); font-size: 1.3rem; } h3 { margin-bottom: var(--space-2); } p { max-width: 34rem; } footer { margin-top: var(--space-2); }</style>
