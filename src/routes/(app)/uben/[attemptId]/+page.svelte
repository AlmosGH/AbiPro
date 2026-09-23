<script lang="ts">
	import { applyAction, deserialize, enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import { onMount } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { announceStatus } from '$lib/client/status';
	import PracticeAnswerInput from '$lib/components/questions/PracticeAnswerInput.svelte';
	import SourceList from '$lib/components/task/SourceList.svelte';
	import type { AnswerPayload } from '$lib/types/questions';
	import type { LearnerQuestion } from '$lib/types/tasks';
	import type { SaveState } from '$lib/types/practice';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let currentIndex = $state(0);
	let mobilePane = $state<'source' | 'question'>('question');
	let showOverview = $state(false);
	function initialAnswers() {
		return Object.fromEntries(data.attempt.questions.map((question) => {
			const saved = data.attempt.answers.find((answer) => answer.questionId === question.id)?.response;
			return [question.id, saved ?? emptyAnswer(question)];
		}));
	}
	let answers = $state<Record<number, AnswerPayload>>(initialAnswers());
	let saveStates = $state<Record<number, SaveState>>({});
	let errors = $state<Record<number, string>>({});
	let submitting = $state(false);
	let submitError = $state('');
	let selfGradeOverrides = $state<Record<number, number>>({});
	const timers = new SvelteMap<number, ReturnType<typeof setTimeout>>();
	const savingPromises = new SvelteMap<number, Promise<boolean>>();
	const dirty = new SvelteSet<number>();
	const currentQuestion = $derived(data.attempt.questions[currentIndex]);
	const saveStatus = $derived.by(() => Object.values(saveStates).includes('error') ? 'error' : dirty.size || Object.values(saveStates).includes('saving') ? 'saving' : Object.values(saveStates).includes('saved') ? 'saved' : 'idle');
	const gradingPending = $derived(data.attempt.results.some((result) => result.status === 'pending' || result.status === 'processing'));

	export const snapshot = {
		capture: () => ({ answers, currentIndex, mobilePane }),
		restore: (value: { answers: Record<number, AnswerPayload>; currentIndex: number; mobilePane: 'source' | 'question' }) => {
			answers = value.answers;
			currentIndex = value.currentIndex;
			mobilePane = value.mobilePane;
			announceStatus('Dein unvollständiger Versuch wurde wiederhergestellt.', 'info');
		}
	};

	onMount(() => {
		const tabId = crypto.randomUUID();
		const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(`abipro-attempt-${data.attempt.id}`);
		if (channel) {
			channel.onmessage = (event) => {
				if (event.data?.type === 'open' && event.data?.tabId !== tabId) {
					announceStatus('Dieser Versuch ist auch in einem anderen Tab geöffnet. Dortige Änderungen können deine überschreiben.', 'warning', 0);
					channel.postMessage({ type: 'present', tabId });
				} else if (event.data?.type === 'present' && event.data?.tabId !== tabId) {
					announceStatus('Dieser Versuch ist auch in einem anderen Tab geöffnet.', 'warning', 0);
				}
			};
			channel.postMessage({ type: 'open', tabId });
		}
		const retry = () => { if (dirty.size) void Promise.all([...dirty].map(saveAnswer)); };
		window.addEventListener('online', retry);
		let pollTimer: ReturnType<typeof setTimeout> | undefined;
		let delay = 2_000;
		const poll = async () => {
			if (!gradingPending || !navigator.onLine) return;
			await invalidate(`attempt:practice:${data.attempt.id}`);
			delay = Math.min(delay * 1.7, 30_000);
			if (gradingPending) pollTimer = setTimeout(poll, delay);
		};
		if (gradingPending) pollTimer = setTimeout(poll, delay);
		return () => {
			channel?.close();
			window.removeEventListener('online', retry);
			if (pollTimer) clearTimeout(pollTimer);
		};
	});

	function emptyAnswer(question: LearnerQuestion): AnswerPayload {
		switch (question.config.kind) {
			case 'choice': return { kind: 'choice', optionId: '' };
			case 'multiple_choice': return { kind: 'multiple_choice', optionIds: [] };
			case 'matching': return { kind: 'matching', pairs: [] };
			case 'ordering': return { kind: 'ordering', itemIds: question.config.items.map((item) => item.id) };
			case 'short_text': return { kind: 'short_text', text: '' };
		}
	}

	function isAnswered(answer: AnswerPayload) {
		switch (answer.kind) {
			case 'choice': return Boolean(answer.optionId);
			case 'multiple_choice': return answer.optionIds.length > 0;
			case 'matching': return answer.pairs.length > 0;
			case 'ordering': return answer.itemIds.length > 0;
			case 'short_text': return Boolean(answer.text.trim());
		}
	}

	function answerLabel(answer: AnswerPayload) {
		switch (answer.kind) {
			case 'choice': return answer.optionId || 'Keine Antwort';
			case 'multiple_choice': return answer.optionIds.join(', ') || 'Keine Antwort';
			case 'matching': return answer.pairs.map((pair) => `${pair.leftId} → ${pair.rightId}`).join(', ') || 'Keine Antwort';
			case 'ordering': return answer.itemIds.join(' → ') || 'Keine Antwort';
			case 'short_text': return answer.text || 'Keine Antwort';
		}
	}

	function updateAnswer(questionId: number, answer: AnswerPayload) {
		answers[questionId] = answer;
		dirty.add(questionId);
		saveStates[questionId] = 'saving';
		delete errors[questionId];
		const timer = timers.get(questionId);
		if (timer) clearTimeout(timer);
		timers.set(questionId, setTimeout(() => void saveAnswer(questionId), 600));
	}

	async function saveAnswer(questionId: number): Promise<boolean> {
		const timer = timers.get(questionId);
		if (timer) clearTimeout(timer);
		timers.delete(questionId);
		const active = savingPromises.get(questionId);
		if (active) { const succeeded = await active; return succeeded && dirty.has(questionId) ? saveAnswer(questionId) : succeeded; }
		if (!dirty.has(questionId)) return true;
		const serializedAnswer = JSON.stringify(answers[questionId]);
		saveStates[questionId] = 'saving';
		const request = (async () => {
			try {
				const response = await fetch(`/uben/${data.attempt.id}/answer/${questionId}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: serializedAnswer });
				if (!response.ok) throw new Error('Speichern fehlgeschlagen. Bitte versuche es erneut.');
				if (serializedAnswer === JSON.stringify(answers[questionId])) { dirty.delete(questionId); saveStates[questionId] = 'saved'; }
				return true;
			} catch (cause) { saveStates[questionId] = 'error'; errors[questionId] = cause instanceof Error ? cause.message : 'Speichern fehlgeschlagen.'; return false; }
		})();
		savingPromises.set(questionId, request);
		const succeeded = await request;
		savingPromises.delete(questionId);
		return succeeded && dirty.has(questionId) ? saveAnswer(questionId) : succeeded;
	}

	async function submitAttempt(event: SubmitEvent) {
		event.preventDefault();
		if (submitting) return;
		const formElement = event.currentTarget as HTMLFormElement;
		submitting = true; submitError = '';
		const saved = await Promise.all([...dirty].map(saveAnswer));
		if (saved.some((success) => !success)) { submitting = false; return; }
		const response = await fetch('?/submit', { method: 'POST', headers: { 'x-sveltekit-action': 'true' }, body: new FormData(formElement) });
		const result: ActionResult = deserialize(await response.text());
		if (result.type === 'success') { await invalidate(`attempt:practice:${data.attempt.id}`); await applyAction(result); announceStatus('Übung abgegeben.', 'success'); }
		else { await applyAction(result); submitError = 'Die Übung konnte nicht abgegeben werden. Bitte versuche es erneut.'; submitting = false; }
	}

	function resultFor(questionId: number) { return data.attempt.results.find((result) => result.questionId === questionId); }

	const enhanceSelfGrade: SubmitFunction = ({ formData }) => {
		const answerId = Number(formData.get('answerId'));
		const awardedPoints = Number(formData.get('awardedPoints'));
		if (Number.isFinite(answerId) && Number.isFinite(awardedPoints)) selfGradeOverrides[answerId] = awardedPoints;
		return async ({ result, update }) => {
			await update({ reset: false, invalidateAll: false });
			if (result.type === 'success') {
				await invalidate(`attempt:practice:${data.attempt.id}`);
				announceStatus('Selbstbewertung gespeichert.', 'success');
			} else {
				delete selfGradeOverrides[answerId];
				announceStatus('Selbstbewertung konnte nicht gespeichert werden.', 'danger');
			}
		};
	};
</script>

<svelte:head><title>{data.attempt.title} – Üben – AbiPro</title></svelte:head>
<main class="practice-page">
	<header class="practice-header"><div><a href="/uben">← Übung verlassen</a><h1>{data.attempt.title}</h1><p>{data.attempt.origin === 'ujkor' ? 'Újkor.hu-Sammlung' : `${data.attempt.year} · ${data.attempt.session === 'spring' ? 'Frühjahr' : 'Herbst'}`} · {data.attempt.period} · {data.attempt.historyScope === 'hungarian' ? 'Ungarische Geschichte' : 'Weltgeschichte'} · {data.attempt.maxScore} Punkte</p></div>{#if data.attempt.status === 'in_progress'}<div class:save-problem={saveStatus === 'error'} class="save-indicator" aria-live="polite"><i></i>{saveStatus === 'saving' ? 'Wird gespeichert …' : saveStatus === 'error' ? 'Speichern fehlgeschlagen' : saveStatus === 'saved' ? 'Alles gespeichert' : 'Autosave aktiv'}</div>{/if}</header>

	{#if data.attempt.status === 'graded'}
		<section class="result-summary"><span>Dein Ergebnis</span><strong>{data.attempt.score} / {data.attempt.maxScore}</strong><p>{data.bestAttempt ? `Dein Bestwert: ${data.bestAttempt.score} von ${data.bestAttempt.maxScore} Punkten.` : 'Jeder Versuch macht Muster sichtbar.'}</p></section>
	{/if}
	{#if gradingPending}<p class="readiness-message" role="status">Die KI-Bewertung läuft. Der Status wird automatisch aktualisiert …</p>{/if}

	<div class="mobile-tabs" role="tablist"><button class:active={mobilePane === 'question'} onclick={() => mobilePane = 'question'}>Frage</button><button class:active={mobilePane === 'source'} onclick={() => mobilePane = 'source'}>Quellen ({data.attempt.sources.length})</button></div>
	<div class="player-grid">
		<aside class:mobile-hidden={mobilePane !== 'source'} class="source-pane"><div><span class="pane-label">Quellenmaterial</span><SourceList sources={data.attempt.sources} /></div></aside>
		<section class:mobile-hidden={mobilePane !== 'question'} class="question-pane">
			<div class="question-toolbar"><span>Frage {currentIndex + 1} von {data.attempt.questions.length}</span><button type="button" class="overview-button" onclick={() => showOverview = !showOverview}>Übersicht</button></div>
			{#if showOverview}<nav class="question-overview" aria-label="Fragenübersicht">{#each data.attempt.questions as question, index (question.id)}<button type="button" class:current={index === currentIndex} class:answered={isAnswered(answers[question.id])} onclick={() => { currentIndex = index; showOverview = false; }}>{index + 1}<span class="sr-only">. Frage {isAnswered(answers[question.id]) ? 'beantwortet' : 'offen'}</span></button>{/each}</nav>{/if}
			{#if data.attempt.instructions}<p class="instructions">{data.attempt.instructions}</p>{/if}
			{#if form?.message}<p role="alert">{form.message}</p>{/if}{#if submitError}<p role="alert">{submitError}</p>{/if}
			{#each data.attempt.results.filter((result) => result.status === 'needs_review') as result (result.answerId)}<form id={`self-grade-${result.answerId}`} method="POST" action="?/selfGrade" use:enhance={enhanceSelfGrade}></form>{/each}
			{#if data.attempt.results.some((result) => result.status === 'needs_review')}<form id="retry-auto-grade" method="POST" action="?/retryAutoGrade"></form>{/if}
			<form method="POST" action="?/submit" onsubmit={data.attempt.status === 'in_progress' ? submitAttempt : undefined}>
				<article class="question-card"><div class="question-title"><span>{currentIndex + 1}</span><h2>{currentQuestion.prompt}</h2><b>{currentQuestion.maxPoints} P.</b></div><PracticeAnswerInput question={currentQuestion} value={answers[currentQuestion.id]} disabled={data.attempt.status !== 'in_progress'} onanswer={(answer) => updateAnswer(currentQuestion.id, answer)} />
				{#if data.attempt.status !== 'in_progress' && resultFor(currentQuestion.id)}{@const result = resultFor(currentQuestion.id)!}<div class="grading"><section><span>Deine Antwort</span><p>{answerLabel(answers[currentQuestion.id])}</p></section><section><span>Ergebnis</span><strong>{result.status === 'pending' || result.status === 'processing' ? 'Bewertung ausstehend' : `${selfGradeOverrides[result.answerId] ?? result.score} von ${result.maximum} Punkten`}</strong></section><section><span>Feedback</span><p>{result.feedback || 'Kein zusätzliches Feedback.'}</p></section>{#if result.solution}<section class="solution"><span>Musterlösung</span><p>{result.solution}</p></section>{/if}{#if result.status === 'needs_review'}<div class="self-grade"><button form="retry-auto-grade">Automatische Bewertung erneut versuchen</button><label>Eigene Punktzahl (0–{result.maximum}) <input form={`self-grade-${result.answerId}`} type="number" name="awardedPoints" min="0" max={result.maximum} step="0.5" required /></label><button form={`self-grade-${result.answerId}`} name="answerId" value={result.answerId}>Selbst bewerten</button></div>{/if}</div>{/if}</article>
				<div class="question-actions"><button type="button" class="secondary-action" disabled={currentIndex === 0} onclick={() => currentIndex--}>← Zurück</button>{#if currentIndex < data.attempt.questions.length - 1}<button type="button" onclick={() => currentIndex++}>Nächste Frage →</button>{:else if data.attempt.status === 'in_progress'}<button disabled={submitting}>{submitting ? 'Wird abgegeben …' : 'Übung auswerten'}</button>{/if}</div>
			</form>
		</section>
	</div>
	{#if data.attempt.status === 'graded'}<div class="next-actions"><a class="button-link" href={`/uben?task=${data.attempt.slug}`}>Noch einmal versuchen</a><a class="button-link secondary-action" href="/uben">Eine ähnliche Aufgabe üben</a></div>{/if}
</main>

<style>
	.practice-page { max-width: 90rem !important; }
	.practice-header { display: flex; align-items: end; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-6); }
	.practice-header h1 { margin: var(--space-2) 0; font-size: clamp(1.8rem, 4vw, 2.6rem); }
	.practice-header p { margin: 0; color: var(--color-muted); }
	.save-indicator { display: flex; align-items: center; gap: var(--space-2); padding: .55rem .8rem; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-surface); color: var(--color-muted); font-size: .8rem; font-weight: 700; }
	.save-indicator i { width: .5rem; height: .5rem; border-radius: 50%; background: var(--color-brand); }.save-indicator.save-problem { color: var(--color-danger); }.save-problem i { background: var(--color-danger); }
	.player-grid { display: grid; grid-template-columns: minmax(20rem, .9fr) minmax(28rem, 1.25fr); align-items: start; gap: var(--space-5); }
	.source-pane > div { position: sticky; top: calc(var(--topbar-height) + var(--space-4)); max-height: calc(100vh - var(--topbar-height) - 2rem); overflow: auto; }
	.pane-label { display: block; margin-bottom: var(--space-3); color: var(--color-muted); font-size: .72rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
	.question-pane { min-width: 0; }
	.question-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3); color: var(--color-muted); font-size: .82rem; font-weight: 700; }
	.overview-button, .secondary-action { border-color: var(--color-border-strong); background: var(--color-surface); color: var(--color-ink); }
	.question-overview { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: var(--color-surface-soft); }
	.question-overview button { width: 2.4rem; min-height: 2.4rem; padding: 0; border-color: var(--color-border-strong); background: white; color: var(--color-ink); }.question-overview button.answered { border-color: var(--color-brand); background: var(--color-brand-soft); }.question-overview button.current { box-shadow: var(--focus-ring); }
	.question-pane form { display: block; }
	.question-card { padding: var(--space-6); border: 1px solid var(--color-border); border-radius: var(--radius-xl); background: var(--color-surface); box-shadow: var(--shadow-sm); }
	.question-title { display: grid; grid-template-columns: auto 1fr auto; align-items: start; gap: var(--space-3); margin-bottom: var(--space-6); }.question-title > span { display: grid; width: 2rem; height: 2rem; place-items: center; border-radius: 50%; background: var(--color-brand-soft); color: var(--color-brand-strong); font-weight: 800; }.question-title h2 { margin: .2rem 0 0; }.question-title b { color: var(--color-muted); font-size: .8rem; }
	.question-actions { display: flex; justify-content: space-between; gap: var(--space-3); margin-top: var(--space-4); }
	.grading { display: grid; gap: var(--space-3); margin-top: var(--space-6); padding-top: var(--space-5); border-top: 1px solid var(--color-border); }.grading section { padding: var(--space-4); border-radius: var(--radius-md); background: var(--color-surface-soft); }.grading section > span { display: block; margin-bottom: var(--space-2); color: var(--color-muted); font-size: .7rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }.grading p { margin: 0; white-space: pre-wrap; }.grading .solution { border-left: 3px solid var(--color-brand); background: var(--color-brand-soft); }
	.result-summary { display: grid; grid-template-columns: 1fr auto; margin: 0 0 var(--space-6); padding: var(--space-5); border-radius: var(--radius-xl); background: var(--color-brand-soft); }.result-summary span { color: var(--color-brand-strong); font-weight: 800; }.result-summary strong { grid-row: span 2; font-family: var(--font-display); font-size: 2.2rem; }.result-summary p { margin: .25rem 0 0; }
	.next-actions { display: flex; gap: var(--space-3); margin-top: var(--space-6); }.mobile-tabs { display: none; }
	@media(max-width: 48rem) { .practice-header { align-items: stretch; flex-direction: column; }.save-indicator { align-self: flex-start; }.mobile-tabs { display: grid; grid-template-columns: 1fr 1fr; margin-bottom: var(--space-3); padding: .25rem; border-radius: var(--radius-md); background: var(--color-surface-soft); }.mobile-tabs button { border: 0; background: transparent; color: var(--color-muted); }.mobile-tabs button.active { background: var(--color-surface); color: var(--color-brand-strong); box-shadow: var(--shadow-sm); }.player-grid { display: block; }.mobile-hidden { display: none; }.source-pane > div { position: static; max-height: none; }.question-card { padding: var(--space-4); }.question-title { grid-template-columns: auto 1fr; }.question-title b { grid-column: 2; }.next-actions { flex-direction: column; } }
</style>
