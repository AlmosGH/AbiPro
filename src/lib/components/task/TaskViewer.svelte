<script lang="ts">
	import ReadOnlyQuestionList from './ReadOnlyQuestionList.svelte';
	import SourceList from './SourceList.svelte';
	import type { LearnerQuestion, LearnerTaskSource } from '$lib/types/tasks';

	interface Props {
		instructions: string | null;
		sources: LearnerTaskSource[];
		questions: LearnerQuestion[];
	}
	let { instructions, sources, questions }: Props = $props();
</script>

{#if instructions}<p>{instructions}</p>{/if}

<section>
	<h2>Quellen</h2>
	<SourceList {sources} />
</section>

<section>
	<h2>Fragen</h2>
	<ReadOnlyQuestionList {questions} />
</section>
