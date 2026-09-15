<script lang="ts">
	import type { AnswerPayload } from '$lib/types/questions';
	import type { LearnerQuestion } from '$lib/types/tasks';

	interface Props {
		question: LearnerQuestion;
		value: AnswerPayload;
		disabled?: boolean;
		onanswer: (answer: AnswerPayload) => void;
	}

	let { question, value, disabled = false, onanswer }: Props = $props();

	function toggleMultiple(optionId: string, checked: boolean) {
		if (value.kind !== 'multiple_choice') return;
		const optionIds = checked ? [...value.optionIds, optionId] : value.optionIds.filter((id) => id !== optionId);
		onanswer({ kind: 'multiple_choice', optionIds });
	}

	function setMatch(leftId: string, rightId: string) {
		if (value.kind !== 'matching') return;
		const pairs = value.pairs.filter((pair) => pair.leftId !== leftId);
		if (rightId) pairs.push({ leftId, rightId });
		onanswer({ kind: 'matching', pairs });
	}

	function moveItem(index: number, offset: -1 | 1) {
		if (value.kind !== 'ordering') return;
		const target = index + offset;
		if (target < 0 || target >= value.itemIds.length) return;
		const itemIds = [...value.itemIds];
		[itemIds[index], itemIds[target]] = [itemIds[target], itemIds[index]];
		onanswer({ kind: 'ordering', itemIds });
	}

	function labelFor(itemId: string) {
		return question.config.kind === 'ordering' ? question.config.items.find((item) => item.id === itemId)?.label ?? itemId : itemId;
	}
</script>

{#if question.config.kind === 'choice' && value.kind === 'choice'}
	<fieldset disabled={disabled}>
		<legend>Eine Antwort auswählen</legend>
		{#each question.config.options as option (option.id)}
			<label><input type="radio" name={`question-${question.id}`} checked={value.optionId === option.id} onchange={() => onanswer({ kind: 'choice', optionId: option.id })} /> {option.label}</label>
		{/each}
	</fieldset>
{:else if question.config.kind === 'multiple_choice' && value.kind === 'multiple_choice'}
	<fieldset disabled={disabled}>
		<legend>Eine oder mehrere Antworten auswählen</legend>
		{#each question.config.options as option (option.id)}
			<label><input type="checkbox" checked={value.optionIds.includes(option.id)} onchange={(event) => toggleMultiple(option.id, event.currentTarget.checked)} /> {option.label}</label>
		{/each}
	</fieldset>
{:else if question.config.kind === 'matching' && value.kind === 'matching'}
	<div class="matching-inputs">
		{#each question.config.left as left (left.id)}
			<label>{left.label}
				<select disabled={disabled} value={value.pairs.find((pair) => pair.leftId === left.id)?.rightId ?? ''} onchange={(event) => setMatch(left.id, event.currentTarget.value)}>
					<option value="">Bitte zuordnen</option>
					{#each question.config.right as right (right.id)}<option value={right.id}>{right.label}</option>{/each}
				</select>
			</label>
		{/each}
	</div>
{:else if question.config.kind === 'ordering' && value.kind === 'ordering'}
	<ol class="ordering-input">
		{#each value.itemIds as itemId, index (itemId)}
			<li>
				<span>{labelFor(itemId)}</span>
				<button type="button" disabled={disabled || index === 0} aria-label={`${labelFor(itemId)} nach oben verschieben`} onclick={() => moveItem(index, -1)}>↑</button>
				<button type="button" disabled={disabled || index === value.itemIds.length - 1} aria-label={`${labelFor(itemId)} nach unten verschieben`} onclick={() => moveItem(index, 1)}>↓</button>
			</li>
		{/each}
	</ol>
{:else if question.config.kind === 'short_text' && value.kind === 'short_text'}
	<label>Antwort
		{#if question.config.multiline}
			<textarea disabled={disabled} maxlength={question.config.maximumLength} rows="4" value={value.text} oninput={(event) => onanswer({ kind: 'short_text', text: event.currentTarget.value })}></textarea>
		{:else}
			<input disabled={disabled} maxlength={question.config.maximumLength} value={value.text} oninput={(event) => onanswer({ kind: 'short_text', text: event.currentTarget.value })} />
		{/if}
	</label>
{/if}
