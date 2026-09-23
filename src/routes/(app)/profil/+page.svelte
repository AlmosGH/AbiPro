<script lang="ts">
	import { Button, EmptyState, Progress } from '$lib/components/ui';
	import { PageHeader, StatCard } from '$lib/components/page';
	import { getLanguageContext } from '$lib/i18n';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	const language = getLanguageContext();
	let historyFilter = $state<'all' | 'practice' | 'mock_exam'>('all');
	const percent = (value: number | null) => value === null ? '–' : `${value} %`;
	const ranked = $derived([...data.progress.topics].filter((row) => row.averagePercent !== null).sort((a, b) => (b.averagePercent ?? 0) - (a.averagePercent ?? 0)));
	const strongAreas = $derived(ranked.slice(0, 3));
	const needsWork = $derived([...ranked].reverse().slice(0, 3));
	const history = $derived(data.progress.recent.filter((attempt) => historyFilter === 'all' || attempt.kind === historyFilter));
	const trend = $derived([...data.progress.recent].filter((attempt) => attempt.status === 'graded' && attempt.score !== null).reverse());
	function initialTrendIndex() { return Math.max(trend.length - 1, 0); }
	let selectedTrendIndex = $state(initialTrendIndex());
	const chartX = (index: number) => trend.length === 1 ? 50 : 4 + index * 92 / (trend.length - 1);
	const attemptPercent = (attempt: (typeof trend)[number]) => 100 * Number(attempt.score) / attempt.maxScore;
	const cumulativePercent = (index: number) => trend.slice(0, index + 1).reduce((sum, attempt) => sum + attemptPercent(attempt), 0) / (index + 1);
	const chartY = (percent: number) => 94 - 88 * Math.min(100, Math.max(0, percent)) / 100;
	const scorePercent = (percent: number) => Math.round(percent);
	const formatDate = (value: string | Date | null) => value ? new Date(value).toLocaleDateString(language.locale === 'hu' ? 'hu-HU' : 'de-DE', { day: '2-digit', month: 'short' }) : '';
	const taskPoints = $derived(trend.map((attempt, index) => `${chartX(index)},${chartY(attemptPercent(attempt))}`).join(' '));
	const averagePoints = $derived(trend.map((_attempt, index) => `${chartX(index)},${chartY(cumulativePercent(index))}`).join(' '));
	const selectedAttempt = $derived(trend[Math.min(selectedTrendIndex, Math.max(trend.length - 1, 0))]);
</script>

