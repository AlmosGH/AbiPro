<script lang="ts">
	import { Badge, Button, EmptyState } from '$lib/components/ui';
	import { ContentCard, FilterBar, PageHeader } from '$lib/components/page';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	const years = $derived([...new Set(data.sessions.map((session) => session.year))]);
</script>

<svelte:head><title>Aufgaben – AbiPro</title><meta name="description" content="Veröffentlichte Aufgaben für die deutschsprachige Geschichte-Abiturvorbereitung." /></svelte:head>
<main>
	<PageHeader eyebrow="Aufgabenpool" title="Aufgaben" description="Durchsuche echte Prüfungsaufgaben und wähle gezielt nach Epoche, Thema oder Jahr." />
	<FilterBar label={`Filter · ${data.tasks.length} ${data.tasks.length === 1 ? 'Treffer' : 'Treffer'}`}>
		<form method="GET" class="filters">
			<label class="search">Suche<input type="search" name="q" value={data.filters.query ?? ''} placeholder="Titel oder Stichwort" /></label>
			<label>Lehrplan<select name="curriculumId"><option value="">Alle</option>{#each data.curricula as item (item.id)}<option value={item.id} selected={data.filters.curriculumId === item.id}>{item.name}</option>{/each}</select></label>
			<label>Epoche<select name="periodId"><option value="">Alle</option>{#each data.periods as item (item.id)}<option value={item.id} selected={data.filters.periodId === item.id}>{item.name}</option>{/each}</select></label>
			<label>Thema<select name="topicId"><option value="">Alle</option>{#each data.topics as item (item.id)}<option value={item.id} selected={data.filters.topicId === item.id}>{item.name}</option>{/each}</select></label>
			<label>Jahr<select name="year"><option value="">Alle</option>{#each years as year (year)}<option value={year} selected={data.filters.year === year}>{year}</option>{/each}</select></label>
			<label>Session<select name="session"><option value="">Alle</option><option value="spring" selected={data.filters.session === 'spring'}>Frühjahr</option><option value="autumn" selected={data.filters.session === 'autumn'}>Herbst</option></select></label>
			<div class="filter-actions"><Button type="submit">Filtern</Button><Button href="/aufgaben" variant="ghost">Zurücksetzen</Button></div>
		</form>
	</FilterBar>
	<div class="result-line"><strong>{data.tasks.length}</strong> {data.tasks.length === 1 ? 'Aufgabe gefunden' : 'Aufgaben gefunden'}</div>
	{#if data.tasks.length}
		<div class="task-grid">{#each data.tasks as task (task.slug)}
			<ContentCard eyebrow={`${task.year} · ${task.session === 'spring' ? 'Frühjahr' : 'Herbst'}`} title={task.title} meta={`${task.period} · ${task.maxPoints} Punkte`}>
				<div class="badges"><Badge tone={task.practiced ? 'success' : 'neutral'}>{task.practiced ? 'Geübt' : 'Neu'}</Badge>{#each task.topics.slice(0, 2) as topic (topic)}<Badge>{topic}</Badge>{/each}</div>
				{#snippet footer()}<div class="card-actions"><Button href={`/aufgaben/${task.slug}`} variant="ghost">Ansehen</Button><Button href={`/uben?task=${task.slug}`} variant="secondary">Aufgabe üben</Button></div>{/snippet}
			</ContentCard>
		{/each}</div>
	{:else}<EmptyState title="Keine passenden Aufgaben" description="Ändere einen Filter oder setze die Auswahl zurück, um wieder alle Aufgaben zu sehen.">{#snippet action()}<Button href="/aufgaben" variant="secondary">Filter zurücksetzen</Button>{/snippet}</EmptyState>{/if}
</main>

<style>
	.filters { display: grid; grid-template-columns: minmax(14rem, 1.5fr) repeat(5, minmax(9rem, 1fr)); align-items: end; }
	.filter-actions { display: flex; grid-column: 1 / -1; gap: var(--space-2); }
	.result-line { margin: var(--space-6) 0 var(--space-4); color: var(--color-muted); font-size: .88rem; }
	.result-line strong { color: var(--color-ink); }
	.task-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
	.badges, .card-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
	@media(max-width: 75rem) { .filters { grid-template-columns: repeat(3, 1fr); } .task-grid { grid-template-columns: repeat(2, 1fr); } }
	@media(max-width: 45rem) { .filters, .task-grid { grid-template-columns: 1fr; } .filters label { min-width: 0; } }
</style>
