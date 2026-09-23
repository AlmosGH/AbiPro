<script lang="ts">
	import { afterNavigate, beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Badge, Button, EmptyState } from '$lib/components/ui';
	import { PageHeader } from '$lib/components/page';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	function initialSearchValue() { return data.filters.query ?? ''; }
	let searchValue = $state(initialSearchValue());
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	const years = $derived([...new Set(data.sessions.map((session) => session.year))]);
	const currentReturn = $derived(`${page.url.pathname}${page.url.search}`);
	const activeFilters = $derived([
		data.filters.query ? { key: 'q', label: `Suche: ${data.filters.query}` } : null,
		data.filters.origin ? { key: 'origin', label: data.filters.origin === 'ujkor' ? 'Újkor.hu-Sammlung' : 'Offizielle Prüfungen' } : null,
		data.filters.historyScope ? { key: 'historyScope', label: data.filters.historyScope === 'hungarian' ? 'Ungarische Geschichte' : 'Weltgeschichte' } : null,
		data.filters.curriculumId ? { key: 'curriculumId', label: data.curricula.find((item) => item.id === data.filters.curriculumId)?.name ?? 'Lehrplan' } : null,
		data.filters.periodId ? { key: 'periodId', label: data.periods.find((item) => item.id === data.filters.periodId)?.name ?? 'Epoche' } : null,
		data.filters.topicId ? { key: 'topicId', label: data.topics.find((item) => item.id === data.filters.topicId)?.name ?? 'Thema' } : null,
		data.filters.year ? { key: 'year', label: String(data.filters.year) } : null,
		data.filters.session ? { key: 'session', label: data.filters.session === 'spring' ? 'Frühjahr' : 'Herbst' } : null
	].filter((item): item is { key: string; label: string } => item !== null));

	function urlWith(changes: Record<string, string | null>) {
		const url = new URL(page.url);
		for (const [key, value] of Object.entries(changes)) value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
		if (!('page' in changes)) url.searchParams.delete('page');
		return `${url.pathname}${url.search}`;
	}

	function queueSearch(value: string) {
		searchValue = value;
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => void goto(urlWith({ q: value.trim() || null }), { replaceState: true, keepFocus: true, noScroll: true }), 280);
	}

	afterNavigate(() => {
		const saved = sessionStorage.getItem(`catalogue-scroll:${page.url.pathname}${page.url.search}`);
		if (saved) requestAnimationFrame(() => window.scrollTo({ top: Number(saved) }));
	});

	beforeNavigate(({ to }) => {
		if (to?.url.pathname.startsWith('/aufgaben/')) sessionStorage.setItem(`catalogue-scroll:${currentReturn}`, String(window.scrollY));
	});
</script>

