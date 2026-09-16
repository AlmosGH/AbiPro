<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { ActionResult } from '@sveltejs/kit';
	import { onMount } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import PracticeAnswerInput from '$lib/components/questions/PracticeAnswerInput.svelte';
	import SourceList from '$lib/components/task/SourceList.svelte';
	import type { AnswerPayload } from '$lib/types/questions';
	import type { LearnerQuestion } from '$lib/types/tasks';
	import type { SaveState } from '$lib/types/practice';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	function initialAnswers() {
		return Object.fromEntries(data.attempt.tasks.flatMap((task) => task.questions.map((question) => {
			const saved = task.answers.find((answer) => answer.questionId === question.id)?.response;
			return [question.id, saved ?? emptyAnswer(question)];
		})));
	}

	function initialRemaining() {
		const expiresAt = data.attempt.expiresAt;
		return expiresAt ? Math.max(0, timestamp(expiresAt) - timestamp(data.attempt.serverNow)) : 0;
	}

	function timestamp(value: Date | string) {
		return value instanceof Date ? value.getTime() : new Date(value).getTime();
	}

	function initialAnsweredQuestionIds() {
		return data.attempt.tasks.flatMap((task) => task.answers.map((answer) => answer.questionId));
	}

	function initiallyExpired() {
		return data.attempt.status !== 'in_progress' || initialRemaining() <= 0;
	}

	let currentTaskIndex = $state(0);
	let answers = $state<Record<number, AnswerPayload>>(initialAnswers());
	let saveStates = $state<Record<number, SaveState>>({});
	let errors = $state<Record<number, string>>({});
	let finalizing = $state(false);
	let reviewing = $state(false);
	let finalizationError = $state('');
	let remainingMilliseconds = $state(initialRemaining());
	let clientExpired = $state(initiallyExpired());
	const timers = new SvelteMap<number, ReturnType<typeof setTimeout>>();
	const savingPromises = new SvelteMap<number, Promise<boolean>>();
	const dirty = new SvelteSet<number>();
	const answeredQuestionIds = new SvelteSet<number>(initialAnsweredQuestionIds());
	const totalQuestions = $derived(data.attempt.tasks.reduce((total, task) => total + task.questions.length, 0));
	const unansweredCount = $derived(totalQuestions - answeredQuestionIds.size);
	const currentTask = $derived(data.attempt.tasks[currentTaskIndex]);
	const remainingLabel = $derived(formatRemaining(remainingMilliseconds));
	const timerAnnouncement = $derived(remainingMilliseconds <= 0 ? 'Die Bearbeitungszeit ist abgelaufen.' : `Noch ${Math.ceil(remainingMilliseconds / 60_000)} Minuten Bearbeitungszeit.`);

	onMount(() => {
		if (data.attempt.status !== 'in_progress') return;
		const expiresAt = data.attempt.expiresAt;
		if (!expiresAt) return;
		const initialRemaining = Math.max(0, timestamp(expiresAt) - timestamp(data.attempt.serverNow));
		const baseline = performance.now();
		const update = () => {
			if (data.attempt.status !== 'in_progress') {
				clearInterval(interval);
				return;
			}
			remainingMilliseconds = Math.max(0, initialRemaining - (performance.now() - baseline));
			if (remainingMilliseconds <= 0) {
				clientExpired = true;
				void finishAttempt(true);
			}
		};
		const interval = setInterval(update, 250);
		update();
		return () => clearInterval(interval);
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
			case 'choice': return answer.optionId.length > 0;
			case 'multiple_choice': return answer.optionIds.length > 0;
			case 'matching': return answer.pairs.length > 0;
			case 'ordering': return true;
			case 'short_text': return answer.text.trim().length > 0;
		}
	}

	function updateAnswer(questionId: number, answer: AnswerPayload) {
		if (clientExpired || data.attempt.status !== 'in_progress') return;
		answers[questionId] = answer;
		if (isAnswered(answer)) answeredQuestionIds.add(questionId);
		else answeredQuestionIds.delete(questionId);
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
		if (active) {
			const succeeded = await active;
			return succeeded && dirty.has(questionId) ? saveAnswer(questionId) : succeeded;
		}
		if (!dirty.has(questionId)) return true;
		if (clientExpired) return false;
		const serializedAnswer = JSON.stringify(answers[questionId]);
		saveStates[questionId] = 'saving';
		const request = (async () => {
			try {
				const response = await fetch(`/prufung/${data.attempt.id}/answer/${questionId}`, {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					body: serializedAnswer
				});
				if (!response.ok) throw new Error(response.status === 409 ? 'Die Antwort wurde nicht gespeichert, weil die Bearbeitungszeit beendet ist.' : 'Speichern fehlgeschlagen. Bitte versuche es erneut.');
				if (serializedAnswer === JSON.stringify(answers[questionId])) {
					dirty.delete(questionId);
					saveStates[questionId] = 'saved';
				}
				return true;
			} catch (cause) {
				saveStates[questionId] = 'error';
				errors[questionId] = cause instanceof Error ? cause.message : 'Speichern fehlgeschlagen.';
				return false;
			}
		})();
		savingPromises.set(questionId, request);
		const succeeded = await request;
		savingPromises.delete(questionId);
		return succeeded && dirty.has(questionId) ? saveAnswer(questionId) : succeeded;
	}

	async function finishAttempt(timedOut = false) {
		if (finalizing || data.attempt.status !== 'in_progress') return;
		if (!timedOut && !reviewing) { reviewing = true; return; }
		finalizing = true;
		finalizationError = '';
		if (timedOut) await Promise.all([...savingPromises.values()]);
		else {
			const saved = await Promise.all([...dirty].map(saveAnswer));
			if (saved.some((success) => !success)) {
				finalizing = false;
				return;
			}
		}
		try {
			const response = await fetch('?/finish', {
				method: 'POST',
				headers: { 'x-sveltekit-action': 'true' },
				body: new FormData()
			});
			const result: ActionResult = deserialize(await response.text());
			if (result.type !== 'success') {
				await applyAction(result);
				throw new Error('Die Prüfung konnte nicht abgeschlossen werden. Bitte versuche es erneut.');
			}
			await invalidateAll();
			await applyAction(result);
		} catch (cause) {
			finalizationError = cause instanceof Error ? cause.message : 'Die Prüfung konnte nicht abgeschlossen werden.';
			finalizing = false;
		}
	}

	function formatRemaining(milliseconds: number) {
		const seconds = Math.ceil(milliseconds / 1000);
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const remainder = seconds % 60;
		return `${hours > 0 ? `${hours}:` : ''}${hours > 0 ? String(minutes).padStart(2, '0') : minutes}:${String(remainder).padStart(2, '0')}`;
	}

	function taskIsComplete(index: number) {
		return data.attempt.tasks[index].questions.every((question) => answeredQuestionIds.has(question.id));
	}

	function resultFor(questionId: number) {
		return currentTask.results.find((result) => result.questionId === questionId);
	}

	function goToQuestion(taskIndex: number) {
		currentTaskIndex = taskIndex;
		reviewing = false;
	}
