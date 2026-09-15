<script lang="ts">
	import { enhance } from '$app/forms';
	import { beforeNavigate } from '$app/navigation';
	import SourceEditor from '$lib/components/admin/SourceEditor.svelte';
	import QuestionEditor from '$lib/components/admin/QuestionEditor.svelte';
	import TaskPreview from '$lib/components/admin/TaskPreview.svelte';
	import { newQuestion, newSource, questionFromRecord, questionPayload, sourceFromRecord, sourcePayload, validationSummary, type QuestionKind, type SourceKind } from '$lib/types/admin';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	function initialState() { return { title: data.task.title, instructions: data.task.instructions ?? '', curriculumId: data.task.curriculumId, periodId: data.task.periodId, examSessionId: data.task.examSessionId, examPosition: data.task.examPosition, maxPoints: data.task.maxPoints, topicIds: [...data.task.topicIds], sources: data.task.sources.map(sourceFromRecord), questions: data.task.questions.map(questionFromRecord) }; }
	const initial = initialState();
	let title = $state(initial.title);
	let instructions = $state(initial.instructions);
	let curriculumId = $state(initial.curriculumId);
	let periodId = $state(initial.periodId);
	let examSessionId = $state(initial.examSessionId);
	let examPosition = $state(initial.examPosition);
	let maxPoints = $state(initial.maxPoints);
	let topicIds = $state(initial.topicIds);
	let sources = $state(initial.sources);
	let questions = $state(initial.questions);
	let sourceKind = $state<SourceKind>('text');
	let questionKind = $state<QuestionKind>('choice');
	let dirty = $state(false);
	const issues = $derived([...(!topicIds.length ? ['Mindestens ein Thema fehlt.'] : []), ...validationSummary(maxPoints, sources, questions)]);

	function move<T>(items: T[], index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= items.length) return; [items[index], items[target]] = [items[target], items[index]]; dirty = true; }
	function duplicateSource(index: number) { const copy = structuredClone(sources[index]); copy.clientId = crypto.randomUUID(); sources.splice(index + 1, 0, copy); dirty = true; }
	function duplicateQuestion(index: number) { const copy = structuredClone(questions[index]); copy.clientId = crypto.randomUUID(); questions.splice(index + 1, 0, copy); dirty = true; }
	function warnOnUnload(event: BeforeUnloadEvent) { if (dirty) event.preventDefault(); }

	beforeNavigate(({ cancel }) => { if (dirty && !confirm('Ungespeicherte Änderungen verwerfen?')) cancel(); });
</script>

<svelte:window onbeforeunload={warnOnUnload} />
<svelte:head><title>{data.task.title} – Administration – AbiPro</title></svelte:head>
<main>
	<p><a href="/admin/aufgaben">Zur Aufgabenverwaltung</a></p><h1>{data.task.title}</h1>
	<p>Slug: <code>{data.task.slug}</code> · Version {data.task.version} · Versionsstatus: {data.task.status} · Aufgabenstatus: {data.task.taskStatus}</p>
	{#if form?.message}<p role="status">{form.message}</p>{/if}
	{#if data.task.taskStatus === 'archived'}<form method="POST" action="?/restore"><button>Aufgabe wiederherstellen</button></form>{:else}<form method="POST" action="?/archive"><button>Aufgabe archivieren</button></form>{/if}

	{#if data.task.status === 'draft'}
		{#if issues.length}<section aria-labelledby="validation-heading"><h2 id="validation-heading">Offene Punkte</h2><ul>{#each issues as issue (issue)}<li>{issue}</li>{/each}</ul></section>{:else}<p role="status">Der Entwurf ist veröffentlichungsbereit.</p>{/if}
		<form method="POST" action="?/save" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') dirty = false; await update({ reset: false }); }} oninput={() => dirty = true}>
			<input type="hidden" name="sources" value={JSON.stringify(sources.map(sourcePayload))} />
			<input type="hidden" name="questions" value={JSON.stringify(questions.map(questionPayload))} />
			<section><h2>Grunddaten</h2><p><label>Titel <input name="title" bind:value={title} required /></label></p><p><label>Anweisung <textarea name="instructions" bind:value={instructions}></textarea></label></p><p><label>Lehrplan <select name="curriculumId" bind:value={curriculumId}>{#each data.curricula as item (item.id)}<option value={item.id}>{item.name}</option>{/each}</select></label></p><p><label>Epoche <select name="periodId" bind:value={periodId}>{#each data.periods as item (item.id)}<option value={item.id}>{item.name}</option>{/each}</select></label></p><p><label>Prüfungstermin <select name="examSessionId" bind:value={examSessionId}>{#each data.sessions as item (item.id)}<option value={item.id}>{item.year} – {item.session === 'spring' ? 'Frühjahr' : 'Herbst'}</option>{/each}</select></label></p><p><label>Offizielle Position im Kurzantwort-Teil <select name="examPosition" bind:value={examPosition}><option value={null}>Nicht für Prüfungen</option>{#each Array.from({ length: 12 }, (_, index) => index + 1) as position (position)}<option value={position}>{position}</option>{/each}</select></label></p><p><label>Maximalpunktzahl <input name="maxPoints" bind:value={maxPoints} type="number" min="0.25" step="0.25" required /></label></p><fieldset><legend>Themen</legend>{#each data.topics as item (item.id)}<label><input type="checkbox" name="topicIds" value={item.id} bind:group={topicIds} /> {item.name}</label>{/each}</fieldset></section>

			<section><h2>Quellen</h2>{#each sources as source, index (source.clientId)}<SourceEditor bind:source={sources[index]} {index} total={sources.length} assets={data.assets} onchange={() => dirty = true} onmove={(direction) => move(sources, index, direction)} onduplicate={() => duplicateSource(index)} onremove={() => { sources.splice(index, 1); dirty = true; }} />{/each}<p><label>Neue Quelle <select bind:value={sourceKind}><option value="text">Text</option><option value="image">Bild</option><option value="table">Tabelle</option><option value="map">Karte</option></select></label> <button type="button" onclick={() => { sources.push(newSource(sourceKind)); dirty = true; }}>Quelle hinzufügen</button></p></section>

			<section><h2>Fragen</h2>{#each questions as question, index (question.clientId)}<QuestionEditor bind:question={questions[index]} {index} total={questions.length} onchange={() => dirty = true} onmove={(direction) => move(questions, index, direction)} onduplicate={() => duplicateQuestion(index)} onremove={() => { questions.splice(index, 1); dirty = true; }} />{/each}<p><label>Neue Frage <select bind:value={questionKind}><option value="choice">Einfachauswahl</option><option value="multiple_choice">Mehrfachauswahl</option><option value="matching">Zuordnung</option><option value="ordering">Reihenfolge</option><option value="short_text">Freitext</option></select></label> <button type="button" onclick={() => { questions.push(newQuestion(questionKind)); dirty = true; }}>Frage hinzufügen</button></p></section>
			<p><button>Entwurf speichern</button> {#if dirty}<small>Ungespeicherte Änderungen</small>{/if}</p>
		</form>
		<form method="POST" action="?/publish"><button disabled={dirty || issues.length > 0}>Veröffentlichen</button>{#if dirty}<small>Speichere zuerst deine Änderungen.</small>{/if}</form>
	{:else}
		<p>Diese Version ist unveränderlich.</p><form method="POST" action="?/createRevision"><button>Neue Entwurfsversion erstellen</button></form>
	{/if}

	<TaskPreview {title} {instructions} {maxPoints} {sources} {questions} assets={data.assets} />
</main>