<svelte:head><title>Aufgaben – AbiPro</title><meta name="description" content="Veröffentlichte Aufgaben für die deutschsprachige Geschichte-Abiturvorbereitung." /></svelte:head>
<main>
	<PageHeader eyebrow="Aufgabenpool" title="Finde deine nächste Aufgabe" description="Suche in offiziellen Prüfungen und der Újkor.hu-Sammlung und übe gezielt nach Thema." />
	<section class="catalogue-tools" aria-label="Aufgaben durchsuchen und filtern">
		<div class="primary-tools">
			<label class="search-field"><span class="sr-only">Aufgaben durchsuchen</span><input type="search" value={searchValue} oninput={(event) => queueSearch(event.currentTarget.value)} placeholder="Titel oder Stichwort suchen …" /></label>
			<label class="sort-field"><span>Sortieren</span><select value={data.filters.sort} onchange={(event) => goto(urlWith({ sort: event.currentTarget.value }))}><option value="newest">Neueste zuerst</option><option value="unpracticed">Noch nicht geübt</option><option value="weakest">Schwächstes Thema</option><option value="year">Prüfungsjahr</option></select></label>
		</div>
		<details class="filter-drawer">
			<summary>Weitere Filter <span>{activeFilters.length || ''}</span></summary>
			<form method="GET" class="filters">
				<input type="hidden" name="q" value={data.filters.query ?? ''} /><input type="hidden" name="sort" value={data.filters.sort} />
				<label>Sammlung<select name="origin"><option value="">Alle</option><option value="official" selected={data.filters.origin === 'official'}>Offizielle Prüfungen</option><option value="ujkor" selected={data.filters.origin === 'ujkor'}>Újkor.hu</option></select></label>
				<label>Geschichte<select name="historyScope"><option value="">Alle</option><option value="hungarian" selected={data.filters.historyScope === 'hungarian'}>Ungarisch</option><option value="global" selected={data.filters.historyScope === 'global'}>Weltgeschichte</option></select></label>
				<label>Lehrplan<select name="curriculumId"><option value="">Alle</option>{#each data.curricula as item (item.id)}<option value={item.id} selected={data.filters.curriculumId === item.id}>{item.name}</option>{/each}</select></label>
				<label>Epoche<select name="periodId"><option value="">Alle</option>{#each data.periods as item (item.id)}<option value={item.id} selected={data.filters.periodId === item.id}>{item.name}</option>{/each}</select></label>
				<label>Thema<select name="topicId"><option value="">Alle</option>{#each data.topics as item (item.id)}<option value={item.id} selected={data.filters.topicId === item.id}>{item.name}</option>{/each}</select></label>
				<label>Jahr<select name="year"><option value="">Alle</option>{#each years as year (year)}<option value={year} selected={data.filters.year === year}>{year}</option>{/each}</select></label>
				<label>Termin<select name="session"><option value="">Alle</option><option value="spring" selected={data.filters.session === 'spring'}>Frühjahr</option><option value="autumn" selected={data.filters.session === 'autumn'}>Herbst</option></select></label>
				<div class="filter-actions"><Button type="submit">Filter anwenden</Button><Button href="/aufgaben" variant="ghost">Alles zurücksetzen</Button></div>
			</form>
		</details>
		{#if activeFilters.length}<div class="filter-chips" aria-label="Aktive Filter">{#each activeFilters as filter (filter.key)}<a href={urlWith({ [filter.key]: null })}>{filter.label}<span aria-hidden="true">×</span><span class="sr-only"> entfernen</span></a>{/each}</div>{/if}
	</section>
	<div class="result-line"><strong>{data.total}</strong> {data.total === 1 ? 'Aufgabe' : 'Aufgaben'} gefunden</div>
	{#if data.tasks.length}
		<div class="task-grid">{#each data.tasks as task (task.slug)}
			<article class="task-card">
				<div class="card-top"><Badge tone={task.practiced ? 'success' : 'neutral'}>{task.practiced ? 'Geübt' : 'Neu'}</Badge><span>{task.origin === 'ujkor' ? 'Újkor.hu' : `${task.year} · ${task.session === 'spring' ? 'Frühjahr' : 'Herbst'}`}</span></div>
				<div><p class="period">{task.period}</p><h2>{task.title}</h2></div>
				<p>{task.historyScope === 'hungarian' ? 'Ungarische Geschichte' : 'Weltgeschichte'}</p>
				<div class="topics">{#each task.topics.slice(0, 3) as topic (topic)}<span>{topic}</span>{/each}</div>
				<div class="card-footer"><span><strong>{task.maxPoints}</strong> Punkte</span><Button href={`/aufgaben/${task.slug}?return=${encodeURIComponent(currentReturn)}`}>Aufgabe öffnen</Button></div>
			</article>
		{/each}</div>
		{#if data.page < data.pageCount}<div class="load-more"><Button href={urlWith({ page: String(data.page + 1) })} variant="secondary">Mehr Aufgaben laden</Button><span>{data.tasks.length} von {data.total}</span></div>{/if}
	{:else}<EmptyState title="Keine passenden Aufgaben" description="Ändere einen Filter oder setze die Auswahl zurück, um wieder alle Aufgaben zu sehen.">{#snippet action()}<Button href="/aufgaben" variant="secondary">Filter zurücksetzen</Button>{/snippet}</EmptyState>{/if}
</main>

<style>
	.catalogue-tools { margin-top: var(--space-6); padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-xl); background: var(--color-surface); box-shadow: var(--shadow-sm); }
	.primary-tools { display: grid; grid-template-columns: minmax(15rem, 1fr) auto; align-items: end; gap: var(--space-3); }
	.search-field input { padding-left: 1rem; font-size: 1rem; }
	.sort-field { grid-template-columns: auto 12rem; align-items: center; }
	.filter-drawer { margin-top: var(--space-3); padding: 0; border: 0; background: transparent; }
	.filter-drawer summary { display: flex; width: fit-content; min-height: 2.5rem; align-items: center; gap: var(--space-2); padding: .45rem .7rem; border-radius: var(--radius-md); color: var(--color-brand-strong); }
	.filter-drawer summary span { display: grid; min-width: 1.4rem; height: 1.4rem; place-items: center; border-radius: 99px; background: var(--color-brand-soft); font-size: .75rem; }
	.filters { display: grid; grid-template-columns: repeat(5, 1fr); margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--color-border); }
	.filter-actions { display: flex; grid-column: 1 / -1; gap: var(--space-2); }
	.filter-chips { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-4); }
	.filter-chips a, .topics span { display: inline-flex; align-items: center; gap: .35rem; padding: .35rem .65rem; border-radius: 999px; background: var(--color-surface-soft); color: var(--color-ink); font-size: .78rem; font-weight: 700; text-decoration: none; }
	.filter-chips a:hover { background: var(--color-brand-soft); color: var(--color-brand-strong); }
	.result-line { margin: var(--space-6) 0 var(--space-4); color: var(--color-muted); font-size: .88rem; }
	.result-line strong { color: var(--color-ink); }
	.task-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
	.task-card { display: grid; min-height: 19rem; align-content: space-between; gap: var(--space-5); padding: var(--space-5); border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow-sm); transition: transform var(--duration-base), box-shadow var(--duration-base); }
	.task-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
	.card-top, .card-footer { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
	.card-top > span:last-child, .period { color: var(--color-muted); font-size: .8rem; font-weight: 700; }
	.period { margin-bottom: var(--space-2); text-transform: uppercase; letter-spacing: .05em; }
	.task-card h2 { margin: 0; font-family: var(--font-display); font-size: 1.35rem; }
	.topics { display: flex; flex-wrap: wrap; gap: var(--space-2); align-self: start; }
	.card-footer { padding-top: var(--space-4); border-top: 1px solid var(--color-border); }
	.card-footer > span { color: var(--color-muted); font-size: .8rem; }
	.card-footer > span strong { display: block; color: var(--color-ink); font-size: 1.1rem; }
	.load-more { display: grid; place-items: center; gap: var(--space-2); margin-top: var(--space-8); }
	.load-more span { color: var(--color-muted); font-size: .8rem; }
	@media(max-width: 70rem) { .filters { grid-template-columns: repeat(3, 1fr); } .task-grid { grid-template-columns: repeat(2, 1fr); } }
	@media(max-width: 42rem) { .primary-tools, .filters, .task-grid { grid-template-columns: 1fr; } .sort-field { grid-template-columns: 1fr; } .task-card { min-height: 0; } }
</style>
