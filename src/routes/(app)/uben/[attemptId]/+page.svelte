<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { ActionResult } from '@sveltejs/kit';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import PracticeAnswerInput from '$lib/components/questions/PracticeAnswerInput.svelte';
	import SourceList from '$lib/components/task/SourceList.svelte';
	import type { AnswerPayload } from '$lib/types/questions';
	import type { LearnerQuestion } from '$lib/types/tasks';
	import type { SaveState } from '$lib/types/practice';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let answers = $derived<Record<number, AnswerPayload>>(Object.fromEntries(data.attempt.questions.map((question) => {
		const saved = data.attempt.answers.find((answer) => answer.questionId === question.id)?.response;
		return [question.id, saved ?? emptyAnswer(question)];
	})));
	let saveStates = $state<Record<number, SaveState>>({});
	let errors = $state<Record<number, string>>({});
	let submitting = $state(false);
	let submitError = $state('');
	const timers = new SvelteMap<number, ReturnType<typeof setTimeout>>();
	const savingPromises = new SvelteMap<number, Promise<boolean>>();
	const dirty = new SvelteSet<number>();

	function emptyAnswer(question: LearnerQuestion): AnswerPayload {
		switch (question.config.kind) {
			case 'choice': return { kind: 'choice', optionId: '' };
			case 'multiple_choice': return { kind: 'multiple_choice', optionIds: [] };
			case 'matching': return { kind: 'matching', pairs: [] };
			case 'ordering': return { kind: 'ordering', itemIds: question.config.items.map((item) => item.id) };
			case 'short_text': return { kind: 'short_text', text: '' };
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
		if (active) {
			const succeeded = await active;
			return succeeded && dirty.has(questionId) ? saveAnswer(questionId) : succeeded;
		}
		if (!dirty.has(questionId)) return true;
		const serializedAnswer = JSON.stringify(answers[questionId]);
		saveStates[questionId] = 'saving';
		const request = (async () => {
			try {
				const response = await fetch(`/uben/${data.attempt.id}/answer/${questionId}`, {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					body: serializedAnswer
				});
				if (!response.ok) throw new Error('Speichern fehlgeschlagen. Bitte versuche es erneut.');
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

	async function submitAttempt(event: SubmitEvent) {
		event.preventDefault();
		if (submitting) return;
		const formElement = event.currentTarget as HTMLFormElement;
		submitting = true;
		submitError = '';
		const saved = await Promise.all([...dirty].map(saveAnswer));
		if (saved.some((success) => !success)) {
			submitting = false;
			return;
		}
		const response = await fetch('?/submit', {
			method: 'POST',
			headers: { 'x-sveltekit-action': 'true' },
			body: new FormData(formElement)
		});
		const result: ActionResult = deserialize(await response.text());
		if (result.type === 'success') {
			await invalidateAll();
			await applyAction(result);
		} else {
			await applyAction(result);
			submitError = 'Die Übung konnte nicht abgegeben werden. Bitte versuche es erneut.';
			submitting = false;
		}
	}

	function resultFor(questionId: number) {
		return data.attempt.results.find((result) => result.questionId === questionId);
	}
</script>

<svelte:head><title>{data.attempt.title} – Üben – AbiPro</title></svelte:head>
<main>
	<p><a href="/uben">Zur Übungsauswahl</a></p>
	<h1>{data.attempt.title}</h1>
	<p>{data.attempt.year} · {data.attempt.session === 'spring' ? 'Frühjahr' : 'Herbst'} · {data.attempt.period} · {data.attempt.curriculum} · {data.attempt.maxScore} Punkte</p>
	<p>Themen: {data.attempt.topics.join(', ')}</p>
	{#if data.attempt.instructions}<p>{data.attempt.instructions}</p>{/if}

	<section><h2>Quellen</h2><SourceList sources={data.attempt.sources} /></section>

	<section>
		<h2>{data.attempt.status === 'in_progress' ? 'Fragen' : 'Ergebnis'}</h2>
		{#if data.attempt.status === 'graded'}
			<p><strong>{data.attempt.score} von {data.attempt.maxScore} Punkten</strong></p>
			{#if data.bestAttempt}<p>Bestes Ergebnis für diese Aufgabenversion: {data.bestAttempt.score} von {data.bestAttempt.maxScore} Punkten.</p>{/if}
		{/if}
		{#if form?.message}<p role="alert">{form.message}</p>{/if}
		{#if submitError}<p role="alert" class="save-error">{submitError}</p>{/if}
		{#each data.attempt.results.filter((result) => result.status === 'needs_review') as result (result.answerId)}<form id={`self-grade-${result.answerId}`} method="POST" action="?/selfGrade"></form>{/each}
		<form method="POST" action="?/submit" onsubmit={data.attempt.status === 'in_progress' ? submitAttempt : undefined}>
			{#each data.attempt.questions as question, index (question.id)}
				<article>
					<h3>{index + 1}. {question.prompt} ({question.maxPoints} P.)</h3>
					<PracticeAnswerInput {question} value={answers[question.id]} disabled={data.attempt.status !== 'in_progress'} onanswer={(answer) => updateAnswer(question.id, answer)} />
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
			{#if data.attempt.status === 'in_progress'}<button disabled={submitting}>{submitting ? 'Wird abgegeben …' : 'Antworten abgeben'}</button>{/if}
		</form>
	</section>

	{#if data.attempt.status === 'graded'}
		<p><a href={`/uben?task=${data.attempt.slug}`}>Diese Aufgabe wiederholen</a> · <a href="/uben">Andere Aufgabe üben</a></p>
	{/if}
</main>
