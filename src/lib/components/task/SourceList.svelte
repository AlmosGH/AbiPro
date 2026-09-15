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
</script>

{#each sources as source (source.id)}
	{@const content = record(source.content)}
	<article>
		<h3>{source.title ?? `Quelle ${source.position + 1}`}</h3>
		{#if source.kind === 'text'}
			<p>{stringValue(content.text)}</p>
		{:else if source.kind === 'table'}
			<table>
				<thead><tr>{#each stringArray(content.headers) as header (header)}<th>{header}</th>{/each}</tr></thead>
				<tbody>
					{#each rows(content.rows) as row, rowIndex (`${source.id}-${rowIndex}`)}
						<tr>{#each row as cell, cellIndex (`${source.id}-${rowIndex}-${cellIndex}`)}<td>{cell}</td>{/each}</tr>
					{/each}
				</tbody>
			</table>
		{:else if source.assetUrl}
			<img src={source.assetUrl} alt={source.assetAltText || source.title || ''} />
		{:else if stringValue(content.url)}
			<img src={stringValue(content.url)} alt={stringValue(content.alt) || source.title || ''} />
		{:else}
			<p>{source.kind === 'map' ? 'Karte' : 'Bild'} nicht verfügbar.</p>
		{/if}
	</article>
{/each}
