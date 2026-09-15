import { describe, expect, it } from 'vitest';
import { gradeDeterministically, normalizeShortText, type DeterministicQuestion } from './deterministic';

const option = (id: string) => ({ id, label: id.toUpperCase() });
const grade = (question: DeterministicQuestion, answer: unknown) => gradeDeterministically(question, answer);

describe('deterministic grading', () => {
	it('grades single choice and rejects unknown or mismatched answers', () => {
		const question: DeterministicQuestion = { kind: 'choice', config: { kind: 'choice', options: [option('a'), option('b')] }, gradingRule: { kind: 'choice', correctOptionId: 'a' }, maxPoints: 2 };
		expect(grade(question, { kind: 'choice', optionId: 'a' })).toMatchObject({ score: 2, maximum: 2, correctness: 'correct' });
		expect(grade(question, { kind: 'choice', optionId: 'b' }).score).toBe(0);
		expect(grade(question, { kind: 'choice', optionId: '__proto__' }).correctness).toBe('invalid');
		expect(grade(question, { kind: 'short_text', text: 'a' }).correctness).toBe('invalid');
	});

	it('supports all-or-nothing and penalized partial multiple choice', () => {
		const base = { kind: 'multiple_choice' as const, config: { kind: 'multiple_choice' as const, options: [option('a'), option('b'), option('c')] }, maxPoints: 4 };
		expect(grade({ ...base, gradingRule: { kind: 'multiple_choice', correctOptionIds: ['a', 'b'], allOrNothing: true } }, { kind: 'multiple_choice', optionIds: ['a'] }).score).toBe(0);
		expect(grade({ ...base, gradingRule: { kind: 'multiple_choice', correctOptionIds: ['a', 'b'], allOrNothing: false } }, { kind: 'multiple_choice', optionIds: ['a'] }).score).toBe(2);
		expect(grade({ ...base, gradingRule: { kind: 'multiple_choice', correctOptionIds: ['a', 'b'], allOrNothing: false } }, { kind: 'multiple_choice', optionIds: ['a', 'c'] }).score).toBe(0);
		expect(grade({ ...base, gradingRule: { kind: 'multiple_choice', correctOptionIds: ['a', 'b'], allOrNothing: false } }, { kind: 'multiple_choice', optionIds: ['a', 'a'] }).correctness).toBe('invalid');
	});

	it('enforces configured multiple-choice selection bounds', () => {
		const question: DeterministicQuestion = {
			kind: 'multiple_choice',
			config: { kind: 'multiple_choice', options: [option('a'), option('b'), option('c')], minimumSelections: 1, maximumSelections: 2 },
			gradingRule: { kind: 'multiple_choice', correctOptionIds: ['a'], allOrNothing: true },
			maxPoints: 1
		};
		expect(grade(question, { kind: 'multiple_choice', optionIds: [] }).correctness).toBe('invalid');
		expect(grade(question, { kind: 'multiple_choice', optionIds: ['a', 'b', 'c'] }).correctness).toBe('invalid');
	});

	it('grades matching proportionally and rejects duplicate endpoints', () => {
		const question: DeterministicQuestion = {
			kind: 'matching', config: { kind: 'matching', left: [option('l1'), option('l2')], right: [option('r1'), option('r2')] },
			gradingRule: { kind: 'matching', pairs: [{ leftId: 'l1', rightId: 'r1' }, { leftId: 'l2', rightId: 'r2' }] }, maxPoints: 3
		};
		expect(grade(question, { kind: 'matching', pairs: [{ leftId: 'l1', rightId: 'r1' }, { leftId: 'l2', rightId: 'r1' }] }).correctness).toBe('invalid');
		expect(grade(question, { kind: 'matching', pairs: [{ leftId: 'l1', rightId: 'r1' }, { leftId: 'l2', rightId: 'r2' }] }).score).toBe(3);
		expect(grade(question, { kind: 'matching', pairs: [{ leftId: 'l1', rightId: 'r1' }] })).toMatchObject({ score: 1.5, correctness: 'partial' });
	});

	it('requires an exact complete ordering', () => {
		const question: DeterministicQuestion = { kind: 'ordering', config: { kind: 'ordering', items: [option('a'), option('b'), option('c')] }, gradingRule: { kind: 'ordering', correctOrder: ['b', 'a', 'c'] }, maxPoints: 2 };
		expect(grade(question, { kind: 'ordering', itemIds: ['b', 'a', 'c'] }).score).toBe(2);
		expect(grade(question, { kind: 'ordering', itemIds: ['a', 'b', 'c'] }).score).toBe(0);
		expect(grade(question, { kind: 'ordering', itemIds: ['b', 'b', 'c'] }).correctness).toBe('invalid');
	});

	it('normalizes short text conservatively and optionally collapses whitespace', () => {
		expect(normalizeShortText('  Der   Reichstag\n ', false)).toBe('der   reichstag');
		expect(normalizeShortText('  Der   Reichstag\n ', true)).toBe('der reichstag');
		const base = { kind: 'short_text' as const, config: { kind: 'short_text' as const, multiline: false, maximumLength: 50 }, maxPoints: 1 };
		expect(grade({ ...base, gradingRule: { kind: 'short_text', acceptedAnswers: ['Der Reichstag'], criteria: ['Reichstag erwartet.'], aiEligible: false, normalizeWhitespace: false } }, { kind: 'short_text', text: ' der reichstag ' }).score).toBe(1);
		expect(grade({ ...base, gradingRule: { kind: 'short_text', acceptedAnswers: ['Der Reichstag'], criteria: ['Reichstag erwartet.'], aiEligible: false, normalizeWhitespace: false } }, { kind: 'short_text', text: 'der  reichstag' }).score).toBe(0);
		expect(grade({ ...base, gradingRule: { kind: 'short_text', acceptedAnswers: ['Der Reichstag'], criteria: ['Reichstag erwartet.'], aiEligible: false, normalizeWhitespace: true } }, { kind: 'short_text', text: 'der  reichstag' }).score).toBe(1);
		expect(grade({ ...base, gradingRule: { kind: 'short_text', acceptedAnswers: ['Der Reichstag'], criteria: ['Reichstag erwartet.'], aiEligible: false, normalizeWhitespace: true } }, { kind: 'short_text', text: 'der reichstag.' }).score).toBe(0);
		expect(grade({ ...base, config: { kind: 'short_text', multiline: false, maximumLength: 3 }, gradingRule: { kind: 'short_text', acceptedAnswers: ['abcd'], criteria: ['Kurz antworten.'], aiEligible: false, normalizeWhitespace: false } }, { kind: 'short_text', text: 'abcd' }).correctness).toBe('invalid');
	});

	it('rejects malformed server rules instead of producing points', () => {
		const malformed = {
			kind: 'ordering' as const,
			config: { kind: 'ordering' as const, items: [option('a'), option('b')] },
			gradingRule: { kind: 'ordering' as const, correctOrder: ['a', 'a'] },
			maxPoints: 10
		};
		expect(grade(malformed, { kind: 'ordering', itemIds: ['a', 'b'] })).toMatchObject({ score: 0, maximum: 10, correctness: 'invalid' });
	});

	it('ignores client-supplied points and grading rules', () => {
		const question: DeterministicQuestion = { kind: 'choice', config: { kind: 'choice', options: [option('a'), option('b')] }, gradingRule: { kind: 'choice', correctOptionId: 'b' }, maxPoints: 2 };
		const adversarial = { kind: 'choice', optionId: 'a', score: 999, maxPoints: 999, gradingRule: { kind: 'choice', correctOptionId: 'a' } };
		expect(grade(question, adversarial)).toMatchObject({ score: 0, maximum: 2, correctness: 'incorrect' });
	});

	it.each([null, undefined, 7, [], {}, { kind: 'choice' }, { kind: 'choice', optionId: 'a', score: 999 }])('handles malformed payload %j', (payload) => {
		const question: DeterministicQuestion = { kind: 'choice', config: { kind: 'choice', options: [option('a'), option('b')] }, gradingRule: { kind: 'choice', correctOptionId: 'a' }, maxPoints: 1 };
		const output = grade(question, payload);
		expect(output.score).toBeGreaterThanOrEqual(0);
		expect(output.score).toBeLessThanOrEqual(output.maximum);
		if (payload && typeof payload === 'object' && 'optionId' in payload) expect(output.score).toBe(1); // client-supplied score is ignored
	});

	it('clamps scores and produces byte-for-byte reproducible results', () => {
		const question: DeterministicQuestion = { kind: 'matching', config: { kind: 'matching', left: [option('l')], right: [option('r')] }, gradingRule: { kind: 'matching', pairs: [{ leftId: 'l', rightId: 'r' }] }, maxPoints: 0.1 + 0.2 };
		const answer = { kind: 'matching', pairs: [{ leftId: 'l', rightId: 'r' }] };
		const first = grade(question, answer);
		expect(first.score).toBe(0.3);
		expect(JSON.stringify(grade(question, answer))).toBe(JSON.stringify(first));
	});
});
