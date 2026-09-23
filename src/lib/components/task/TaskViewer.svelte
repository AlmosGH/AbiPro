<script lang="ts">
	import ReadOnlyQuestionList from './ReadOnlyQuestionList.svelte';
	import SourceList from './SourceList.svelte';
	import { getLanguageContext } from '$lib/i18n';
	import type { LearnerQuestion, LearnerTaskSource } from '$lib/types/tasks';

	interface Props {
		instructions: string | null;
		sources: LearnerTaskSource[];
		questions: LearnerQuestion[];
	}
	let { instructions, sources, questions }: Props = $props();
	const language = getLanguageContext();
</script>

{#if instructions}<p>{instructions}</p>{/if}

<section>
	<h2>{language.t('Quellen')}</h2>
	<SourceList {sources} />
</section>

<section>
	<h2>{language.t('Fragen')}</h2>
	<ReadOnlyQuestionList {questions} />
</section>
