<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui';
	import { PageHeader } from '$lib/components/page';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	let starting = $state(false);
	const relativeTime = (value: Date | string) => {
		const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
		if (minutes < 60) return `vor ${minutes} Min.`;
		const hours = Math.round(minutes / 60);
		return hours < 24 ? `vor ${hours} Std.` : `vor ${Math.round(hours / 24)} Tagen`;
	};
</script>

<svelte:head><title>Üben – AbiPro</title></svelte:head>
<main>
	<PageHeader eyebrow="Training" title="Was möchtest du heute üben?" description="Starte sofort oder stelle dir eine gezielte Übung zusammen." />
	{#if form?.message}<p role="alert" class="form-error">{form.message}</p>{/if}

	<section class="quick-start">
		<div><span class="kicker">Schnellstart</span><h2>Direkt loslegen</h2><p>Wir wählen eine passende veröffentlichte Aufgabe für dich aus.</p></div>
		<form method="POST" action="?/start" use:enhance={() => { starting = true; return async ({ update }) => { await update(); starting = false; }; }}><input type="hidden" name="taskSlug" value={data.requestedTaskSlug ?? ''} /><button disabled={starting}>{starting ? 'Wird vorbereitet …' : data.requestedTaskSlug ? 'Ausgewählte Aufgabe starten' : 'Quick Practice starten →'}</button></form>
	</section>

	{#if data.resumableAttempts.length}
		<section><div class="section-heading"><div><span class="kicker">Weitermachen</span><h2>Offene Übungen</h2></div><span>{data.resumableAttempts.length}</span></div>
			<div class="resume-grid">{#each data.resumableAttempts as attempt (attempt.id)}
				<a href={`/uben/${attempt.id}`} class="resume-card"><div><span>Zuletzt aktiv {relativeTime(attempt.lastActivityAt)}</span><h3>{attempt.title}</h3></div><div class="resume-progress"><div><i style={`width:${attempt.questionCount ? Math.round(100 * attempt.answeredCount / attempt.questionCount) : 0}%`}></i></div><strong>{attempt.answeredCount}/{attempt.questionCount}</strong></div><b>Fortsetzen →</b></a>
			{/each}</div>
		</section>
	{/if}

	{#if data.recommendedTopic}
		<section class="recommendation"><div><span class="kicker">Für dich empfohlen</span><h2>{data.recommendedTopic.name} festigen</h2><p>Dein aktueller Durchschnitt liegt hier bei {data.recommendedTopic.averagePercent} %. Eine kurze Wiederholung bringt jetzt am meisten.</p></div><form method="POST" action="?/start"><input type="hidden" name="topicId" value={data.recommendedTopic.id} /><input type="hidden" name="onlyNotPracticed" value="on" /><button>Empfohlene Übung starten</button></form></section>
	{/if}

	<section class="custom-practice">
		<div class="section-heading"><div><span class="kicker">Gezielt üben</span><h2>Übung zusammenstellen</h2></div></div>
		<form method="POST" action="?/start" class="choice-form">
			<fieldset><legend>Epoche</legend><div class="choice-cards"><label><input type="radio" name="periodId" value="" checked /><span>Alle Epochen</span></label>{#each data.periods as item (item.id)}<label><input type="radio" name="periodId" value={item.id} /><span>{item.name}</span></label>{/each}</div></fieldset>
			<fieldset><legend>Thema</legend><div class="choice-cards"><label><input type="radio" name="topicId" value="" checked={!data.requestedTopicId} /><span>Alle Themen</span></label>{#each data.topics as item (item.id)}<label><input type="radio" name="topicId" value={item.id} checked={data.requestedTopicId === item.id} /><span>{item.name}</span></label>{/each}</div></fieldset>
			<label class="unseen"><input type="checkbox" name="onlyNotPracticed" /><span><strong>Nur ungesehene Aufgaben</strong><small>Bereits geübte Aufgaben auslassen</small></span></label>
			<div class="custom-action"><Button type="submit">Gezielte Übung starten</Button></div>
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
