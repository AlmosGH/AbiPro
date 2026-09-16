import { describe, expect, it } from 'vitest';
import { learnerQuestionSelection, postGradingSolution, toLearnerQuestion } from './learner-content';

describe('learner-facing task content', () => {
	it('does not serialize official answers or grading criteria', () => {
		const databaseQuestion = {
			id: 17,
			position: 0,
			kind: 'short_text' as const,
			prompt: 'Nenne ein Ereignis.',
			config: { kind: 'short_text' as const, multiline: false },
			maxPoints: 1,
			gradingRule: {
				kind: 'short_text',
				acceptedAnswers: ['GEHEIME_ANTWORT'],
				criteria: ['GEHEIMES_KRITERIUM'],
				aiEligible: true
			}
		};

		const serialized = JSON.stringify(toLearnerQuestion(databaseQuestion));

		expect(serialized).not.toContain('gradingRule');
		expect(serialized).not.toContain('GEHEIME_ANTWORT');
		expect(serialized).not.toContain('GEHEIMES_KRITERIUM');
		expect(Object.keys(toLearnerQuestion(databaseQuestion))).toEqual([
			'id', 'position', 'kind', 'prompt', 'config', 'maxPoints'
		]);
		expect(learnerQuestionSelection).not.toHaveProperty('gradingRule');
	});

	it('formats solutions only from the server-side grading rule', () => {
		expect(postGradingSolution(
			{ kind: 'short_text', multiline: false },
			{ kind: 'short_text', acceptedAnswers: ['Hafen', 'Bucht'], criteria: ['Hafen oder Bucht'], aiEligible: true, normalizeWhitespace: true }
		)).toBe('Hafen / Bucht');
		expect(postGradingSolution(
			{ kind: 'choice', options: [{ id: 'a', label: 'Falsch' }, { id: 'b', label: 'Richtig' }] },
			{ kind: 'choice', correctOptionId: 'b' }
		)).toBe('Richtig');
	});
});
