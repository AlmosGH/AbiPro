<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children, tone = 'neutral' }: { children: Snippet; tone?: 'neutral' | 'success' | 'warning' | 'accent' } = $props();
</script>
<span class:success={tone === 'success'} class:warning={tone === 'warning'} class:accent={tone === 'accent'}>{@render children()}</span>
<style>span { display: inline-flex; min-height: 1.65rem; align-items: center; padding: .2rem .55rem; border-radius: 999px; background: var(--color-surface-soft); color: var(--color-muted); font-size: .75rem; font-weight: 700; white-space: nowrap; } .success { background: var(--color-brand-soft); color: var(--color-brand-strong); } .warning { background: var(--color-warning-soft); color: var(--color-warning); } .accent { background: var(--color-accent-soft); color: #934617; }</style>
