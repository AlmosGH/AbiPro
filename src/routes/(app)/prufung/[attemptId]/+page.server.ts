import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { getMockExamAttempt, submitMockExam } from '$lib/server/mock-exam';
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
	if (!parsedId.success) error(404, 'Prüfungsversuch nicht gefunden.');
	depends(`attempt:exam:${parsedId.data}`);
	const attempt = await timeQuery('exam_attempt_loading', () => getMockExamAttempt(actor.userId, parsedId.data), { attemptId: parsedId.data });
	if (!attempt) error(404, 'Prüfungsversuch nicht gefunden.');
	const examTasks = await Promise.all(attempt.tasks.map(async (task) => ({
		...task,
		sources: await Promise.all(task.sources.map(async ({ assetPath, ...source }) => ({ ...source, assetUrl: assetPath ? await createAssetSignedUrl(assetPath) : null })))
	})));
	return { attempt: { ...attempt, tasks: examTasks } };
};

export const actions: Actions = {
	finish: async ({ locals, params }) => {
		const actor = requireActor(locals);
		const parsedId = attemptIdSchema.safeParse(params.attemptId);
		if (!parsedId.success) return fail(404, { message: 'Prüfungsversuch nicht gefunden.' });
		try {
			await enforceRateLimit(actor.userId, 'attempt_submit');
			const result = await submitMockExam(actor.userId, parsedId.data);
			return { graded: true, ...result };
		} catch (cause) {
			return fail(409, { message: cause instanceof Error ? cause.message : 'Die Prüfung konnte nicht abgegeben werden.' });
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
	}
};
