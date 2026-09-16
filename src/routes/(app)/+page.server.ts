import { fail, redirect } from '@sveltejs/kit';
import { requireActor } from '$lib/server/authorization';
import { getMockExamReadiness, getActiveMockExam } from '$lib/server/mock-exam';
import { createPracticeAttempt, listResumablePracticeAttempts } from '$lib/server/practice';
import { getProfileProgress } from '$lib/server/profile-progress';
import { enforceRateLimit } from '$lib/server/rate-limit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const actor = requireActor(locals);
	const [progress, practiceAttempts, activeExam, examPool] = await Promise.all([
		getProfileProgress(actor.userId), listResumablePracticeAttempts(actor.userId), getActiveMockExam(actor.userId), getMockExamReadiness()
	]);
	const weakestTopic = [...progress.topics].filter((topic) => topic.averagePercent !== null).sort((a, b) => (a.averagePercent ?? 101) - (b.averagePercent ?? 101))[0] ?? null;
	const readinessScore = Math.round(Math.min(100, (progress.overview.averagePercent ?? 0) * 0.8 + Math.min(20, (progress.overview.practiceCompleted + progress.overview.mockExamsCompleted * 2) * 2)));
	return { progress, activePractice: practiceAttempts[0] ?? null, activeExam, examPool, weakestTopic, readinessScore };
};

export const actions: Actions = {
	quickStart: async ({ locals }) => {
		const actor = requireActor(locals);
		try {
			await enforceRateLimit(actor.userId, 'attempt_create');
			const attempt = await createPracticeAttempt(actor.userId, { onlyNotPracticed: true });
			redirect(303, `/uben/${attempt.id}`);
		} catch (cause) {
			if (cause && typeof cause === 'object' && 'status' in cause) throw cause;
			return fail(400, { message: cause instanceof Error ? cause.message : 'Die Übung konnte nicht gestartet werden.' });
		}
	}
};
