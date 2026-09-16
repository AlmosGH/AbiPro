<script lang="ts">
	let { label, name, checked = $bindable(false) }: { label: string; name: string; checked?: boolean } = $props();
</script>
<label><input type="checkbox" {name} bind:checked /><span>{label}</span></label>
<style>label { display: inline-flex; min-height: 2.75rem; align-items: center; gap: var(--space-2); cursor: pointer; } input { flex: none; }</style>
