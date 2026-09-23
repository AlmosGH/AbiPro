<script lang="ts">
	import type { AnswerPayload } from '$lib/types/questions';
	import type { LearnerQuestion } from '$lib/types/tasks';
	import { getLanguageContext } from '$lib/i18n';

	interface Props {
		question: LearnerQuestion;
		value: AnswerPayload;
		disabled?: boolean;
		onanswer: (answer: AnswerPayload) => void;
	}

	let { question, value, disabled = false, onanswer }: Props = $props();
	const language = getLanguageContext();

	function toggleMultiple(optionId: string, checked: boolean) {
		if (value.kind !== 'multiple_choice') return;
		if (checked && question.config.kind === 'multiple_choice' && question.config.maximumSelections !== undefined && value.optionIds.length >= question.config.maximumSelections) return;
		const optionIds = checked ? [...value.optionIds, optionId] : value.optionIds.filter((id) => id !== optionId);
		onanswer({ kind: 'multiple_choice', optionIds });
	}

	function selectionHint() {
		if (question.config.kind !== 'multiple_choice') return language.t('Eine oder mehrere Antworten auswählen');
		const minimum = question.config.minimumSelections;
		const maximum = question.config.maximumSelections;
		if (minimum !== undefined && maximum !== undefined && minimum === maximum) return language.t('Genau {count} Antworten auswählen', { count: minimum });
		if (minimum !== undefined && maximum !== undefined) return language.t('{min} bis {max} Antworten auswählen', { min: minimum, max: maximum });
		if (minimum !== undefined) return language.t('Mindestens {count} Antworten auswählen', { count: minimum });
		if (maximum !== undefined) return language.t('Höchstens {count} Antworten auswählen', { count: maximum });
		return language.t('Eine oder mehrere Antworten auswählen');
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
	<fieldset class="choice-group" disabled={disabled}>
		<legend>{language.t('Eine Antwort auswählen')}</legend>
		{#each question.config.options as option (option.id)}
			<label class:selected={value.optionId === option.id} class="choice-option"><input type="radio" name={`question-${question.id}`} checked={value.optionId === option.id} onchange={() => onanswer({ kind: 'choice', optionId: option.id })} /><span>{option.label}</span></label>
		{/each}
	</fieldset>
{:else if question.config.kind === 'multiple_choice' && value.kind === 'multiple_choice'}
	<fieldset class="choice-group" disabled={disabled}>
		<legend>{selectionHint()}</legend>
		{#each question.config.options as option (option.id)}
			{@const selected = value.optionIds.includes(option.id)}
			{@const maximumReached = question.config.maximumSelections !== undefined && value.optionIds.length >= question.config.maximumSelections}
			<label class:selected class:limit-reached={maximumReached && !selected} class="choice-option"><input type="checkbox" checked={selected} disabled={disabled || maximumReached && !selected} onchange={(event) => toggleMultiple(option.id, event.currentTarget.checked)} /><span>{option.label}</span></label>
		{/each}
		{#if question.config.maximumSelections !== undefined && value.optionIds.length >= question.config.maximumSelections}<p class="selection-limit" role="status">{language.t('Maximale Auswahl erreicht. Entferne zuerst eine Auswahl, um eine andere zu wählen.')}</p>{/if}
	</fieldset>
{:else if question.config.kind === 'matching' && value.kind === 'matching'}
	<div class="matching-inputs">
		{#each question.config.left as left (left.id)}
			<label>{left.label}
				<select disabled={disabled} value={value.pairs.find((pair) => pair.leftId === left.id)?.rightId ?? ''} onchange={(event) => setMatch(left.id, event.currentTarget.value)}>
				<option value="">{language.t('Bitte zuordnen')}</option>
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
				<button type="button" disabled={disabled || index === 0} aria-label={language.t('{item} nach oben verschieben', { item: labelFor(itemId) })} onclick={() => moveItem(index, -1)}>↑</button>
				<button type="button" disabled={disabled || index === value.itemIds.length - 1} aria-label={language.t('{item} nach unten verschieben', { item: labelFor(itemId) })} onclick={() => moveItem(index, 1)}>↓</button>
			</li>
		{/each}
	</ol>
{:else if question.config.kind === 'short_text' && value.kind === 'short_text'}
	<label>{language.t('Antwort')}
		{#if question.config.multiline}
			<textarea disabled={disabled} maxlength={question.config.maximumLength} rows="4" value={value.text} oninput={(event) => onanswer({ kind: 'short_text', text: event.currentTarget.value })}></textarea>
		{:else}
			<input disabled={disabled} maxlength={question.config.maximumLength} value={value.text} oninput={(event) => onanswer({ kind: 'short_text', text: event.currentTarget.value })} />
		{/if}
	</label>
{/if}

<style>
	.choice-group { display: grid; gap: var(--space-2); min-width: 0; margin: 0; padding: 0; border: 0; }
	.choice-group legend { width: 100%; margin-bottom: var(--space-2); color: var(--color-muted); font-size: .75rem; font-weight: 700; }
	.choice-option { display: grid; grid-template-columns: 1.25rem minmax(0, 1fr); min-width: 0; align-items: start; gap: var(--space-3); padding: .85rem 1rem; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-ink); font-size: .92rem; font-weight: 600; line-height: 1.45; cursor: pointer; transition: border-color var(--duration-fast), background var(--duration-fast), box-shadow var(--duration-fast); }
	.choice-option:hover { border-color: #99a8a0; background: var(--color-surface-soft); }
	.choice-option.selected { border-color: var(--color-brand); background: var(--color-brand-soft); box-shadow: inset 0 0 0 1px var(--color-brand); color: var(--color-brand-strong); }
	.choice-option input { width: 1.15rem; height: 1.15rem; margin: .08rem 0 0; }
	.choice-option:has(input:focus-visible) { box-shadow: var(--focus-ring); }
	.choice-group:disabled .choice-option { cursor: default; opacity: .72; }
	.choice-group:disabled .choice-option:hover { border-color: var(--color-border); background: var(--color-surface); }
	.choice-group:disabled .choice-option.selected { border-color: var(--color-brand); background: var(--color-brand-soft); }
	.choice-option.limit-reached { cursor: not-allowed; opacity: .55; }
	.selection-limit { margin: var(--space-1) 0 0; color: var(--color-muted); font-size: .78rem; }
	.matching-inputs { display: grid; gap: var(--space-3); }
	.ordering-input { display: grid; gap: var(--space-2); padding: 0; list-style: none; }
	.ordering-input li { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: var(--space-2); padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface-soft); }
	.ordering-input button { width: 2.4rem; min-height: 2.4rem; padding: 0; border-color: var(--color-border-strong); background: var(--color-surface); color: var(--color-ink); }
	@media(max-width: 35rem) { .choice-option { padding: .75rem; font-size: .87rem; } }
</style>
