<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children, tone = 'info', title }: { children: Snippet; tone?: 'info' | 'success' | 'warning' | 'danger'; title?: string } = $props();
</script>
<div role={tone === 'danger' ? 'alert' : 'status'} class:success={tone === 'success'} class:warning={tone === 'warning'} class:danger={tone === 'danger'}>{#if title}<strong>{title}</strong>{/if}<div>{@render children()}</div></div>
<style>div[role] { display: grid; gap: var(--space-1); padding: var(--space-4); border: 1px solid #bad0f5; border-radius: var(--radius-md); background: var(--color-info-soft); color: #123d79; } .success { border-color: #b9ddce !important; background: var(--color-brand-soft) !important; color: var(--color-brand-strong) !important; } .warning { border-color: #edd58e !important; background: var(--color-warning-soft) !important; color: var(--color-warning) !important; } .danger { border-color: #f3b6b0 !important; background: var(--color-danger-soft) !important; color: var(--color-danger) !important; } :global(div[role] p:last-child) { margin-bottom: 0; }</style>
