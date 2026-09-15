import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { saveMockExamAnswer } from '$lib/server/mock-exam';
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
		return json(await saveMockExamAnswer(locals.userId, attemptId.data, questionId.data, response));
	} catch (cause) {
		error(409, cause instanceof Error ? cause.message : 'Antwort konnte nicht gespeichert werden.');
	}
};
