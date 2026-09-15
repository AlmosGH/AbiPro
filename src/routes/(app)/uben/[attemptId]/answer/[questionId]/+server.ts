import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { savePracticeAnswer } from '$lib/server/practice';
import type { RequestHandler } from './$types';

const idSchema = z.coerce.number().int().positive();

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.userId) error(401, 'Anmeldung erforderlich.');
	const attemptId = idSchema.safeParse(params.attemptId);
	const questionId = idSchema.safeParse(params.questionId);
	if (!attemptId.success || !questionId.success) error(400, 'Ungültige Kennung.');
	let response: unknown;
	try {
		response = await request.json();
	} catch {
		error(400, 'Ungültiges JSON.');
	}
	try {
		const saved = await savePracticeAnswer(locals.userId, attemptId.data, questionId.data, response);
		return json(saved);
	} catch (cause) {
		error(400, cause instanceof Error ? cause.message : 'Antwort konnte nicht gespeichert werden.');
	}
};
