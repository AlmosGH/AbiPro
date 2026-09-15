import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { getBestPracticeScore, getPracticeAttempt, submitPracticeAttempt } from '$lib/server/practice';
import { createAssetSignedUrl } from '$lib/server/storage';
import { requireActor } from '$lib/server/authorization';
import type { Actions, PageServerLoad } from './$types';

const attemptIdSchema = z.coerce.number().int().positive();

export const load: PageServerLoad = async ({ locals, params }) => {
	const actor = requireActor(locals);
	const parsedId = attemptIdSchema.safeParse(params.attemptId);
	if (!parsedId.success) error(404, 'Übungsversuch nicht gefunden.');
	const attempt = await getPracticeAttempt(actor.userId, parsedId.data);
	if (!attempt) error(404, 'Übungsversuch nicht gefunden.');
	const [sources, bestAttempt] = await Promise.all([
		Promise.all(attempt.sources.map(async ({ assetPath, ...source }) => ({
			...source,
			assetUrl: assetPath ? await createAssetSignedUrl(assetPath) : null
		}))),
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
			const result = await submitPracticeAttempt(actor.userId, parsedId.data);
			return { graded: true, ...result };
		} catch (cause) {
			return fail(400, { message: cause instanceof Error ? cause.message : 'Die Übung konnte nicht abgegeben werden.' });
		}
	}
};
