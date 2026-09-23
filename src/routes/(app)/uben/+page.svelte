<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui';
	import { PageHeader } from '$lib/components/page';
	import { getLanguageContext } from '$lib/i18n';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	const language = getLanguageContext();
	let starting = $state(false);
	const relativeTime = (value: Date | string) => {
		const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
		if (minutes < 60) return language.t('vor {count} Min.', { count: minutes });
		const hours = Math.round(minutes / 60);
		return hours < 24 ? language.t('vor {count} Std.', { count: hours }) : language.t('vor {count} Tagen', { count: Math.round(hours / 24) });
	};
</script>

<svelte:head><title>{language.t('Üben')} – AbiPro</title></svelte:head>
<main>
	<PageHeader eyebrow={language.t('Training')} title={language.t('Was möchtest du heute üben?')} description={language.t('Starte sofort oder stelle dir eine gezielte Übung zusammen.')} />
	{#if form?.message}<p role="alert" class="form-error">{form.message}</p>{/if}

	<section class="quick-start">
		<div><span class="kicker">{language.t('Schnellstart')}</span><h2>{language.t('Direkt loslegen')}</h2><p>{language.t('Wir wählen eine passende veröffentlichte Aufgabe für dich aus.')}</p></div>
		<form method="POST" action="?/start" use:enhance={() => { starting = true; return async ({ update }) => { await update(); starting = false; }; }}><input type="hidden" name="taskSlug" value={data.requestedTaskSlug ?? ''} /><button disabled={starting}>{starting ? language.t('Wird vorbereitet …') : data.requestedTaskSlug ? language.t('Ausgewählte Aufgabe starten') : language.t('Quick Practice starten →')}</button></form>
	</section>

	{#if data.resumableAttempts.length}
		<section><div class="section-heading"><div><span class="kicker">{language.t('Weitermachen')}</span><h2>{language.t('Offene Übungen')}</h2></div><span>{data.resumableAttempts.length}</span></div>
			<div class="resume-grid">{#each data.resumableAttempts as attempt (attempt.id)}
				<a href={`/uben/${attempt.id}`} class="resume-card"><div><span>{language.t('Zuletzt aktiv {time}', { time: relativeTime(attempt.lastActivityAt) })}</span><h3>{attempt.title}</h3></div><div class="resume-progress"><div><i style={`width:${attempt.questionCount ? Math.round(100 * attempt.answeredCount / attempt.questionCount) : 0}%`}></i></div><strong>{attempt.answeredCount}/{attempt.questionCount}</strong></div><b>{language.t('Fortsetzen →')}</b></a>
			{/each}</div>
		</section>
	{/if}

	{#if data.recommendedTopic}
		<section class="recommendation"><div><span class="kicker">{language.t('Für dich empfohlen')}</span><h2>{language.t('{name} festigen', { name: data.recommendedTopic.name })}</h2><p>{language.t('Dein aktueller Durchschnitt liegt hier bei {percent} %. Eine kurze Wiederholung bringt jetzt am meisten.', { percent: data.recommendedTopic.averagePercent ?? 0 })}</p></div><form method="POST" action="?/start"><input type="hidden" name="topicId" value={data.recommendedTopic.id} /><input type="hidden" name="onlyNotPracticed" value="on" /><button>{language.t('Empfohlene Übung starten')}</button></form></section>
	{/if}

	<section class="custom-practice">
		<div class="section-heading"><div><span class="kicker">{language.t('Gezielt üben')}</span><h2>{language.t('Übung zusammenstellen')}</h2></div></div>
		<form method="POST" action="?/start" class="choice-form">
			<fieldset><legend>{language.t('Sammlung')}</legend><div class="choice-cards"><label><input type="radio" name="origin" value="" checked /><span>{language.t('Alle Sammlungen')}</span></label><label><input type="radio" name="origin" value="official" /><span>{language.t('Offizielle Prüfungen')}</span></label><label><input type="radio" name="origin" value="ujkor" /><span>{language.t('Újkor.hu Aufgaben')}</span></label></div></fieldset>
			<fieldset><legend>{language.t('Geschichte')}</legend><div class="choice-cards"><label><input type="radio" name="historyScope" value="" checked /><span>{language.t('Ungarische und Weltgeschichte')}</span></label><label><input type="radio" name="historyScope" value="hungarian" /><span>{language.t('Ungarische Geschichte')}</span></label><label><input type="radio" name="historyScope" value="global" /><span>{language.t('Weltgeschichte')}</span></label></div></fieldset>
			<fieldset><legend>{language.t('Epoche')}</legend><div class="choice-cards"><label><input type="radio" name="periodId" value="" checked /><span>{language.t('Alle Epochen')}</span></label>{#each data.periods as item (item.id)}<label><input type="radio" name="periodId" value={item.id} /><span>{item.name}</span></label>{/each}</div></fieldset>
			<fieldset><legend>{language.t('Thema')}</legend><div class="choice-cards"><label><input type="radio" name="topicId" value="" checked={!data.requestedTopicId} /><span>{language.t('Alle Themen')}</span></label>{#each data.topics as item (item.id)}<label><input type="radio" name="topicId" value={item.id} checked={data.requestedTopicId === item.id} /><span>{item.name}</span></label>{/each}</div></fieldset>
			<label class="unseen"><input type="checkbox" name="onlyNotPracticed" /><span><strong>{language.t('Nur ungesehene Aufgaben')}</strong><small>{language.t('Bereits geübte Aufgaben auslassen')}</small></span></label>
			<div class="custom-action"><Button type="submit">{language.t('Gezielte Übung starten')}</Button></div>
		</form>
	</section>
</main>

<style>
	.kicker { color: var(--color-brand-strong); font-size: .72rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
	.quick-start, .recommendation { display: flex; align-items: center; justify-content: space-between; gap: var(--space-6); padding: var(--space-6); border-radius: var(--radius-xl); background: linear-gradient(135deg, #123f31, #176b4d); color: white; box-shadow: var(--shadow-md); }
	.quick-start h2, .recommendation h2 { margin: .35rem 0; color: white; font-family: var(--font-display); font-size: 1.65rem; }
	.quick-start p, .recommendation p { margin: 0; color: #dcebe5; }
	.quick-start .kicker, .recommendation .kicker { color: #ffbf87; }
	.quick-start form, .recommendation form { flex: none; }
	.quick-start button, .recommendation button { border-color: #f4a261; background: #f4a261; color: #40200a; }
	.section-heading { display: flex; align-items: end; justify-content: space-between; margin-bottom: var(--space-4); }
	.section-heading h2 { margin: .25rem 0 0; }
	.section-heading > span { display: grid; width: 2rem; height: 2rem; place-items: center; border-radius: 99px; background: var(--color-brand-soft); color: var(--color-brand-strong); font-weight: 800; }
	.resume-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); }
	.resume-card { display: grid; gap: var(--space-4); padding: var(--space-5); border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); color: var(--color-ink); text-decoration: none; box-shadow: var(--shadow-sm); }
	.resume-card span { color: var(--color-muted); font-size: .78rem; }
	.resume-card h3 { margin: .3rem 0 0; font-size: 1.05rem; }
	.resume-card b { color: var(--color-brand-strong); font-size: .88rem; }
	.resume-progress { display: flex; align-items: center; gap: var(--space-3); }
	.resume-progress > div { height: .45rem; flex: 1; overflow: hidden; border-radius: 99px; background: var(--color-surface-soft); }
	.resume-progress i { display: block; height: 100%; border-radius: inherit; background: var(--color-brand); }
	.recommendation { background: linear-gradient(135deg, #663717, #9a5525); }
	.custom-practice { padding: var(--space-6); border: 1px solid var(--color-border); border-radius: var(--radius-xl); background: var(--color-surface); }
	.choice-form { display: grid; }
	fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
	legend { margin-bottom: var(--space-3); color: var(--color-ink); font-weight: 800; }
	.choice-cards { display: flex; flex-wrap: wrap; gap: var(--space-2); }
	.choice-cards label { display: block; min-width: 0; }
	.choice-cards input { position: absolute; opacity: 0; pointer-events: none; }
	.choice-cards span { display: block; padding: .65rem .85rem; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); background: var(--color-surface); cursor: pointer; font-size: .82rem; }
	.choice-cards input:checked + span { border-color: var(--color-brand); background: var(--color-brand-soft); color: var(--color-brand-strong); box-shadow: inset 0 0 0 1px var(--color-brand); }
	.choice-cards input:focus-visible + span { box-shadow: var(--focus-ring); }
	.unseen { display: flex; min-width: 0; flex-direction: row; align-items: center; gap: var(--space-3); padding: var(--space-4); border-radius: var(--radius-md); background: var(--color-surface-soft); }
	.unseen span { display: grid; }
	.unseen small { color: var(--color-muted); font-weight: 400; }
	.custom-action { padding-top: var(--space-2); }
	.form-error { padding: var(--space-3); border-radius: var(--radius-md); background: var(--color-danger-soft); }
	@media(max-width: 45rem) { .quick-start, .recommendation { align-items: stretch; flex-direction: column; } .quick-start form, .quick-start button, .recommendation form, .recommendation button { width: 100%; } .resume-grid { grid-template-columns: 1fr; } .custom-practice { padding: var(--space-4); } }
</style>
