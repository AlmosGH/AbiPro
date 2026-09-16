<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	let { label, name, type = 'text', value = $bindable(''), placeholder, required = false, help, autocomplete }: { label: string; name: string; type?: string; value?: string; placeholder?: string; required?: boolean; help?: string; autocomplete?: HTMLInputAttributes['autocomplete'] } = $props();
	const helpId = $derived(`${name}-help`);
</script>

<label>{label}<input {name} {type} bind:value {placeholder} {required} {autocomplete} aria-describedby={help ? helpId : undefined} />{#if help}<span id={helpId}>{help}</span>{/if}</label>

<style>label { display: grid; gap: var(--space-2); color: #33423b; font-size: .9rem; font-weight: 700; } span { color: var(--color-muted); font-size: .78rem; font-weight: 400; }</style>
