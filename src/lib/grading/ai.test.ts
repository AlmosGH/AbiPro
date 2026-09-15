import { describe, expect, it } from 'vitest';
import { gradeShortTextWithAi, type AiGraderTransport } from './ai';

const input = { prompt: 'Nenne eine Ursache.', learnerAnswer: 'Industrialisierung', criteria: ['Industrialisierung wird genannt.'], maximumPoints: 2 };

describe('fixture-backed AI grader', () => {
	it('accepts and bounds a valid structured fixture', async () => {
		const transport: AiGraderTransport = { grade: async () => ({ awardedPoints: 3, matchedCriteria: input.criteria, feedback: 'Das zentrale Kriterium ist erfüllt.', confidence: 0.94, needsReview: false }) };
		const outcome = await gradeShortTextWithAi(input, { transport });
		expect(outcome.status).toBe('graded');
		if (outcome.status === 'graded') expect(outcome.grade.awardedPoints).toBe(2);
	});

	it('routes low-confidence fixtures to review', async () => {
		const transport: AiGraderTransport = { grade: async () => ({ awardedPoints: 1, matchedCriteria: [], feedback: 'Unsicher.', confidence: 0.3, needsReview: false }) };
		expect((await gradeShortTextWithAi(input, { transport })).status).toBe('needs_review');
	});

	it('retries malformed fixtures without a live model', async () => {
		let calls = 0;
		const transport: AiGraderTransport = { grade: async () => (++calls === 1 ? { nope: true } : { awardedPoints: 1, matchedCriteria: input.criteria, feedback: 'Teilweise erfüllt.', confidence: 0.9, needsReview: false }) };
		expect((await gradeShortTextWithAi(input, { transport, maxAttempts: 2 })).status).toBe('graded');
		expect(calls).toBe(2);
	});

	it('rejects criteria that were not supplied by the rubric', async () => {
		const transport: AiGraderTransport = { grade: async () => ({ awardedPoints: 1, matchedCriteria: ['Erfundene Regel'], feedback: 'Nicht prüfbar.', confidence: 0.9, needsReview: false }) };
		const outcome = await gradeShortTextWithAi(input, { transport, maxAttempts: 1 });
		expect(outcome.status).toBe('needs_review');
		if (outcome.status === 'needs_review') expect(outcome.errorCode).toBe('invalid_response');
	});

	it('redacts keys from stored error details', async () => {
		const transport: AiGraderTransport = { grade: async () => { throw new Error('failed ?key=AIza123456789012345678901234567890'); } };
		const outcome = await gradeShortTextWithAi(input, { transport, maxAttempts: 1 });
		expect(outcome.status).toBe('needs_review');
		if (outcome.status === 'needs_review') expect(outcome.errorMessage).not.toContain('AIza');
	});
});