</script>

<svelte:head><title>Prüfung – AbiPro</title></svelte:head>
<main class="exam-page">
	<div class="exam-header">
		<div>
			<p><a href="/prufung">Zur Prüfungsübersicht</a></p>
			<h1>{data.attempt.status === 'in_progress' ? 'Laufende Prüfung' : 'Prüfungsauswertung'}</h1>
		</div>
		{#if data.attempt.status === 'in_progress'}
			<p class:timer-critical={remainingMilliseconds < 5 * 60 * 1000} class="exam-timer"><span>Verbleibende Zeit</span><strong>{remainingLabel}</strong></p><p class="sr-only" aria-live="polite">{timerAnnouncement}</p>
		{:else}
			<p class="exam-score"><span>Ergebnis</span><strong>{data.attempt.status === 'graded' ? `${data.attempt.score} / ${data.attempt.maxScore}` : 'Bewertung ausstehend'}</strong></p>
		{/if}
	</div>

	{#if clientExpired && data.attempt.status === 'in_progress'}<p role="status" class="readiness-message">Die Bearbeitungszeit ist abgelaufen. Deine Prüfung wird abgeschlossen …</p>{/if}
	{#if data.attempt.status === 'in_progress' && remainingMilliseconds <= 5 * 60 * 1000 && remainingMilliseconds > 60 * 1000}<div class="time-warning" role="status"><strong>Noch 5 Minuten</strong><span>Prüfe offene Aufgaben und plane Zeit für die Abgabe ein.</span></div>{/if}
	{#if data.attempt.status === 'in_progress' && remainingMilliseconds <= 60 * 1000 && remainingMilliseconds > 0}<div class="time-warning critical" role="alert"><strong>Letzte Minute</strong><span>Deine Prüfung wird bei Ablauf automatisch abgegeben.</span></div>{/if}
	{#if form?.message}<p role="alert" class="save-error">{form.message}</p>{/if}
	{#if finalizationError}<p role="alert" class="save-error">{finalizationError}</p>{/if}

	<nav class="task-navigation" aria-label="Prüfungsaufgaben">
		{#each data.attempt.tasks as task, index (task.attemptTaskId)}
			<button type="button" class:current={index === currentTaskIndex} class:complete={taskIsComplete(index)} onclick={() => currentTaskIndex = index} aria-current={index === currentTaskIndex ? 'step' : undefined}>
				<span>{index + 1}</span><small>{taskIsComplete(index) ? 'Beantwortet' : 'Offen'}</small>
			</button>
		{/each}
	</nav>

	{#if reviewing && data.attempt.status === 'in_progress'}
		<section class="review-screen"><span>Vor der Abgabe</span><h2>Antworten überprüfen</h2><p>{unansweredCount ? `Noch ${unansweredCount} ${unansweredCount === 1 ? 'Frage ist' : 'Fragen sind'} unbeantwortet.` : 'Alle Fragen sind beantwortet.'}</p><div class="review-list">{#each data.attempt.tasks as task, taskIndex (task.attemptTaskId)}<button type="button" onclick={() => goToQuestion(taskIndex)}><span>Aufgabe {taskIndex + 1}</span><strong>{task.questions.filter((question) => answeredQuestionIds.has(question.id)).length} / {task.questions.length} beantwortet</strong></button>{/each}</div><div class="review-actions"><button type="button" class="secondary-action" onclick={() => reviewing = false}>Weiter bearbeiten</button><button type="button" disabled={finalizing} onclick={() => void finishAttempt(false)}>{finalizing ? 'Wird abgeschlossen …' : unansweredCount ? 'Trotzdem abgeben' : 'Prüfung abgeben'}</button></div></section>
	{:else}

	<section class="exam-task">
		<p>Aufgabe {currentTaskIndex + 1} von {data.attempt.tasks.length}</p>
		<h2>{currentTask.title}</h2>
		<p>{currentTask.year} · {currentTask.session === 'spring' ? 'Frühjahr' : 'Herbst'} · {currentTask.period} · {currentTask.maxPoints} Punkte</p>
		{#if currentTask.topics.length}<p>Themen: {currentTask.topics.join(', ')}</p>{/if}
		{#if currentTask.instructions}<p>{currentTask.instructions}</p>{/if}
		<h3>Quellen</h3>
		<SourceList sources={currentTask.sources} />

		{#each currentTask.results.filter((result) => result.status === 'needs_review') as result (result.answerId)}<form id={`self-grade-${result.answerId}`} method="POST" action="?/selfGrade"></form>{/each}
		<form method="POST" action="?/finish" onsubmit={data.attempt.status === 'in_progress' ? (event) => { event.preventDefault(); void finishAttempt(false); } : undefined}>
			{#each currentTask.questions as question, index (question.id)}
				<article>
					<h3>{index + 1}. {question.prompt} ({question.maxPoints} P.)</h3>
					<PracticeAnswerInput {question} value={answers[question.id]} disabled={clientExpired || data.attempt.status !== 'in_progress'} onanswer={(answer) => updateAnswer(question.id, answer)} />
					{#if data.attempt.status === 'in_progress'}
						<p class:save-error={saveStates[question.id] === 'error'} aria-live="polite">
							{saveStates[question.id] === 'saving' ? 'Wird gespeichert …' : saveStates[question.id] === 'saved' ? 'Gespeichert' : saveStates[question.id] === 'error' ? errors[question.id] : ''}
						</p>
					{:else if resultFor(question.id)}
						{@const result = resultFor(question.id)!}
						<p><strong>{result.status === 'pending' || result.status === 'processing' ? 'Bewertung ausstehend' : `${result.score} von ${result.maximum} Punkten · ${result.correctness === 'correct' ? 'Richtig' : result.correctness === 'partial' ? 'Teilweise richtig' : result.status === 'needs_review' ? 'Selbstbewertung nötig' : 'Nicht richtig'}`}</strong></p>
						<p>{result.feedback}</p>
						{#if result.status === 'needs_review'}
							<div class="self-grade"><label>Eigene Punktzahl (0–{result.maximum}) <input form={`self-grade-${result.answerId}`} type="number" name="awardedPoints" min="0" max={result.maximum} step="0.5" required /></label><button form={`self-grade-${result.answerId}`} name="answerId" value={result.answerId}>Selbst bewerten</button></div>
						{/if}
					{/if}
				</article>
			{/each}
			{#if data.attempt.status === 'in_progress'}
				<div class="exam-actions">
					<p><strong>{unansweredCount}</strong> von {totalQuestions} Fragen unbeantwortet.</p>
					<button disabled={finalizing || clientExpired}>{finalizing ? 'Wird abgeschlossen …' : 'Prüfung abgeben'}</button>
				</div>
			{/if}
		</form>
	</section>
	{/if}

	<div class="exam-pager">
		<button type="button" disabled={currentTaskIndex === 0} onclick={() => currentTaskIndex--}>Vorherige Aufgabe</button>
		<button type="button" disabled={currentTaskIndex === data.attempt.tasks.length - 1} onclick={() => currentTaskIndex++}>Nächste Aufgabe</button>
	</div>

	{#if data.attempt.status === 'graded'}
		<p class="review-note">Wähle oben jede Aufgabe aus, um deine Antwort, die erreichten Punkte und das Bewertungsfeedback im Detail zu prüfen.</p>
	{/if}
</main>

<style>
	.exam-page { max-width: 88rem !important; }
	.exam-header { position: sticky; z-index: 10; top: var(--topbar-height); display: flex; align-items: center; justify-content: space-between; gap: var(--space-5); margin: calc(var(--space-8) * -1) calc(var(--space-6) * -1) var(--space-5); padding: var(--space-4) var(--space-6); border-bottom: 1px solid var(--color-border); background: rgb(246 248 245 / .96); backdrop-filter: blur(12px); }
	.exam-header p { margin: 0; }.exam-header h1 { margin: .25rem 0 0; font-size: 1.7rem; }.exam-timer,.exam-score { display: grid; min-width: 10rem; padding: .6rem 1rem; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: white; text-align: right; }.exam-timer span,.exam-score span { color: var(--color-muted); font-size: .68rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }.exam-timer strong,.exam-score strong { font-variant-numeric: tabular-nums; font-size: 1.35rem; }.exam-timer.timer-critical { border-color: var(--color-danger); }
	.time-warning { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); padding: var(--space-3) var(--space-4); border-left: 4px solid var(--color-warning); border-radius: var(--radius-md); background: var(--color-warning-soft); color: var(--color-warning); }.time-warning strong::before { content: '⏱ '; }.time-warning.critical { border-color: var(--color-danger); background: var(--color-danger-soft); color: var(--color-danger); }
	.task-navigation { display: flex; gap: var(--space-2); overflow-x: auto; padding: var(--space-2) 0 var(--space-4); }.task-navigation button { min-width: 4.5rem; min-height: 3.5rem; flex: 1; flex-direction: column; gap: .1rem; border-color: var(--color-border-strong); background: white; color: var(--color-ink); }.task-navigation button.complete { border-color: var(--color-brand); background: var(--color-brand-soft); }.task-navigation button.current { outline: 2px solid var(--color-brand); outline-offset: 2px; }.task-navigation small { color: var(--color-muted); font-size: .65rem; }
	.exam-task,.review-screen { padding: var(--space-6); border: 1px solid var(--color-border); border-radius: var(--radius-xl); background: var(--color-surface); box-shadow: var(--shadow-sm); }.exam-task > p:first-child,.review-screen > span { color: var(--color-brand-strong); font-size: .72rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }.exam-task form { display: block; }.exam-task form article { margin-top: var(--space-5); padding-top: var(--space-5); border-top: 1px solid var(--color-border); }
	.exam-actions { position: sticky; bottom: var(--space-3); display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); margin-top: var(--space-6); padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: rgb(255 255 255 / .96); box-shadow: var(--shadow-md); }.exam-actions p { margin: 0; }
	.review-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); margin: var(--space-5) 0; }.review-list button { display: grid; justify-items: start; border-color: var(--color-border-strong); background: var(--color-surface-soft); color: var(--color-ink); }.review-list strong { font-size: .75rem; }.review-actions { display: flex; justify-content: flex-end; gap: var(--space-3); }.secondary-action { border-color: var(--color-border-strong); background: white; color: var(--color-ink); }
	.exam-pager { display: flex; justify-content: space-between; gap: var(--space-3); margin-top: var(--space-4); }.exam-pager button { border-color: var(--color-border-strong); background: white; color: var(--color-ink); }.review-note { margin-top: var(--space-5); padding: var(--space-4); border-radius: var(--radius-md); background: var(--color-info-soft); color: var(--color-info); }
	@media(max-width: 48rem) { .exam-header { top: 3.75rem; margin: calc(var(--space-5) * -1) -.65rem var(--space-4); padding: var(--space-3) .65rem; }.exam-header h1 { font-size: 1.25rem; }.exam-header > div p { display: none; }.exam-timer,.exam-score { min-width: 8rem; padding: .45rem .7rem; }.time-warning { align-items: flex-start; flex-direction: column; gap: .1rem; }.task-navigation { margin-inline: -.65rem; padding-inline: .65rem; }.task-navigation button { min-width: 4rem; }.exam-task,.review-screen { padding: var(--space-4); }.review-list { grid-template-columns: repeat(2, 1fr); }.review-actions,.exam-actions { align-items: stretch; flex-direction: column; }.review-actions button,.exam-actions button { width: 100%; }.exam-pager { overflow: hidden; }.exam-pager button { flex: 1; font-size: .78rem; } }
</style>
