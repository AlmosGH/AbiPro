import { questions } from '$lib/server/db/schema';
import type { GradingRule, QuestionConfig } from '$lib/types/questions';
import type { LearnerQuestion } from '$lib/types/tasks';

/**
 * Allow-list for question fields that may cross the learner-facing server/client boundary.
 * In particular, gradingRule must never be added to this projection.
 */
export const learnerQuestionSelection = {
	id: questions.id,
	position: questions.position,
	kind: questions.kind,
	prompt: questions.prompt,
	config: questions.config,
	maxPoints: questions.maxPoints
};

export function toLearnerQuestion(question: LearnerQuestion): LearnerQuestion {
	return {
		id: question.id,
		position: question.position,
		kind: question.kind,
		prompt: question.prompt,
		config: question.config,
		maxPoints: question.maxPoints
	};
}

/**
 * A model answer is intentionally produced only for an already-submitted
 * attempt. It must never be added to `learnerQuestionSelection` above.
 */
export function postGradingSolution(config: QuestionConfig, gradingRule: GradingRule): string {
	const labelFor = (options: Array<{ id: string; label: string }>, id: string) => options.find((option) => option.id === id)?.label ?? '';

	switch (gradingRule.kind) {
		case 'choice':
			return config.kind === 'choice' ? labelFor(config.options, gradingRule.correctOptionId) : '';
		case 'multiple_choice':
			return config.kind === 'multiple_choice' ? gradingRule.correctOptionIds.map((id) => labelFor(config.options, id)).filter(Boolean).join(', ') : '';
		case 'matching':
			return config.kind === 'matching' ? gradingRule.pairs.map(({ leftId, rightId }) => {
				const left = labelFor(config.left, leftId);
				const right = labelFor(config.right, rightId);
				return left && right ? `${left} → ${right}` : '';
			}).filter(Boolean).join('; ') : '';
		case 'ordering':
			return config.kind === 'ordering' ? gradingRule.correctOrder.map((id) => labelFor(config.items, id)).filter(Boolean).join(' → ') : '';
		case 'short_text':
			return config.kind === 'short_text' ? gradingRule.acceptedAnswers.join(' / ') : '';
	}
}
