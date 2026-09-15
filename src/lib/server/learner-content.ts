import { questions } from '$lib/server/db/schema';
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
