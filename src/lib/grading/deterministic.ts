import { answerPayloadSchema, type AnswerPayload, type GradingRule, type QuestionConfig } from '$lib/types/questions';

export const DETERMINISTIC_GRADER_SCHEMA_VERSION = 1;

export type Correctness = 'correct' | 'partial' | 'incorrect' | 'invalid';

export interface DeterministicGrade {
	score: number;
	maximum: number;
	correctness: Correctness;
	feedback: string;
}

export interface DeterministicQuestion {
	kind: QuestionConfig['kind'];
	config: QuestionConfig;
	gradingRule: GradingRule;
	maxPoints: number;
}

function roundPoints(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function safeMaximum(value: number) {
	return Number.isFinite(value) && value > 0 ? roundPoints(value) : 0;
}

function result(score: number, maximum: number, feedback?: string): DeterministicGrade {
	const safeScore = Number.isFinite(score) ? score : 0;
	const bounded = roundPoints(Math.min(maximum, Math.max(0, safeScore)));
	const correctness: Correctness = safeScore >= maximum && maximum > 0
		? 'correct'
		: bounded > 0
			? 'partial'
			: 'incorrect';
	return {
		score: bounded,
		maximum,
		correctness,
		feedback: feedback ?? (correctness === 'correct' ? 'Richtig.' : correctness === 'partial' ? 'Teilweise richtig.' : 'Nicht richtig.')
	};
}

function invalid(maximum: number, feedback: string): DeterministicGrade {
	return { score: 0, maximum, correctness: 'invalid', feedback };
}

function hasDuplicates(values: string[]) {
	return new Set(values).size !== values.length;
}

export function normalizeShortText(value: string, normalizeWhitespace = false) {
	const trimmed = value.trim().toLocaleLowerCase('de');
	return normalizeWhitespace ? trimmed.replace(/\s+/gu, ' ') : trimmed;
}

/**
 * Pure deterministic grading. Configuration and maximum points must come from the
 * immutable server-side question record; only `answer` is learner-controlled.
 */
export function gradeDeterministically(question: DeterministicQuestion, answer: unknown): DeterministicGrade {
	const maximum = safeMaximum(question.maxPoints);
	if (maximum === 0) return invalid(maximum, 'Die Frage hat keine gültige Maximalpunktzahl.');
	if (question.kind !== question.config.kind || question.kind !== question.gradingRule.kind) {
		return invalid(maximum, 'Die serverseitige Fragenkonfiguration ist ungültig.');
	}

	const parsed = answerPayloadSchema.safeParse(answer);
	if (!parsed.success || parsed.data.kind !== question.kind) {
		return invalid(maximum, 'Die Antwort hat ein ungültiges Format.');
	}

	const payload: AnswerPayload = parsed.data;
	switch (question.kind) {
		case 'choice': {
			if (question.config.kind !== 'choice' || question.gradingRule.kind !== 'choice' || payload.kind !== 'choice') break;
			const configuredIds = question.config.options.map((option) => option.id);
			const optionIds = new Set(configuredIds);
			if (optionIds.size !== configuredIds.length) return invalid(maximum, 'Die serverseitige Fragenkonfiguration ist ungültig.');
			if (!optionIds.has(payload.optionId) || !optionIds.has(question.gradingRule.correctOptionId)) {
				return invalid(maximum, 'Die Antwort verweist auf eine unbekannte Option.');
			}
			return result(payload.optionId === question.gradingRule.correctOptionId ? maximum : 0, maximum);
		}
		case 'multiple_choice': {
			if (question.config.kind !== 'multiple_choice' || question.gradingRule.kind !== 'multiple_choice' || payload.kind !== 'multiple_choice') break;
			const allowed = new Set(question.config.options.map((option) => option.id));
			if (allowed.size !== question.config.options.length || question.config.minimumSelections !== undefined && question.config.maximumSelections !== undefined && question.config.minimumSelections > question.config.maximumSelections || question.config.maximumSelections !== undefined && question.config.maximumSelections > allowed.size) {
				return invalid(maximum, 'Die serverseitige Fragenkonfiguration ist ungültig.');
			}
			if (hasDuplicates(payload.optionIds) || payload.optionIds.some((id) => !allowed.has(id))) {
				return invalid(maximum, 'Die Antwort enthält doppelte oder unbekannte Optionen.');
			}
			if (question.config.minimumSelections !== undefined && payload.optionIds.length < question.config.minimumSelections) {
				return invalid(maximum, 'Es wurden zu wenige Optionen ausgewählt.');
			}
			if (question.config.maximumSelections !== undefined && payload.optionIds.length > question.config.maximumSelections) {
				return invalid(maximum, 'Es wurden zu viele Optionen ausgewählt.');
			}
			const correct = new Set(question.gradingRule.correctOptionIds);
			if (!correct.size || correct.size !== question.gradingRule.correctOptionIds.length || [...correct].some((id) => !allowed.has(id))) return invalid(maximum, 'Die serverseitige Bewertungsregel ist ungültig.');
			const selected = new Set(payload.optionIds);
			const exact = selected.size === correct.size && [...correct].every((id) => selected.has(id));
			if (question.gradingRule.allOrNothing) return result(exact ? maximum : 0, maximum);
			const correctSelections = payload.optionIds.filter((id) => correct.has(id)).length;
			const incorrectSelections = payload.optionIds.length - correctSelections;
			return result(maximum * Math.max(0, (correctSelections - incorrectSelections) / correct.size), maximum);
		}
		case 'matching': {
			if (question.config.kind !== 'matching' || question.gradingRule.kind !== 'matching' || payload.kind !== 'matching') break;
			const leftIds = new Set(question.config.left.map((item) => item.id));
			const rightIds = new Set(question.config.right.map((item) => item.id));
			if (leftIds.size !== question.config.left.length || rightIds.size !== question.config.right.length || new Set([...leftIds, ...rightIds]).size !== leftIds.size + rightIds.size) return invalid(maximum, 'Die serverseitige Fragenkonfiguration ist ungültig.');
			const answerLeft = payload.pairs.map((pair) => pair.leftId);
			if (hasDuplicates(answerLeft) || payload.pairs.some((pair) => !leftIds.has(pair.leftId) || !rightIds.has(pair.rightId))) {
				return invalid(maximum, 'Die Zuordnung enthält doppelte linke oder unbekannte Einträge.');
			}
			const expected = new Map(question.gradingRule.pairs.map((pair) => [pair.leftId, pair.rightId]));
			if (!expected.size || expected.size !== question.gradingRule.pairs.length || [...expected].some(([leftId, rightId]) => !leftIds.has(leftId) || !rightIds.has(rightId))) {
				return invalid(maximum, 'Die serverseitige Bewertungsregel ist ungültig.');
			}
			const correctPairs = payload.pairs.filter((pair) => expected.get(pair.leftId) === pair.rightId).length;
			return result(maximum * (correctPairs / expected.size), maximum);
		}
		case 'ordering': {
			if (question.config.kind !== 'ordering' || question.gradingRule.kind !== 'ordering' || payload.kind !== 'ordering') break;
			const rule = question.gradingRule;
			const configured = question.config.items.map((item) => item.id);
			const allowed = new Set(configured);
			const correctOrder = new Set(rule.correctOrder);
			if (allowed.size !== configured.length || correctOrder.size !== rule.correctOrder.length || correctOrder.size !== allowed.size || [...correctOrder].some((id) => !allowed.has(id))) return invalid(maximum, 'Die serverseitige Bewertungsregel ist ungültig.');
			if (payload.itemIds.length !== configured.length || hasDuplicates(payload.itemIds) || payload.itemIds.some((id) => !allowed.has(id))) {
				return invalid(maximum, 'Die Reihenfolge muss jedes Element genau einmal enthalten.');
			}
			const exact = payload.itemIds.every((id, index) => id === rule.correctOrder[index]);
			return result(exact ? maximum : 0, maximum);
		}
		case 'short_text': {
			if (question.config.kind !== 'short_text' || question.gradingRule.kind !== 'short_text' || payload.kind !== 'short_text') break;
			if (question.config.maximumLength !== undefined && payload.text.length > question.config.maximumLength) {
				return invalid(maximum, 'Die Antwort überschreitet die erlaubte Länge.');
			}
			const normalizeWhitespace = question.gradingRule.normalizeWhitespace;
			const normalized = normalizeShortText(payload.text, normalizeWhitespace);
			const accepted = question.gradingRule.acceptedAnswers.map((value) => normalizeShortText(value, normalizeWhitespace));
			const isAccepted = normalized.length > 0 && accepted.includes(normalized);
			const feedback = isAccepted ? 'Richtig.' : question.gradingRule.criteria.join(' ');
			return result(isAccepted ? maximum : 0, maximum, feedback);
		}
	}

	return invalid(maximum, 'Die Antwort passt nicht zum Fragetyp.');
}
