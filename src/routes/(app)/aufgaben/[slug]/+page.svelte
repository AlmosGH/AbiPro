<script lang="ts">
	import { page } from '$app/state';
	import TaskViewer from '$lib/components/task/TaskViewer.svelte';
	import { Badge, Button } from '$lib/components/ui';
	import { getLanguageContext } from '$lib/i18n';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const language = getLanguageContext();
	const returnTo = $derived.by(() => {
		const value = page.url.searchParams.get('return');
		return value?.startsWith('/aufgaben') ? value : '/aufgaben';
	});
</script>

<svelte:head><title>{data.task.title} – {language.t('Aufgaben')} – AbiPro</title><meta name="description" content={`${data.task.title}, ${data.task.year}, ${data.task.period}`} /></svelte:head>
<main class="task-page">
	<header class="task-heading">
		<div class="heading-topline">
			<Button href={returnTo} variant="ghost">{language.t('← Zurück zu den Aufgaben')}</Button>
			<Badge tone="accent">{data.task.origin === 'ujkor' ? language.t('Újkor.hu-Sammlung') : language.t('Offizielle Prüfungen')}</Badge>
		</div>
		<h1>{data.task.title}</h1>
		<div class="task-meta">
			{#if data.task.origin !== 'ujkor'}
				<Badge>{data.task.year} · {language.t(data.task.session === 'spring' ? 'Frühjahr' : 'Herbst')}</Badge>
				<Badge>{data.task.curriculum}</Badge>
			{/if}
			<Badge>{data.task.period}</Badge>
			<Badge>{language.t(data.task.historyScope === 'hungarian' ? 'Ungarische Geschichte' : 'Weltgeschichte')}</Badge>
			<Badge>{data.task.maxPoints} {language.t('Punkte')}</Badge>
		</div>
		<div class="heading-footer">
			{#if data.task.topics.length}
				<div class="topic-list"><span>{language.t('Themen: ').trim()}</span>{#each data.task.topics as topic (topic)}<Badge>{topic}</Badge>{/each}</div>
			{/if}
			<div class="task-actions">
				<Button href={`/uben?task=${data.task.slug}`}>{language.t(data.profile ? 'Diese Aufgabe üben' : 'Zum Üben anmelden')} <span aria-hidden="true">→</span></Button>
			</div>
		</div>
	</header>
	<div class="task-content">
		<TaskViewer instructions={data.task.instructions} sources={data.task.sources} questions={data.task.questions} />
	</div>
</main>

<style>
	.task-page { padding-top: var(--space-6); }
	.task-heading { margin-bottom: var(--space-8); padding: clamp(1.25rem, 3vw, 2rem); border: 1px solid var(--color-border); border-radius: var(--radius-xl); background: var(--color-surface); box-shadow: var(--shadow-sm); }
	.heading-topline { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-4); }
	.task-heading h1 { max-width: 70rem; margin: 0 0 var(--space-5); font-size: clamp(1.75rem, 2.3vw, 2.25rem); line-height: 1.14; overflow-wrap: anywhere; }
	.task-meta { display: flex; flex-wrap: wrap; gap: var(--space-2); }
	.heading-footer { display: flex; align-items: end; justify-content: space-between; gap: var(--space-5); margin-top: var(--space-5); padding-top: var(--space-5); border-top: 1px solid var(--color-border); }
	.topic-list { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); color: var(--color-muted); font-size: .82rem; font-weight: 700; }
	.task-actions { display: flex; flex: 0 0 auto; flex-wrap: wrap; gap: var(--space-2); }
	.task-actions :global(a) { white-space: nowrap; }
	:global(.task-content > p) { margin-bottom: var(--space-8); padding: var(--space-5); border-left: 3px solid var(--color-brand); border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-sm); }
	@media (max-width: 48rem) {
		.heading-topline { align-items: flex-start; }
		.heading-footer { align-items: stretch; flex-direction: column; }
		.task-actions, .task-actions :global(a) { width: 100%; }
	}
</style>
