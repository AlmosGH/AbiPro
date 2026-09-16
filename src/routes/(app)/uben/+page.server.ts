import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { getReferenceData } from '$lib/server/content';
import { createPracticeAttempt, listResumablePracticeAttempts } from '$lib/server/practice';
import { requireActor } from '$lib/server/authorization';
import type { Actions, PageServerLoad } from './$types';
import { enforceRateLimit } from '$lib/server/rate-limit';

const optionalId = z.preprocess((value) => value === '' || value === null ? undefined : value, z.coerce.number().int().positive().optional());

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireActor(locals, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
	const references = await getReferenceData();
	const resumableAttempts = await listResumablePracticeAttempts(actor.userId);
	return {
		...references,
		resumableAttempts,
		requestedTaskSlug: url.searchParams.get('task')?.trim() || null,
		requestedTopicId: optionalId.safeParse(url.searchParams.get('topicId')).data ?? null
	};
};

export const actions: Actions = {
	start: async ({ locals, request }) => {
		const actor = requireActor(locals);
		const formData = await request.formData();
		const parsed = z.object({
			curriculumId: optionalId,
			periodId: optionalId,
			topicId: optionalId,
			onlyNotPracticed: z.preprocess((value) => value === 'on', z.boolean()),
			taskSlug: z.preprocess((value) => typeof value === 'string' && value.trim() ? value.trim() : undefined, z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional())
		}).safeParse(Object.fromEntries(formData));
		if (!parsed.success) return fail(400, { message: 'Die Übungseinstellungen sind ungültig.' });
		try {
			await enforceRateLimit(actor.userId, 'attempt_create');
			const attempt = await createPracticeAttempt(actor.userId, parsed.data);
			redirect(303, `/uben/${attempt.id}`);
		} catch (cause) {
			if (cause && typeof cause === 'object' && 'status' in cause) throw cause;
			return fail(400, { message: cause instanceof Error ? cause.message : 'Die Übung konnte nicht gestartet werden.' });
		}
	}
};
