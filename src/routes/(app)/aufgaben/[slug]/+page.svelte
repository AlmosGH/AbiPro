<script lang="ts">
	import { page } from '$app/state';
	import TaskViewer from '$lib/components/task/TaskViewer.svelte';
	import { getLanguageContext } from '$lib/i18n';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	const language = getLanguageContext();
	const returnTo = $derived.by(() => {
		const value = page.url.searchParams.get('return');
		return value?.startsWith('/aufgaben') ? value : '/aufgaben';
	});
</script>

<svelte:head><title>{data.task.title} – {language.t('Aufgaben')} – AbiPro</title><meta name="description" content={`${data.task.title}, ${data.task.year}, ${data.task.period}`} /></svelte:head>
<main>
	<p><a href={returnTo}>{language.t('← Zurück zu den Aufgaben')}</a></p>
	<h1>{data.task.title}</h1>
	<p>{data.task.origin === 'ujkor' ? language.t('Újkor.hu-Sammlung') : `${data.task.year} · ${language.t(data.task.session === 'spring' ? 'Frühjahr' : 'Herbst')} · ${data.task.curriculum}`} · {data.task.period} · {language.t(data.task.historyScope === 'hungarian' ? 'Ungarische Geschichte' : 'Weltgeschichte')} · {data.task.maxPoints} {language.t('Punkte')}</p>
	<p>{language.t('Themen: ')}{data.task.topics.join(', ')}</p>
	<p><a href={`/uben?task=${data.task.slug}`}>{language.t('Diese Aufgabe üben')}</a></p>
	<TaskViewer instructions={data.task.instructions} sources={data.task.sources} questions={data.task.questions} />
</main>
