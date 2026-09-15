<script lang="ts">
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	const years = $derived([...new Set(data.sessions.map((session) => session.year))]);
</script>

<svelte:head><title>Aufgaben – AbiPro</title><meta name="description" content="Veröffentlichte Aufgaben für die deutschsprachige Geschichte-Abiturvorbereitung." /></svelte:head>
<main>
	<h1>Aufgaben</h1>
	<form method="GET">
		<label>Suche <input type="search" name="q" value={data.filters.query ?? ''} /></label>
		<label>Lehrplan <select name="curriculumId"><option value="">Alle</option>{#each data.curricula as item (item.id)}<option value={item.id} selected={data.filters.curriculumId === item.id}>{item.name}</option>{/each}</select></label>
		<label>Epoche <select name="periodId"><option value="">Alle</option>{#each data.periods as item (item.id)}<option value={item.id} selected={data.filters.periodId === item.id}>{item.name}</option>{/each}</select></label>
		<label>Thema <select name="topicId"><option value="">Alle</option>{#each data.topics as item (item.id)}<option value={item.id} selected={data.filters.topicId === item.id}>{item.name}</option>{/each}</select></label>
		<label>Jahr <select name="year"><option value="">Alle</option>{#each years as year (year)}<option value={year} selected={data.filters.year === year}>{year}</option>{/each}</select></label>
		<label>Session <select name="session"><option value="">Alle</option><option value="spring" selected={data.filters.session === 'spring'}>Frühjahr</option><option value="autumn" selected={data.filters.session === 'autumn'}>Herbst</option></select></label>
		<button>Filtern</button> <a href="/aufgaben">Zurücksetzen</a>
	</form>
	<p>{data.tasks.length} {data.tasks.length === 1 ? 'Aufgabe' : 'Aufgaben'} gefunden.</p>
	{#if data.tasks.length}
		<ul>{#each data.tasks as task (task.slug)}<li><h2><a href={`/aufgaben/${task.slug}`}>{task.title}</a></h2><p>{task.year} · {task.session === 'spring' ? 'Frühjahr' : 'Herbst'} · {task.period} · {task.curriculum} · {task.maxPoints} Punkte</p><p>Themen: {task.topics.join(', ')}</p><p><a href={`/uben?task=${task.slug}`}>Diese Aufgabe üben</a></p></li>{/each}</ul>
	{:else}<p>Für diese Filter wurden keine veröffentlichten Aufgaben gefunden.</p>{/if}
</main>
