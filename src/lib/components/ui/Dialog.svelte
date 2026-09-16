<script lang="ts">
	import type { Snippet } from 'svelte';
	let { open = $bindable(false), title, children }: { open?: boolean; title: string; children: Snippet } = $props();
</script>
{#if open}<div class="backdrop" aria-hidden="true"></div><dialog open aria-labelledby="dialog-title"><div class="head"><h2 id="dialog-title">{title}</h2><button type="button" aria-label="Dialog schließen" onclick={() => open = false}>×</button></div>{@render children()}</dialog>{/if}
<style>.backdrop { position: fixed; z-index: 49; inset: 0; background: rgb(14 32 25 / .48); backdrop-filter: blur(3px); } dialog { position: fixed; z-index: 50; inset: 50% auto auto 50%; width: min(34rem, calc(100% - 1.5rem)); max-height: 85vh; margin: 0; padding: var(--space-6); transform: translate(-50%, -50%); border: 0; border-radius: var(--radius-xl); box-shadow: var(--shadow-md); } .head { display: flex; justify-content: space-between; gap: var(--space-4); align-items: start; } h2 { margin: 0; } button { width: 2.75rem; padding: 0; border-color: transparent; background: transparent; color: var(--color-ink); font-size: 1.5rem; }</style>
