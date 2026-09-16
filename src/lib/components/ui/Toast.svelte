<script lang="ts">
	let { message, tone = 'success' }: { message: string; tone?: 'success' | 'danger' } = $props();
</script>
<div role={tone === 'danger' ? 'alert' : 'status'} class:danger={tone === 'danger'}>{message}</div>
<style>div { position: fixed; z-index: 50; right: var(--space-5); bottom: var(--space-5); max-width: 24rem; padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); background: var(--color-ink); color: white; box-shadow: var(--shadow-md); } .danger { background: var(--color-danger); }</style>
