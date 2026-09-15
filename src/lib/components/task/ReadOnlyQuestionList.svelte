<script lang="ts">
	import type { LearnerQuestion } from '$lib/types/tasks';

	interface Props { questions: LearnerQuestion[] }
	let { questions }: Props = $props();
</script>

<ol>
	{#each questions as question (question.id)}
		<li>
			<p>{question.prompt} ({question.maxPoints} P.)</p>
			{#if question.config.kind === 'choice' || question.config.kind === 'multiple_choice'}
				<ul>{#each question.config.options as option (option.id)}<li>{option.label}</li>{/each}</ul>
			{:else if question.config.kind === 'matching'}
				<p>Zuordnen:</p>
				<ul>{#each question.config.left as option (option.id)}<li>{option.label}</li>{/each}</ul>
				<p>zu:</p>
				<ul>{#each question.config.right as option (option.id)}<li>{option.label}</li>{/each}</ul>
			{:else if question.config.kind === 'ordering'}
				<p>In die richtige Reihenfolge bringen:</p>
				<ul>{#each question.config.items as item (item.id)}<li>{item.label}</li>{/each}</ul>
			{:else}
				<p>{question.config.multiline ? 'Mehrzeilige Freitextantwort' : 'Kurze Freitextantwort'}</p>
			{/if}
		</li>
	{/each}
</ol>
