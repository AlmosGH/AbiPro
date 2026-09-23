<script lang="ts">
	import type { LearnerTaskSource } from '$lib/types/tasks';
	import { getLanguageContext } from '$lib/i18n';

	interface Props { sources: LearnerTaskSource[] }
	let { sources }: Props = $props();
	const language = getLanguageContext();

	function record(value: unknown): Record<string, unknown> {
		return value && typeof value === 'object' && !Array.isArray(value)
			? value as Record<string, unknown>
			: {};
	}
	function stringValue(value: unknown) { return typeof value === 'string' ? value : ''; }
	function positiveNumber(value: unknown, fallback: number) { return typeof value === 'number' && value > 0 ? value : fallback; }
	function stringArray(value: unknown) {
		return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
	}
	function rows(value: unknown) { return Array.isArray(value) ? value.map(stringArray) : []; }
	function validTable(headers: string[], body: string[][]) {
		return headers.length > 0 && body.length > 0 && body.every((row) => row.length === headers.length);
	}
</script>

<details class="source-drawer" open>
	<summary>{language.t('Quellen anzeigen')} <span>{sources.length}</span></summary>
	<div class="source-list">
{#each sources as source (source.id)}
	{@const content = record(source.content)}
	{@const text = stringValue(content.text)}
	{@const headers = stringArray(content.headers)}
	{@const body = rows(content.rows)}
	{@const hasStructuredText = source.kind === 'text' && text.length > 0}
	{@const hasStructuredTable = source.kind === 'table' && validTable(headers, body)}
	{@const imageWidth = positiveNumber(content.width, 1200)}
	{@const imageHeight = positiveNumber(content.height, 1697)}
	<article>
		<h3>{source.title ?? `${language.t('Quelle')} ${source.position + 1}`}</h3>
		{#if source.assetUrl}
			<a class="source-image" href={source.assetUrl} target="_blank" rel="noreferrer" title={language.t('Quelle in voller Größe öffnen')}><img src={source.assetUrl} alt={source.assetAltText || source.title || language.t('Originalseite der Aufgabe')} width={imageWidth} height={imageHeight} sizes="(max-width: 768px) calc(100vw - 3rem), (max-width: 1280px) 38vw, 480px" loading={source.position === 0 ? 'eager' : 'lazy'} fetchpriority={source.position === 0 ? 'high' : 'auto'} /></a>
		{:else if stringValue(content.url)}
			<a class="source-image" href={stringValue(content.url)} target="_blank" rel="noreferrer" title={language.t('Quelle in voller Größe öffnen')}><img src={stringValue(content.url)} alt={stringValue(content.alt) || source.title || language.t('Quelle der Aufgabe')} width={imageWidth} height={imageHeight} sizes="(max-width: 768px) calc(100vw - 3rem), (max-width: 1280px) 38vw, 480px" loading={source.position === 0 ? 'eager' : 'lazy'} fetchpriority={source.position === 0 ? 'high' : 'auto'} /></a>
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
			<p>{language.t('Quelle nicht verfügbar.')}</p>
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
	.source-image { display: block; overflow: auto; min-height: 12rem; border-radius: var(--radius-md); background: var(--color-surface-soft); cursor: zoom-in; }
	.source-image img { display: block; width: 100%; height: auto; }
	@media(min-width: 48rem) { summary { display: none; } }
	@media(max-width: 47.99rem) { summary { display: flex; } details[open] summary { margin-bottom: var(--space-4); } }
</style>