<svelte:head><title>{language.t('Fortschritt')} – AbiPro</title></svelte:head>
<main>
	<PageHeader eyebrow={language.t('Lernanalyse')} title={language.t('Dein Fortschritt')} description={language.t('Sieh, was schon sitzt und wo sich deine nächste Übung am meisten lohnt.')}>
		{#snippet actions()}<Button href="/uben">{language.t('Jetzt üben')}</Button>{/snippet}
	</PageHeader>
	<div class="stats"><StatCard label={language.t('Übungen')} value={data.progress.overview.practiceCompleted} icon="check" /><StatCard label={language.t('Probeprüfungen')} value={data.progress.overview.mockExamsCompleted} icon="clock" /><StatCard label={language.t('Durchschnitt')} value={percent(data.progress.overview.averagePercent)} icon="chart" /><StatCard label={language.t('Diese Woche')} value={data.progress.overview.weeklyCompleted} icon="spark" tone="accent" /></div>

	<section class="trend-card" aria-labelledby="trend-heading">
		<div class="section-copy">
			<span>{language.t('Entwicklung')}</span>
			<h2 id="trend-heading">{language.t('Dein Leistungstrend')}</h2>
			<p>{language.t('Aufgabe für Aufgabe: Ergebnis und bisheriger Durchschnitt.')}</p>
			{#if selectedAttempt}
				<div class="selected-result">
					<div class="selected-metrics">
						<span><small>{language.t('Aufgabe')}</small><strong>{scorePercent(attemptPercent(selectedAttempt))} %</strong></span>
						<span><small>{language.t('Ø bisher')}</small><strong>{scorePercent(cumulativePercent(selectedTrendIndex))} %</strong></span>
					</div>
					<p>{selectedAttempt.title} · {formatDate(selectedAttempt.submittedAt)}</p>
				</div>
			{/if}
		</div>
		{#if trend.length}
			<div class="chart-wrap">
				<div class="chart-legend" aria-hidden="true">
					<span><i class="legend-task"></i>{language.t('Aufgabe')}</span>
					<span><i class="legend-average"></i>{language.t('Ø bisher')}</span>
				</div>
				<div class="chart-body">
					<div class="chart-labels" aria-hidden="true"><span>100 %</span><span>50 %</span><span>0 %</span></div>
					<div class="chart-plot">
						<svg viewBox="0 0 100 100" role="img" aria-label={language.t('Aufgabeergebnisse und kumulativer Durchschnitt in Prozent')} preserveAspectRatio="none">
							<line x1="0" y1="6" x2="100" y2="6" />
							<line x1="0" y1="50" x2="100" y2="50" />
							<line x1="0" y1="94" x2="100" y2="94" />
							<polyline class="task-line" points={taskPoints} />
							<polyline class="average-line" points={averagePoints} />
						</svg>
						{#each trend as attempt, index (attempt.id)}
							<span class="average-marker" aria-hidden="true" style={`left:${chartX(index)}%;top:${chartY(cumulativePercent(index))}%`}></span>
							<button type="button" class:selected={index === selectedTrendIndex} class="trend-point" style={`left:${chartX(index)}%;top:${chartY(attemptPercent(attempt))}%`} aria-label={language.t('{title}: {score}% Ergebnis, bisheriger Durchschnitt {average}% am {date}', { title: attempt.title, score: scorePercent(attemptPercent(attempt)), average: scorePercent(cumulativePercent(index)), date: formatDate(attempt.submittedAt) })} aria-pressed={index === selectedTrendIndex} onclick={() => selectedTrendIndex = index}><span class="sr-only">{scorePercent(attemptPercent(attempt))} %</span></button>
						{/each}
					</div>
				</div>
				<div class="date-labels"><span>{formatDate(trend[0].submittedAt)}</span><span>{formatDate(trend[trend.length - 1].submittedAt)}</span></div>
			</div>
		{:else}
			<EmptyState title={language.t('Noch kein Trend')} description={language.t('Nach zwei bewerteten Versuchen wird deine Entwicklung hier sichtbar.')} />
		{/if}
	</section>

	<div class="insights-grid">
		<section class="insight strong"><div class="section-copy"><span>{language.t('Läuft gut')}</span><h2>{language.t('Starke Bereiche')}</h2></div>{#if strongAreas.length}<div class="area-list">{#each strongAreas as area (area.id)}<div><Progress value={area.averagePercent ?? 0} label={`${area.name} · ${area.averagePercent} %`} /></div>{/each}</div>{:else}<p>{language.t('Sobald Ergebnisse vorliegen, erscheinen hier deine Stärken.')}</p>{/if}</section>
		<section class="insight needs"><div class="section-copy"><span>{language.t('Nächster Fokus')}</span><h2>{language.t('Hier lohnt sich Übung')}</h2></div>{#if needsWork.length}<div class="weak-list">{#each needsWork as area (area.id)}<div><div><strong>{area.name}</strong><span>{area.averagePercent} % · {language.t('{count} Versuche', { count: area.attempts })}</span></div><Button href={`/uben?topicId=${area.id}`} variant="secondary">{language.t('Üben')}</Button></div>{/each}</div>{:else}<p>{language.t('Schließe eine Übung ab, um Empfehlungen zu erhalten.')}</p>{/if}</section>
	</div>

	<section class="history-section"><div class="history-heading"><div class="section-copy"><span>{language.t('Verlauf')}</span><h2>{language.t('Versuchshistorie')}</h2></div><label><span class="sr-only">{language.t('Versuchstyp filtern')}</span><select bind:value={historyFilter}><option value="all">{language.t('Alle Versuche')}</option><option value="practice">{language.t('Übungen')}</option><option value="mock_exam">{language.t('Probeprüfungen')}</option></select></label></div>
		{#if history.length}<div class="activity-list">{#each history as attempt (attempt.id)}<a href={`/profil/versuche/${attempt.id}`}><span><strong>{attempt.title}</strong><small>{language.t(attempt.kind === 'practice' ? 'Übung' : 'Probeprüfung')} · {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString(language.locale === 'hu' ? 'hu-HU' : 'de-DE') : ''}</small></span><b>{attempt.status === 'graded' ? `${attempt.score} / ${attempt.maxScore}` : language.t('Ausstehend')}</b></a>{/each}</div>{:else}<EmptyState title={language.t('Keine passenden Versuche')} description={language.t('Für diesen Filter gibt es noch keine Einträge.')} />{/if}
	</section>

	<details class="calculation-help"><summary>{language.t('Wie werden diese Werte berechnet?')}</summary><p>{language.t('Der Durchschnitt basiert nur auf vollständig bewerteten Versuchen. Themenwerte berücksichtigen die erreichten Punkte aller zugeordneten Fragen; noch laufende KI-Bewertungen fließen erst nach Abschluss ein.')}</p></details>
	{#if data.progress.overview.pendingAi}<p class="pending">{data.progress.overview.pendingAi} {language.t('Bewertung(en) werden noch verarbeitet und erscheinen danach automatisch in deinen Werten.')}</p>{/if}
</main>

<style>
	.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); }
	.trend-card, .insight, .history-section { margin-top: var(--space-6); padding: var(--space-6); border: 1px solid var(--color-border); border-radius: var(--radius-xl); background: var(--color-surface); box-shadow: var(--shadow-sm); }
	.trend-card { display: grid; grid-template-columns: minmax(13rem, 16rem) minmax(0, 1fr); align-items: center; gap: clamp(1.5rem, 4vw, 3rem); }
	.section-copy > span { color: var(--color-brand-strong); font-size: .7rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }.section-copy h2 { margin: .3rem 0; }.section-copy p { margin: 0; color: var(--color-muted); font-size: .88rem; }
	.chart-wrap { min-width: 0; }
	.chart-legend { display: flex; justify-content: flex-end; gap: var(--space-5); margin-bottom: var(--space-3); color: var(--color-muted); font-size: .75rem; }
	.chart-legend span { display: inline-flex; align-items: center; gap: .4rem; white-space: nowrap; }
	.chart-legend i { display: inline-block; width: 1.2rem; border-top: 2px solid; }
	.legend-task { border-color: var(--color-accent); border-top-style: dashed !important; }
	.legend-average { border-color: var(--color-brand); }
	.chart-body { display: grid; grid-template-columns: 2.8rem minmax(0, 1fr); gap: .5rem; }
	.chart-labels { display: flex; flex-direction: column; justify-content: space-between; padding-block: .2rem; color: var(--color-muted); font-size: .72rem; white-space: nowrap; }
	.chart-plot { position: relative; height: 13rem; }
	.chart-plot svg { width: 100%; height: 100%; overflow: visible; }
	.chart-plot line { stroke: var(--color-border); stroke-width: 1; vector-effect: non-scaling-stroke; }
	.chart-plot polyline { fill: none; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
	.task-line { stroke: var(--color-accent); stroke-width: 2; stroke-dasharray: 4 4; }
	.average-line { stroke: var(--color-brand); stroke-width: 3; }
	.average-marker { position: absolute; width: .55rem; height: .55rem; transform: translate(-50%, -50%); border: 2px solid var(--color-brand); border-radius: 50%; background: var(--color-surface); pointer-events: none; }
	.trend-point { position: absolute; z-index: 1; width: 1rem !important; min-width: 1rem; height: 1rem !important; min-height: 1rem; margin: 0; transform: translate(-50%, -50%); padding: 0 !important; border: 2px solid var(--color-accent); border-radius: 50%; background: var(--color-surface); box-shadow: 0 0 0 2px var(--color-surface); cursor: pointer; line-height: 0; appearance: none; transition: transform .15s ease, background .15s ease; }
	.trend-point:hover, .trend-point:focus-visible, .trend-point.selected { transform: translate(-50%, -50%) scale(1.25); background: var(--color-accent); }
	.trend-point:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 3px; }
	.date-labels { display: flex; justify-content: space-between; margin: .25rem 0 0 3.3rem; color: var(--color-muted); font-size: .72rem; }
	.selected-result { margin-top: var(--space-5); padding-top: var(--space-4); border-top: 1px solid var(--color-border); }
	.selected-metrics { display: flex; flex-wrap: wrap; gap: var(--space-4); }
	.selected-metrics span { display: grid; gap: .25rem; }
	.selected-metrics small { color: var(--color-muted); font-size: .72rem; font-weight: 600; }
	.selected-metrics strong { color: var(--color-brand-strong); font-size: 1.55rem; line-height: 1; }
	.selected-result p { margin: var(--space-3) 0 0; color: var(--color-muted); font-size: .75rem; line-height: 1.4; overflow-wrap: anywhere; }
	.insights-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); }.insight { margin-top: var(--space-6); }.area-list, .weak-list { display: grid; gap: var(--space-5); margin-top: var(--space-5); }.weak-list > div { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-3) 0; border-top: 1px solid var(--color-border); }.weak-list span { display: block; margin-top: .2rem; color: var(--color-muted); font-size: .78rem; }.needs { border-top: 3px solid var(--color-accent); }.strong { border-top: 3px solid var(--color-brand); }
	.history-heading { display: flex; align-items: end; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-5); }.history-heading label { min-width: 12rem; }.activity-list { overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-lg); }.activity-list a { display: flex; min-height: 4.5rem; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-3) var(--space-5); color: var(--color-ink); text-decoration: none; }.activity-list a + a { border-top: 1px solid var(--color-border); }.activity-list a:hover { background: var(--color-surface-soft); }.activity-list span { display: grid; gap: var(--space-1); }.activity-list small { color: var(--color-muted); }.activity-list b { color: var(--color-brand-strong); white-space: nowrap; }
	.calculation-help { margin-top: var(--space-6); }.calculation-help p { margin: var(--space-3) 0 0; color: var(--color-muted); }.pending { margin-top: var(--space-4); padding: var(--space-4); border-radius: var(--radius-md); background: var(--color-warning-soft); color: var(--color-warning); }
	@media(max-width: 65rem) { .stats { grid-template-columns: repeat(2, 1fr); }.trend-card { grid-template-columns: 1fr; }.insights-grid { grid-template-columns: 1fr; gap: 0; } }
	@media(max-width: 38rem) { .stats { grid-template-columns: 1fr 1fr; }.trend-card, .insight, .history-section { padding: var(--space-4); }.history-heading { align-items: stretch; flex-direction: column; }.activity-list a { align-items: flex-start; flex-direction: column; }.chart-plot { height: 11rem; } }
</style>
