import { fail, redirect } from '@sveltejs/kit';
import { MOCK_EXAM_CONFIG } from '$lib/exam/config';
import { createMockExamAttempt, getActiveMockExam, getMockExamReadiness } from '$lib/server/mock-exam';
import { requireActor } from '$lib/server/authorization';
import type { Actions, PageServerLoad } from './$types';
import { enforceRateLimit } from '$lib/server/rate-limit';

export const load: PageServerLoad = async ({ locals, url }) => {
	const actor = requireActor(locals, `/login?next=${encodeURIComponent(url.pathname)}`);
	const readiness = await getMockExamReadiness();
	const activeAttempt = await getActiveMockExam(actor.userId);
	return { config: MOCK_EXAM_CONFIG, readiness, activeAttempt };
};

export const actions: Actions = {
	start: async ({ locals }) => {
		const actor = requireActor(locals);
		try {
			await enforceRateLimit(actor.userId, 'attempt_create');
			const attempt = await createMockExamAttempt(actor.userId);
			redirect(303, `/prufung/${attempt.id}`);
		} catch (cause) {
			if (cause && typeof cause === 'object' && 'status' in cause) throw cause;
			return fail(409, { message: cause instanceof Error ? cause.message : 'Die Prüfung konnte nicht gestartet werden.' });
		}
	}
};
