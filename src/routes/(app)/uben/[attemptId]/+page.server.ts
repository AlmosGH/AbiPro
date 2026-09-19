import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { getBestPracticeScore, getPracticeAttempt, submitPracticeAttempt } from '$lib/server/practice';
import { retryAiGradesForAttempt } from '$lib/server/ai-grading.server';
import { createAssetSignedUrl } from '$lib/server/storage';
import { requireActor } from '$lib/server/authorization';
import { selfGradeAnswer } from '$lib/server/ai-grading.server';
import type { Actions, PageServerLoad } from './$types';
import { enforceRateLimit } from '$lib/server/rate-limit';
import { timeQuery } from '$lib/server/query-timing';

const attemptIdSchema = z.coerce.number().int().positive();

export const load: PageServerLoad = async ({ locals, params, depends }) => {
	const actor = requireActor(locals);
	const parsedId = attemptIdSchema.safeParse(params.attemptId);
	if (!parsedId.success) error(404, 'Übungsversuch nicht gefunden.');
	depends(`attempt:practice:${parsedId.data}`);
	const attempt = await timeQuery('practice_attempt_loading', () => getPracticeAttempt(actor.userId, parsedId.data), { attemptId: parsedId.data });
	if (!attempt) error(404, 'Übungsversuch nicht gefunden.');
	const [sources, bestAttempt] = await Promise.all([
		Promise.all(attempt.sources.map(async ({ assetPath, ...source }) => ({ ...source, assetUrl: assetPath ? await createAssetSignedUrl(assetPath) : null }))),
		getBestPracticeScore(actor.userId, attempt.taskVersionId)
	]);
	return { attempt: { ...attempt, sources }, bestAttempt };
};

export const actions: Actions = {
	submit: async ({ locals, params }) => {
		const actor = requireActor(locals);
		const parsedId = attemptIdSchema.safeParse(params.attemptId);
		if (!parsedId.success) return fail(404, { message: 'Übungsversuch nicht gefunden.' });
		try {
			await enforceRateLimit(actor.userId, 'attempt_submit');
			const result = await submitPracticeAttempt(actor.userId, parsedId.data);
			return { graded: true, ...result };
		} catch (cause) {
			return fail(400, { message: cause instanceof Error ? cause.message : 'Die Übung konnte nicht abgegeben werden.' });
		}
	},
	selfGrade: async ({ locals, params, request }) => {
		const actor = requireActor(locals);
		const parsedId = attemptIdSchema.safeParse(params.attemptId);
		const parsed = z.object({ answerId: z.coerce.number().int().positive(), awardedPoints: z.coerce.number().min(0) }).safeParse(Object.fromEntries(await request.formData()));
		if (!parsedId.success || !parsed.success) return fail(400, { message: 'Die Selbstbewertung ist ungültig.' });
		try {
			await selfGradeAnswer(actor.userId, parsedId.data, parsed.data.answerId, parsed.data.awardedPoints);
			return { selfGraded: true };
		} catch (cause) {
			return fail(400, { message: cause instanceof Error ? cause.message : 'Die Selbstbewertung konnte nicht gespeichert werden.' });
		}
	},
	retryAutoGrade: async ({ locals, params }) => {
		const actor = requireActor(locals);
		const parsedId = attemptIdSchema.safeParse(params.attemptId);
		if (!parsedId.success) return fail(404, { message: 'Übungsversuch nicht gefunden.' });
		try {
			const result = await retryAiGradesForAttempt(actor.userId, parsedId.data);
			return { retried: result.retried };
		} catch (cause) {
			return fail(400, { message: cause instanceof Error ? cause.message : 'Die automatische Bewertung konnte nicht erneut gestartet werden.' });
		}
	}
};
