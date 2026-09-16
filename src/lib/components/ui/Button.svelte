<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children, href, variant = 'primary', type = 'button', disabled = false }: { children: Snippet; href?: string; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; type?: 'button' | 'submit' | 'reset'; disabled?: boolean } = $props();
</script>

{#if href}
	<a class:secondary={variant === 'secondary'} class:ghost={variant === 'ghost'} class:danger={variant === 'danger'} {href}>{@render children()}</a>
{:else}
	<button class:secondary={variant === 'secondary'} class:ghost={variant === 'ghost'} class:danger={variant === 'danger'} {type} {disabled}>{@render children()}</button>
{/if}

<style>
	a, button { display: inline-flex; min-height: 2.75rem; align-items: center; justify-content: center; gap: var(--space-2); padding: .65rem 1rem; border: 1px solid var(--color-brand); border-radius: var(--radius-md); background: var(--color-brand); color: white; font-weight: 700; text-decoration: none; cursor: pointer; }
	.secondary { border-color: var(--color-border-strong); background: var(--color-surface); color: var(--color-ink); }
	.ghost { border-color: transparent; background: transparent; color: var(--color-brand-strong); }
	.danger { border-color: var(--color-danger); background: var(--color-danger); color: white; }
	.secondary:hover, .ghost:hover { background: var(--color-surface-soft); color: var(--color-brand-strong); }
</style>
