<script lang="ts">
	let { value, label, showValue = true }: { value: number; label: string; showValue?: boolean } = $props();
	const safeValue = $derived(Math.min(100, Math.max(0, value)));
</script>
<div class="meta"><span>{label}</span>{#if showValue}<strong>{Math.round(safeValue)}%</strong>{/if}</div><div class="track" role="progressbar" aria-label={label} aria-valuenow={safeValue} aria-valuemin="0" aria-valuemax="100"><span style={`width: ${safeValue}%`}></span></div>
<style>.meta { display: flex; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-2); color: var(--color-muted); font-size: .82rem; } .track { height: .5rem; overflow: hidden; border-radius: 999px; background: var(--color-surface-soft); } .track span { display: block; height: 100%; border-radius: inherit; background: var(--color-brand); transition: width var(--duration-base); }</style>
