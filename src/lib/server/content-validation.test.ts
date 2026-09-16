import { describe, expect, it } from 'vitest';
import { questionDraftSchema, sourceDraftSchema, validatePointTotal } from './content-validation';

const option = (id: string) => ({ id, label: id.toUpperCase() });

describe('task authoring validation', () => {
	it.each([
		{ kind: 'choice', prompt: 'Choice?', config: { kind: 'choice', options: [option('a'), option('b')] }, gradingRule: { kind: 'choice', correctOptionId: 'a' }, maxPoints: 1 },
		{ kind: 'multiple_choice', prompt: 'Multiple?', config: { kind: 'multiple_choice', options: [option('a'), option('b')] }, gradingRule: { kind: 'multiple_choice', correctOptionIds: ['a'], allOrNothing: true }, maxPoints: 1 },
		{ kind: 'matching', prompt: 'Match?', config: { kind: 'matching', left: [option('left')], right: [option('right')] }, gradingRule: { kind: 'matching', pairs: [{ leftId: 'left', rightId: 'right' }] }, maxPoints: 1 },
		{ kind: 'ordering', prompt: 'Order?', config: { kind: 'ordering', items: [option('first'), option('second')] }, gradingRule: { kind: 'ordering', correctOrder: ['first', 'second'] }, maxPoints: 1 },
		{ kind: 'short_text', prompt: 'Text?', config: { kind: 'short_text', multiline: false }, gradingRule: { kind: 'short_text', acceptedAnswers: ['answer'], criteria: ['meaning'], aiEligible: false }, maxPoints: 1 }
	])('accepts the $kind question type', (question) => {
		expect(questionDraftSchema.safeParse(question).success).toBe(true);
	});

	it('rejects a grading rule that references a missing option', () => {
		const result = questionDraftSchema.safeParse({ kind: 'choice', prompt: 'Choice?', config: { kind: 'choice', options: [option('a'), option('b')] }, gradingRule: { kind: 'choice', correctOptionId: 'c' }, maxPoints: 1 });
		expect(result.success).toBe(false);
	});

	it('accepts matching questions with unassigned distractors', () => {
		const result = questionDraftSchema.safeParse({ kind: 'matching', prompt: 'Match?', config: { kind: 'matching', left: [option('correct'), option('distractor')], right: [option('answer')] }, gradingRule: { kind: 'matching', pairs: [{ leftId: 'correct', rightId: 'answer' }] }, maxPoints: 1 });
		expect(result.success).toBe(true);
	});

	it('accepts matching questions that reuse a right-hand category', () => {
		const result = questionDraftSchema.safeParse({ kind: 'matching', prompt: 'Match?', config: { kind: 'matching', left: [option('first'), option('second')], right: [option('category')] }, gradingRule: { kind: 'matching', pairs: [{ leftId: 'first', rightId: 'category' }, { leftId: 'second', rightId: 'category' }] }, maxPoints: 1 });
		expect(result.success).toBe(true);
	});

	it('validates source-specific content', () => {
		expect(sourceDraftSchema.safeParse({ kind: 'text', content: { text: 'Primary source' } }).success).toBe(true);
		expect(sourceDraftSchema.safeParse({ kind: 'table', content: { text: 'not a table' } }).success).toBe(false);
	});

	it('requires question points to equal task points', () => {
		expect(validatePointTotal(2, [{ maxPoints: 1 }, { maxPoints: 1 }])).toBeNull();
		expect(validatePointTotal(3, [{ maxPoints: 1 }, { maxPoints: 1 }])).toContain('2 Punkte');
	});
});
