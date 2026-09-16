<script lang="ts">
	import type { Snippet } from 'svelte';
	let { label, name, value = $bindable(''), children }: { label: string; name: string; value?: string; children: Snippet } = $props();
</script>

<label>{label}<select {name} bind:value>{@render children()}</select></label>
<style>label { display: grid; gap: var(--space-2); color: #33423b; font-size: .9rem; font-weight: 700; }</style>
