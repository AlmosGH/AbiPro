<script lang="ts">
	import { Button, EmptyState, Progress } from '$lib/components/ui';
	import { PageHeader, StatCard } from '$lib/components/page';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	let historyFilter = $state<'all' | 'practice' | 'mock_exam'>('all');
	const percent = (value: number | null) => value === null ? '–' : `${value} %`;
	const ranked = $derived([...data.progress.topics].filter((row) => row.averagePercent !== null).sort((a, b) => (b.averagePercent ?? 0) - (a.averagePercent ?? 0)));
	const strongAreas = $derived(ranked.slice(0, 3));
	const needsWork = $derived([...ranked].reverse().slice(0, 3));
	const history = $derived(data.progress.recent.filter((attempt) => historyFilter === 'all' || attempt.kind === historyFilter));
	const trend = $derived([...data.progress.recent].filter((attempt) => attempt.status === 'graded' && attempt.score !== null).reverse());
	const trendPoints = $derived(trend.map((attempt, index) => `${trend.length === 1 ? 50 : 5 + index * 90 / (trend.length - 1)},${90 - Math.round(80 * Number(attempt.score) / attempt.maxScore)}`).join(' '));
</script>

<svelte:head><title>Fortschritt – AbiPro</title></svelte:head>
<main>
	<PageHeader eyebrow="Lernanalyse" title="Dein Fortschritt" description="Sieh, was schon sitzt und wo sich deine nächste Übung am meisten lohnt.">
		{#snippet actions()}<Button href="/uben">Jetzt üben</Button>{/snippet}
	</PageHeader>
	<div class="stats"><StatCard label="Übungen" value={data.progress.overview.practiceCompleted} icon="check" /><StatCard label="Probeprüfungen" value={data.progress.overview.mockExamsCompleted} icon="clock" /><StatCard label="Durchschnitt" value={percent(data.progress.overview.averagePercent)} icon="chart" /><StatCard label="Diese Woche" value={data.progress.overview.weeklyCompleted} icon="spark" tone="accent" /></div>

	<section class="trend-card"><div class="section-copy"><span>Entwicklung</span><h2>Dein Leistungstrend</h2><p>Die letzten bewerteten Versuche in zeitlicher Reihenfolge.</p></div>{#if trend.length}<div class="chart-wrap"><svg viewBox="0 0 100 100" role="img" aria-label="Verlauf der letzten Ergebnisse in Prozent" preserveAspectRatio="none"><line x1="0" y1="10" x2="100" y2="10"/><line x1="0" y1="50" x2="100" y2="50"/><line x1="0" y1="90" x2="100" y2="90"/><polyline points={trendPoints}/></svg>{#each trend as attempt, index (attempt.id)}{@const scorePercent = Math.round(100 * Number(attempt.score) / attempt.maxScore)}<span class="trend-point" style={`left:${trend.length === 1 ? 50 : 5 + index * 90 / (trend.length - 1)}%;top:${90 - Math.round(80 * Number(attempt.score) / attempt.maxScore)}%`} title={`${scorePercent} %`}><span class="sr-only">{scorePercent} %</span></span>{/each}<div class="chart-labels"><span>0 %</span><span>100 %</span></div></div>{:else}<EmptyState title="Noch kein Trend" description="Nach zwei bewerteten Versuchen wird deine Entwicklung hier sichtbar." />{/if}</section>

	<div class="insights-grid">
		<section class="insight strong"><div class="section-copy"><span>Läuft gut</span><h2>Starke Bereiche</h2></div>{#if strongAreas.length}<div class="area-list">{#each strongAreas as area (area.id)}<div><Progress value={area.averagePercent ?? 0} label={`${area.name} · ${area.averagePercent} %`} /></div>{/each}</div>{:else}<p>Sobald Ergebnisse vorliegen, erscheinen hier deine Stärken.</p>{/if}</section>
		<section class="insight needs"><div class="section-copy"><span>Nächster Fokus</span><h2>Hier lohnt sich Übung</h2></div>{#if needsWork.length}<div class="weak-list">{#each needsWork as area (area.id)}<div><div><strong>{area.name}</strong><span>{area.averagePercent} % · {area.attempts} Versuche</span></div><Button href={`/uben?topicId=${area.id}`} variant="secondary">Üben</Button></div>{/each}</div>{:else}<p>Schließe eine Übung ab, um Empfehlungen zu erhalten.</p>{/if}</section>
	</div>

	<section class="history-section"><div class="history-heading"><div class="section-copy"><span>Verlauf</span><h2>Versuchshistorie</h2></div><label><span class="sr-only">Versuchstyp filtern</span><select bind:value={historyFilter}><option value="all">Alle Versuche</option><option value="practice">Übungen</option><option value="mock_exam">Probeprüfungen</option></select></label></div>
		{#if history.length}<div class="activity-list">{#each history as attempt (attempt.id)}<a href={`/profil/versuche/${attempt.id}`}><span><strong>{attempt.title}</strong><small>{attempt.kind === 'practice' ? 'Übung' : 'Probeprüfung'} · {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString('de-DE') : ''}</small></span><b>{attempt.status === 'graded' ? `${attempt.score} / ${attempt.maxScore}` : 'Ausstehend'}</b></a>{/each}</div>{:else}<EmptyState title="Keine passenden Versuche" description="Für diesen Filter gibt es noch keine Einträge." />{/if}
	</section>

	<details class="calculation-help"><summary>Wie werden diese Werte berechnet?</summary><p>Der Durchschnitt basiert nur auf vollständig bewerteten Versuchen. Themenwerte berücksichtigen die erreichten Punkte aller zugeordneten Fragen; noch laufende KI-Bewertungen fließen erst nach Abschluss ein.</p></details>
	{#if data.progress.overview.pendingAi}<p class="pending">{data.progress.overview.pendingAi} Bewertung(en) werden noch verarbeitet und erscheinen danach automatisch in deinen Werten.</p>{/if}
</main>

<style>
	.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); }
	.trend-card, .insight, .history-section { margin-top: var(--space-6); padding: var(--space-6); border: 1px solid var(--color-border); border-radius: var(--radius-xl); background: var(--color-surface); box-shadow: var(--shadow-sm); }
	.trend-card { display: grid; grid-template-columns: 17rem 1fr; align-items: center; gap: var(--space-8); }
	.section-copy > span { color: var(--color-brand-strong); font-size: .7rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }.section-copy h2 { margin: .3rem 0; }.section-copy p { margin: 0; color: var(--color-muted); font-size: .88rem; }
	.chart-wrap { position: relative; height: 13rem; }.chart-wrap svg { width: 100%; height: 100%; overflow: visible; }.chart-wrap line { stroke: var(--color-border); stroke-width: .6; vector-effect: non-scaling-stroke; }.chart-wrap polyline { fill: none; stroke: var(--color-brand); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }.trend-point { position: absolute; width: .7rem; height: .7rem; transform: translate(-50%, -50%); border: 2px solid var(--color-brand); border-radius: 50%; background: var(--color-surface); box-shadow: 0 0 0 2px var(--color-surface); }.chart-labels { position: absolute; inset: 0 auto 0 -2.5rem; display: flex; flex-direction: column-reverse; justify-content: space-between; color: var(--color-muted); font-size: .68rem; }
	.insights-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); }.insight { margin-top: var(--space-6); }.area-list, .weak-list { display: grid; gap: var(--space-5); margin-top: var(--space-5); }.weak-list > div { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-3) 0; border-top: 1px solid var(--color-border); }.weak-list span { display: block; margin-top: .2rem; color: var(--color-muted); font-size: .78rem; }.needs { border-top: 3px solid var(--color-accent); }.strong { border-top: 3px solid var(--color-brand); }
	.history-heading { display: flex; align-items: end; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-5); }.history-heading label { min-width: 12rem; }.activity-list { overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-lg); }.activity-list a { display: flex; min-height: 4.5rem; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-3) var(--space-5); color: var(--color-ink); text-decoration: none; }.activity-list a + a { border-top: 1px solid var(--color-border); }.activity-list a:hover { background: var(--color-surface-soft); }.activity-list span { display: grid; gap: var(--space-1); }.activity-list small { color: var(--color-muted); }.activity-list b { color: var(--color-brand-strong); white-space: nowrap; }
	.calculation-help { margin-top: var(--space-6); }.calculation-help p { margin: var(--space-3) 0 0; color: var(--color-muted); }.pending { margin-top: var(--space-4); padding: var(--space-4); border-radius: var(--radius-md); background: var(--color-warning-soft); color: var(--color-warning); }
	@media(max-width: 65rem) { .stats { grid-template-columns: repeat(2, 1fr); }.trend-card { grid-template-columns: 1fr; }.insights-grid { grid-template-columns: 1fr; gap: 0; } }
	@media(max-width: 38rem) { .stats { grid-template-columns: 1fr 1fr; }.trend-card, .insight, .history-section { padding: var(--space-4); }.history-heading { align-items: stretch; flex-direction: column; }.activity-list a { align-items: flex-start; flex-direction: column; }.chart-labels { display: none; } }
</style>
