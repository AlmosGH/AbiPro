<script lang="ts">
	import { Alert, Badge, Button, Icon, Progress } from '$lib/components/ui';
	import { ContentCard, PageHeader, Section, StatCard } from '$lib/components/page';
	import { getLanguageContext } from '$lib/i18n';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	const language = getLanguageContext();
	const firstName = $derived((data.profile?.displayName ?? 'Lernende').split(' ')[0]);
	const recent = $derived(data.dashboard?.progress.recent[0] ?? null);
	const percent = (value: number | null) => value === null ? '–' : `${Math.round(value)} %`;
</script>

<svelte:head>
	<title>{data.dashboard ? language.t('Übersicht') : language.t('Geschichte verstehen. Sicherer in die Prüfung.')} – AbiPro</title>
	<meta name="description" content={language.t(data.dashboard ? 'Dein persönliches Lern-Dashboard für die Geschichte-Prüfung.' : 'Entdecke echte Geschichtsaufgaben. Mit einem Konto kannst du gezielt üben, Probeprüfungen schreiben und deinen Fortschritt verfolgen.')} />
</svelte:head>

<main>
	{#if data.dashboard}
	<PageHeader eyebrow={language.t('Dein Lernplan')} title={language.t('Willkommen zurück, {name}.', { name: firstName })} description={language.t('Mach dort weiter, wo du aufgehört hast – oder starte eine gezielte kurze Übung.')} />
	{#if form?.message}<Alert tone="danger">{form.message}</Alert>{/if}

	<section class="hero-grid" aria-label={language.t('Nächste Schritte')}>
		<article class="continue-card">
			<div class="continue-copy">
				<Badge tone="accent">{language.t('Als Nächstes')}</Badge>
				{#if data.dashboard.activeExam}
					<h2>{language.t('Laufende Prüfung fortsetzen')}</h2><p>{language.t('Deine Prüfungszeit läuft serverseitig weiter. Kehre direkt zu deinem gespeicherten Stand zurück.')}</p>
					<Button href={`/prufung/${data.dashboard.activeExam.id}`}>{language.t('Prüfung fortsetzen')} <Icon name="chevron" size={18} /></Button>
				{:else if data.dashboard.activePractice}
					<h2>{data.dashboard.activePractice.title}</h2><p>{language.t('Deine Antworten sind gespeichert. Setze die angefangene Übung ohne Umwege fort.')}</p>
					<Button href={`/uben/${data.dashboard.activePractice.id}`}>{language.t('Übung fortsetzen')} <Icon name="chevron" size={18} /></Button>
				{:else}
					<h2>{language.t('Bereit für eine neue Runde?')}</h2><p>{language.t('Wir wählen eine noch nicht geübte Aufgabe aus deinem verfügbaren Aufgabenpool.')}</p>
					<form method="POST" action="?/quickStart"><Button type="submit">{language.t('Schnellübung starten')} <Icon name="chevron" size={18} /></Button></form>
				{/if}
			</div>
			<div class="hero-visual" aria-hidden="true"><span>1848</span><i></i><b>1956</b><i></i><span>1989</span></div>
		</article>

		<article class="readiness-card">
			<div class="readiness-head"><span><Icon name="spark" /></span><Badge tone={data.dashboard.examPool.ready ? 'success' : 'warning'}>{language.t(data.dashboard.examPool.ready ? 'Prüfung verfügbar' : 'Pool wird ergänzt')}</Badge></div>
			<h2>{language.t('Prüfungsreife')}</h2><strong>{data.dashboard.readinessScore}%</strong>
			<Progress value={data.dashboard.readinessScore} label={language.t('Persönliche Vorbereitung')} showValue={false} />
			<p>{language.t(data.dashboard.readinessScore >= 75 ? 'Du bist auf einem guten Weg. Eine Probeprüfung festigt deinen Stand.' : 'Regelmäßige kurze Übungen bringen dich jetzt am schnellsten voran.')}</p>
			<a href="/prufung">{language.t('Prüfungsmodus ansehen')} <Icon name="chevron" size={16} /></a>
		</article>
	</section>

	<Section title={language.t('Diese Woche')} description={language.t('Dein Fortschritt der letzten sieben Tage und dein aktueller Leistungsstand.')}>
		<div class="stat-grid">
			<StatCard label={language.t('Abgeschlossene Einheiten')} value={data.dashboard.progress.overview.weeklyCompleted} detail={language.t('in den letzten 7 Tagen')} icon="check" />
			<StatCard label={language.t('Bewerteter Durchschnitt')} value={percent(data.dashboard.progress.overview.averagePercent)} detail={language.t('{count} Übungen insgesamt', { count: data.dashboard.progress.overview.practiceCompleted })} icon="chart" />
			<StatCard label={language.t('Bestes Ergebnis')} value={percent(data.dashboard.progress.overview.bestPercent)} detail={language.t('{count} Probeprüfungen', { count: data.dashboard.progress.overview.mockExamsCompleted })} icon="spark" tone="accent" />
		</div>
	</Section>

	<Section title={language.t('Für dich empfohlen')} description={language.t('Gezielt üben, wo der größte Fortschritt möglich ist.')}>
		<div class="recommend-grid">
			<ContentCard eyebrow={language.t('Schwerpunkt')} title={data.dashboard.weakestTopic?.name ?? language.t('Neue Themen entdecken')} meta={data.dashboard.weakestTopic ? language.t('Bisher {percent} im Durchschnitt', { percent: percent(data.dashboard.weakestTopic.averagePercent) }) : language.t('Noch keine bewerteten Themen')}>
				<p>{language.t(data.dashboard.weakestTopic ? 'Festige dieses Thema mit einer passenden Aufgabe und direktem Feedback.' : 'Starte mit einer zufälligen Aufgabe, damit wir dir bald gezielter empfehlen können.')}</p>
				{#snippet footer()}<Button href={data.dashboard.weakestTopic ? `/uben?topicId=${data.dashboard.weakestTopic.id}` : '/uben'} variant="secondary">{language.t('Gezielt üben')}</Button>{/snippet}
			</ContentCard>
			<ContentCard eyebrow={language.t('Letztes Ergebnis')} title={recent?.title ?? language.t('Noch kein Ergebnis')} meta={recent ? (recent.status === 'graded' ? language.t('{score} von {maximum} Punkten', { score: recent.score ?? 0, maximum: recent.maxScore }) : language.t('Bewertung ausstehend')) : language.t('Deine Ergebnisse erscheinen hier')}>
				<p>{language.t(recent ? 'Sieh dir Antworten und Feedback noch einmal in Ruhe an.' : 'Schließe deine erste Übung ab, um deinen Lernstand sichtbar zu machen.')}</p>
				{#snippet footer()}{#if recent}<Button href={`/profil/versuche/${recent.id}`} variant="ghost">{language.t('Ergebnis ansehen')}</Button>{:else}<Button href="/uben" variant="ghost">{language.t('Erste Übung starten')}</Button>{/if}{/snippet}
			</ContentCard>
		</div>
	</Section>
	{:else}
		<section class="public-hero">
			<div>
				<Badge tone="accent">AbiPro</Badge>
				<h1>{language.t('Geschichte verstehen. Sicherer in die Prüfung.')}</h1>
				<p>{language.t('Entdecke echte Geschichtsaufgaben. Mit einem Konto kannst du gezielt üben, Probeprüfungen schreiben und deinen Fortschritt verfolgen.')}</p>
				<div class="public-actions">
					<Button href="/aufgaben">{language.t('Aufgaben entdecken')} <Icon name="chevron" size={18} /></Button>
					<Button href="/register" variant="secondary">{language.t('Kostenlos registrieren')}</Button>
				</div>
			</div>
			<div class="public-visual" aria-hidden="true"><span>1848</span><i></i><b>1956</b><i></i><span>1989</span></div>
		</section>
		<section class="public-features" aria-label={language.t('Das kannst du mit AbiPro machen')}>
			<ContentCard eyebrow={language.t('Aufgabenpool')} title={language.t('Echte Aufgaben entdecken')} meta={language.t('Ohne Anmeldung')}>
				<p>{language.t('Durchsuche veröffentlichte Aufgaben nach Thema, Epoche und Prüfungsjahr.')}</p>
				{#snippet footer()}<Button href="/aufgaben" variant="secondary">{language.t('Aufgaben ansehen')}</Button>{/snippet}
			</ContentCard>
			<ContentCard eyebrow={language.t('Mit Konto')} title={language.t('Üben und Fortschritte sehen')} meta={language.t('Persönlich für dich')}>
				<p>{language.t('Speichere Antworten, erhalte Feedback und erkenne, was du als Nächstes üben solltest.')}</p>
				{#snippet footer()}<Button href="/register" variant="secondary">{language.t('Jetzt starten')}</Button>{/snippet}
			</ContentCard>
		</section>
	{/if}
</main>

<style>
	.hero-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(16rem, .85fr); gap: var(--space-5); }
	.continue-card, .readiness-card { border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); }
	.continue-card { position: relative; display: grid; min-height: 21rem; grid-template-columns: minmax(0, 1.35fr) minmax(13rem, .65fr); overflow: hidden; background: #173d30; color: white; }
	.continue-copy { z-index: 1; align-self: center; padding: clamp(1.5rem, 4vw, 3rem); }
	.continue-copy h2 { max-width: 35rem; margin: var(--space-4) 0 var(--space-3); color: white; font-family: var(--font-display); font-size: clamp(1.8rem, 4vw, 2.7rem); line-height: 1.05; }
	.continue-copy p { max-width: 35rem; color: #c6d8d1; }
	.continue-copy form { display: block; }
	.hero-visual { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-2); overflow: hidden; background: linear-gradient(150deg, rgb(255 255 255 / .03), rgb(234 146 76 / .22)); color: #e9b58a; font-family: var(--font-display); font-size: 1.2rem; }
	.hero-visual::before { position: absolute; width: 14rem; height: 14rem; border: 1px solid rgb(255 255 255 / .12); border-radius: 50%; content: ''; }
	.hero-visual i { width: 1px; height: 3rem; background: #bc7650; }
	.hero-visual b { font-size: 2rem; }
	.readiness-card { padding: var(--space-6); border: 1px solid var(--color-border); background: var(--color-surface); }
	.readiness-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
	.readiness-head > span { display: grid; width: 2.75rem; height: 2.75rem; place-items: center; border-radius: var(--radius-md); background: var(--color-accent-soft); color: var(--color-accent); }
	.readiness-card h2 { margin: var(--space-8) 0 0; color: var(--color-muted); font-family: inherit; font-size: .82rem; letter-spacing: .05em; text-transform: uppercase; }
	.readiness-card > strong { display: block; margin: var(--space-1) 0 var(--space-5); font-family: var(--font-display); font-size: 3.4rem; line-height: 1; }
	.readiness-card p { margin: var(--space-5) 0; color: var(--color-muted); font-size: .9rem; line-height: 1.5; }
	.readiness-card a { display: inline-flex; align-items: center; gap: var(--space-1); font-size: .85rem; font-weight: 700; text-decoration: none; }
	.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
	.recommend-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); }
	.public-hero { display: grid; min-height: 24rem; grid-template-columns: minmax(0, 1.5fr) minmax(12rem, .5fr); overflow: hidden; border-radius: var(--radius-xl); background: #173d30; color: white; }
	.public-hero > div:first-child { align-self: center; padding: clamp(2rem, 5vw, 4rem); }
	.public-hero h1 { max-width: 45rem; margin: var(--space-5) 0; color: white; }
	.public-hero p { max-width: 35rem; color: #d4e4db; }
	.public-actions { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-6); }
	.public-visual { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-3); background: linear-gradient(150deg, rgb(255 255 255 / .03), rgb(234 146 76 / .22)); color: #e9b58a; font-family: var(--font-display); font-size: 1.5rem; }
	.public-visual i { width: 1px; height: 3rem; background: #bc7650; }
	.public-visual b { font-size: 2.5rem; }
	.public-features { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-5); margin-top: var(--space-6); }
	@media(max-width: 65rem) { .hero-grid { grid-template-columns: 1fr; } .continue-card { min-height: 18rem; } }
	@media(max-width: 45rem) { .continue-card { display: block; min-height: auto; } .hero-visual, .public-visual { display: none; } .stat-grid, .recommend-grid, .public-features, .public-hero { grid-template-columns: 1fr; } }
</style>
