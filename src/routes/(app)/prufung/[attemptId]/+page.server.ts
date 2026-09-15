import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { getMockExamAttempt, submitMockExam } from '$lib/server/mock-exam';
import { createAssetSignedUrl } from '$lib/server/storage';
import { requireActor } from '$lib/server/authorization';
import type { Actions, PageServerLoad } from './$types';

const attemptIdSchema = z.coerce.number().int().positive();

export const load: PageServerLoad = async ({ locals, params }) => {
	const actor = requireActor(locals);
	const parsedId = attemptIdSchema.safeParse(params.attemptId);
	if (!parsedId.success) error(404, 'Prüfungsversuch nicht gefunden.');
	const attempt = await getMockExamAttempt(actor.userId, parsedId.data);
	if (!attempt) error(404, 'Prüfungsversuch nicht gefunden.');
	const examTasks = await Promise.all(attempt.tasks.map(async (task) => ({
		...task,
		sources: await Promise.all(task.sources.map(async ({ assetPath, ...source }) => ({
			...source,
			assetUrl: assetPath ? await createAssetSignedUrl(assetPath) : null
		})))
	})));
	return { attempt: { ...attempt, tasks: examTasks } };
};

export const actions: Actions = {
	finish: async ({ locals, params }) => {
		const actor = requireActor(locals);
		const parsedId = attemptIdSchema.safeParse(params.attemptId);
		if (!parsedId.success) return fail(404, { message: 'Prüfungsversuch nicht gefunden.' });
		try {
			const result = await submitMockExam(actor.userId, parsedId.data);
			return { graded: true, ...result };
		} catch (cause) {
			return fail(409, { message: cause instanceof Error ? cause.message : 'Die Prüfung konnte nicht abgegeben werden.' });
		}
	}
};
