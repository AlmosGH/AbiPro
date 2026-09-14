<script lang="ts">
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();

	function record(value: unknown): Record<string, unknown> {
		return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
	}
	function stringValue(value: unknown) { return typeof value === 'string' ? value : ''; }
	function stringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
	function rows(value: unknown) { return Array.isArray(value) ? value.map(stringArray) : []; }
</script>

<svelte:head><title>{data.task.title} – Aufgaben – AbiPro</title><meta name="description" content={`${data.task.title}, ${data.task.year}, ${data.task.period}`} /></svelte:head>
<main>
	<p><a href="/aufgaben">Zurück zu den Aufgaben</a></p>
	<h1>{data.task.title}</h1>
	<p>{data.task.year} · {data.task.session === 'spring' ? 'Frühjahr' : 'Herbst'} · {data.task.period} · {data.task.curriculum} · {data.task.maxPoints} Punkte</p>
	<p>Themen: {data.task.topics.join(', ')}</p>
	{#if data.task.instructions}<p>{data.task.instructions}</p>{/if}

	<section>
		<h2>Quellen</h2>
		{#each data.task.sources as source (source.id)}
			{@const content = record(source.content)}
			<article>
				<h3>{source.title ?? `Quelle ${source.position + 1}`}</h3>
				{#if source.kind === 'text'}<p>{stringValue(content.text)}</p>
				{:else if source.kind === 'table'}
					<table><thead><tr>{#each stringArray(content.headers) as header (header)}<th>{header}</th>{/each}</tr></thead><tbody>{#each rows(content.rows) as row, rowIndex (`${source.id}-${rowIndex}`)}<tr>{#each row as cell, cellIndex (`${source.id}-${rowIndex}-${cellIndex}`)}<td>{cell}</td>{/each}</tr>{/each}</tbody></table>
				{:else if source.assetUrl}<img src={source.assetUrl} alt={source.assetAltText || source.title || ''} />
				{:else if stringValue(content.url)}<img src={stringValue(content.url)} alt={stringValue(content.alt) || source.title || ''} />
				{:else}<p>{source.kind === 'map' ? 'Karte' : 'Bild'} (Asset {source.assetId ?? 'nicht verfügbar'})</p>{/if}
			</article>
		{/each}
	</section>

	<section>
		<h2>Fragen</h2>
		<ol>{#each data.task.questions as question (question.id)}
			<li>
				<p>{question.prompt} ({question.maxPoints} P.)</p>
				{#if question.config.kind === 'choice' || question.config.kind === 'multiple_choice'}<ul>{#each question.config.options as option (option.id)}<li>{option.label}</li>{/each}</ul>
				{:else if question.config.kind === 'matching'}<p>Zuordnen:</p><ul>{#each question.config.left as option (option.id)}<li>{option.label}</li>{/each}</ul><p>zu:</p><ul>{#each question.config.right as option (option.id)}<li>{option.label}</li>{/each}</ul>
				{:else if question.config.kind === 'ordering'}<p>In die richtige Reihenfolge bringen:</p><ul>{#each question.config.items as item (item.id)}<li>{item.label}</li>{/each}</ul>
				{:else}<p>{question.config.multiline ? 'Mehrzeilige Freitextantwort' : 'Kurze Freitextantwort'}</p>{/if}
			</li>
		{/each}</ol>
	</section>
</main>
