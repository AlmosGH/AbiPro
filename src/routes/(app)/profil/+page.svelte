<script lang="ts">
	import { Button, EmptyState, Progress } from '$lib/components/ui';
	import { PageHeader, Section, StatCard } from '$lib/components/page';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	const percent = (value: number | null) => value === null ? '–' : `${value} %`;
</script>

<svelte:head><title>Fortschritt – AbiPro</title></svelte:head>
<main>
	<PageHeader eyebrow="Lernanalyse" title="Dein Fortschritt" description="Erkenne, was schon sicher sitzt und wo sich die nächste Übung besonders lohnt.">
		{#snippet actions()}<Button href="/einstellungen" variant="secondary">Einstellungen</Button>{/snippet}
	</PageHeader>
	<div class="stats">
		<StatCard label="Übungen abgeschlossen" value={data.progress.overview.practiceCompleted} icon="check" />
		<StatCard label="Probeprüfungen" value={data.progress.overview.mockExamsCompleted} icon="clock" />
		<StatCard label="Bewerteter Durchschnitt" value={percent(data.progress.overview.averagePercent)} icon="chart" />
		<StatCard label="Bestes Ergebnis" value={percent(data.progress.overview.bestPercent)} icon="spark" tone="accent" />
	</div>
	<Section title="Letzte Aktivitäten">
		{#if data.progress.recent.length}
			<div class="activity-list">{#each data.progress.recent as attempt (attempt.id)}<a href={`/profil/versuche/${attempt.id}`}><span><strong>{attempt.title}</strong><small>{attempt.kind === 'practice' ? 'Übung' : 'Probeprüfung'}</small></span><b>{attempt.status === 'graded' ? `${attempt.score} / ${attempt.maxScore}` : 'Ausstehend'}</b></a>{/each}</div>
		{:else}<EmptyState title="Noch keine Ergebnisse" description="Nach deiner ersten abgeschlossenen Übung erscheint hier deine Lernhistorie." />{/if}
	</Section>
	<div class="analysis-grid">
		<Section title="Nach Thema">
			{#if data.progress.topics.length}<div class="bars">{#each data.progress.topics as row (row.id)}<div><Progress value={row.averagePercent ?? 0} label={`${row.name} · ${row.attempts} ${row.attempts === 1 ? 'Versuch' : 'Versuche'}`} /></div>{/each}</div>{:else}<EmptyState title="Noch keine Themendaten" description="Bewertete Übungen werden automatisch nach Thema ausgewertet." />{/if}
		</Section>
		<Section title="Nach Epoche">
			{#if data.progress.periods.length}<div class="bars">{#each data.progress.periods as row (row.name)}<div><Progress value={row.averagePercent ?? 0} label={`${row.name} · ${row.attempts} ${row.attempts === 1 ? 'Versuch' : 'Versuche'}`} /></div>{/each}</div>{:else}<EmptyState title="Noch keine Epochendaten" description="Bewertete Übungen werden automatisch nach Epoche ausgewertet." />{/if}
		</Section>
	</div>
	{#if data.progress.overview.pendingAi}<p class="pending">{data.progress.overview.pendingAi} Bewertung(en) werden noch verarbeitet und sind im Durchschnitt noch nicht enthalten.</p>{/if}
</main>

<style>
	.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); }
	.activity-list { overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow-sm); }
	.activity-list a { display: flex; min-height: 4.5rem; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-3) var(--space-5); color: var(--color-ink); text-decoration: none; }
	.activity-list a + a { border-top: 1px solid var(--color-border); }
	.activity-list a:hover { background: var(--color-surface-soft); }
	.activity-list span { display: grid; gap: var(--space-1); }
	.activity-list small { color: var(--color-muted); }
	.activity-list b { color: var(--color-brand-strong); white-space: nowrap; }
	.analysis-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-6); }
	.bars { display: grid; gap: var(--space-5); padding: var(--space-5); border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow-sm); }
	.pending { margin-top: var(--space-6); padding: var(--space-4); border-radius: var(--radius-md); background: var(--color-warning-soft); color: var(--color-warning); }
	@media(max-width: 65rem) { .stats { grid-template-columns: repeat(2, 1fr); } .analysis-grid { grid-template-columns: 1fr; } }
	@media(max-width: 35rem) { .stats { grid-template-columns: 1fr; } }
</style>
