<script lang="ts">
	import { Button } from '$lib/components/ui';
	import { PageHeader } from '$lib/components/page';
	import { getLanguageContext } from '$lib/i18n';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	const language = getLanguageContext();
</script>

<svelte:head><title>{language.t('Prüfung')} – AbiPro</title></svelte:head>
<main>
	<PageHeader eyebrow={language.t('Prüfungsmodus')} title={language.t('Prüfungssimulation')} description={language.t('Simuliere den offiziellen Kurzantwort-Teil der ungarischen Geschichtsprüfung auf Mittelstufe.')} />

	<section class="exam-overview" aria-label={language.t('Prüfungsumfang')}>
		<div class="overview-intro">
			<span class="kicker">{language.t('Auf einen Blick')}</span>
			<h2>{language.t('Bereit für die Prüfung?')}</h2>
			<p>{language.t('Arbeite konzentriert und behalte deine verbleibende Zeit im Blick.')}</p>
		</div>
		<dl class="stats">
			<div><dt>{language.t('Aufgaben')}</dt><dd>{data.config.taskCount}</dd></div>
			<div><dt>{language.t('Zeit')}</dt><dd>{data.config.timeLimitSeconds / 60}<small> {language.t('Min.')}</small></dd></div>
			<div><dt>{language.t('Maximal')}</dt><dd>{data.config.targetMaximumScore}<small> {language.t('P.')}</small></dd></div>
		</dl>
	</section>

	{#if data.activeAttempt}
		<section class="action-card active-card">
			<div><span class="kicker">{language.t('Noch nicht abgeschlossen')}</span><h2>{language.t('Laufende Prüfung')}</h2><p>{language.t('Deine Start- und Ablaufzeit sind serverseitig gespeichert. Ein Neuladen startet die Uhr nicht neu.')}</p></div>
			<Button href={`/prufung/${data.activeAttempt.id}`}>{language.t('Prüfung fortsetzen')}</Button>
		</section>
	{:else if data.readiness.ready}
		<section class="action-card start-card">
			<div><span class="kicker">{language.t('Alles vorbereitet')}</span><h2>{language.t('Neue Prüfung')}</h2><p>{language.t('Beim Start werden zwölf passende, unterschiedliche Aufgabenversionen ausgewählt und in dieser Reihenfolge gespeichert.')}</p></div>
			{#if form?.message}<p role="alert" class="save-error">{form.message}</p>{/if}
			<form method="POST" action="?/start"><Button type="submit">{language.t('Prüfung starten')}</Button></form>
		</section>
	{:else}
		<section class="action-card readiness-message" role="status">
			<div><span class="kicker">{language.t('Noch nicht verfügbar')}</span>
			<h2>{language.t('Prüfungsmodus noch nicht bereit')}</h2>
			<p>{language.t('Der veröffentlichte Aufgabenpool erfüllt die offiziellen Regeln noch nicht. Die Vorgaben werden nicht automatisch gelockert.')}</p>
			</div>
			<ul>
				{#each data.readiness.missingRules as rule (rule.position)}
					<li>{language.t('Position {position}: {label} ({points} Punkte)', { position: rule.position, label: rule.label, points: rule.maximumPoints })}</li>
				{/each}
			</ul>
		</section>
	{/if}
</main>

<style>
	.exam-overview, .action-card { border: 1px solid var(--color-border); border-radius: var(--radius-xl); background: var(--color-surface); box-shadow: var(--shadow-sm); }
	.exam-overview { display: grid; grid-template-columns: minmax(16rem, 1fr) 2fr; gap: var(--space-8); align-items: center; padding: var(--space-6); }
	.kicker { color: var(--color-brand-strong); font-size: .72rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
	.overview-intro h2, .action-card h2 { margin: .35rem 0 .5rem; font-family: var(--font-display); font-size: 1.65rem; }
	.overview-intro p, .action-card p { margin: 0; color: var(--color-muted); }
	.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); margin: 0; }
	.stats > div { padding: var(--space-4); border-radius: var(--radius-lg); background: var(--color-surface-soft); }
	.stats dt { color: var(--color-muted); font-size: .78rem; font-weight: 700; }
	.stats dd { margin: .35rem 0 0; color: var(--color-brand-strong); font-family: var(--font-display); font-size: 2rem; font-weight: 700; }
	.stats small { font-family: var(--font-body, 'Segoe UI', system-ui, sans-serif); font-size: .85rem; }
	.action-card { display: flex; align-items: center; justify-content: space-between; gap: var(--space-6); margin-top: var(--space-6); padding: var(--space-6); }
	.action-card form { flex: none; }
	.active-card { border-top: 3px solid var(--color-brand); }
	.start-card { color: white; border-color: #155c43; background: linear-gradient(135deg, #123f31, #176b4d); box-shadow: var(--shadow-md); }
	.start-card h2, .start-card p { color: white; }
	.start-card p { color: #dcebe5; }
	.start-card .kicker { color: #ffbf87; }
	.start-card :global(button) { border-color: #f4a261; background: #f4a261; color: #40200a; }
	.save-error { margin: var(--space-3) 0 0; }
	.readiness-message { align-items: flex-start; }
	.readiness-message ul { flex: 1; margin: 0; color: var(--color-warning); }
	@media (max-width: 52rem) { .exam-overview { grid-template-columns: 1fr; gap: var(--space-5); } }
	@media (max-width: 40rem) { .stats { grid-template-columns: 1fr; } .action-card { align-items: stretch; flex-direction: column; } .action-card form, .action-card :global(.button-link), .action-card :global(button) { width: 100%; } .readiness-message ul { width: 100%; } }
</style>
