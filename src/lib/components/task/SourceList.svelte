<script lang="ts">
	import type { LearnerTaskSource } from '$lib/types/tasks';

	interface Props { sources: LearnerTaskSource[] }
	let { sources }: Props = $props();

	function record(value: unknown): Record<string, unknown> {
		return value && typeof value === 'object' && !Array.isArray(value)
			? value as Record<string, unknown>
			: {};
	}
	function stringValue(value: unknown) { return typeof value === 'string' ? value : ''; }
	function stringArray(value: unknown) {
		return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
	}
	function rows(value: unknown) { return Array.isArray(value) ? value.map(stringArray) : []; }
	function validTable(headers: string[], body: string[][]) {
		return headers.length > 0 && body.length > 0 && body.every((row) => row.length === headers.length);
	}
</script>

<details class="source-drawer">
	<summary>Quellen anzeigen <span>{sources.length}</span></summary>
	<div class="source-list">
{#each sources as source (source.id)}
	{@const content = record(source.content)}
	{@const text = stringValue(content.text)}
	{@const headers = stringArray(content.headers)}
	{@const body = rows(content.rows)}
	{@const hasStructuredText = source.kind === 'text' && text.length > 0}
	{@const hasStructuredTable = source.kind === 'table' && validTable(headers, body)}
	<article>
		<h3>{source.title ?? `Quelle ${source.position + 1}`}</h3>
		{#if source.assetUrl}
			<img src={source.assetUrl} alt={source.assetAltText || source.title || 'Originalseite der Aufgabe'} loading="lazy" />
		{:else if stringValue(content.url)}
			<img src={stringValue(content.url)} alt={stringValue(content.alt) || source.title || 'Quelle der Aufgabe'} loading="lazy" />
		{:else if hasStructuredText}
			<p>{text}</p>
		{:else if hasStructuredTable}
			<table>
				<thead><tr>{#each headers as header (header)}<th scope="col">{header}</th>{/each}</tr></thead>
				<tbody>
					{#each body as row, rowIndex (`${source.id}-${rowIndex}`)}
						<tr>{#each row as cell, cellIndex (`${source.id}-${rowIndex}-${cellIndex}`)}<td>{cell}</td>{/each}</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p>Quelle nicht verfügbar.</p>
		{/if}
	</article>
{/each}
	</div>
</details>

<style>
	.source-drawer { padding: 0; border: 0; background: transparent; }
	summary { display: none; min-height: 2.75rem; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); }
	summary span { display: grid; min-width: 1.5rem; height: 1.5rem; place-items: center; border-radius: 999px; background: var(--color-brand-soft); color: var(--color-brand-strong); font-size: .75rem; }
	.source-list { display: grid; gap: var(--space-4); }
	article { padding: var(--space-5); border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow-sm); }
	article h3 { margin-bottom: var(--space-4); }
	@media(min-width: 48rem) { details:not([open]) > .source-list { display: grid; } }
	@media(max-width: 47.99rem) { summary { display: flex; } details[open] summary { margin-bottom: var(--space-4); } }
</style>
