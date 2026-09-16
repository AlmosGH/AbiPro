<script lang="ts">
	import { page } from '$app/state';
	import TaskViewer from '$lib/components/task/TaskViewer.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	const returnTo = $derived.by(() => {
		const value = page.url.searchParams.get('return');
		return value?.startsWith('/aufgaben') ? value : '/aufgaben';
	});
</script>

<svelte:head><title>{data.task.title} – Aufgaben – AbiPro</title><meta name="description" content={`${data.task.title}, ${data.task.year}, ${data.task.period}`} /></svelte:head>
<main>
	<p><a href={returnTo}>← Zurück zu den Aufgaben</a></p>
	<h1>{data.task.title}</h1>
	<p>{data.task.year} · {data.task.session === 'spring' ? 'Frühjahr' : 'Herbst'} · {data.task.period} · {data.task.curriculum} · {data.task.maxPoints} Punkte</p>
	<p>Themen: {data.task.topics.join(', ')}</p>
	<p><a href={`/uben?task=${data.task.slug}`}>Diese Aufgabe üben</a></p>
	<TaskViewer instructions={data.task.instructions} sources={data.task.sources} questions={data.task.questions} />
</main>
