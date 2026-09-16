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
