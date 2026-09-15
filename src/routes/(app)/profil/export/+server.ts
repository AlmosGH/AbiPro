import { json } from '@sveltejs/kit';
import { eq, inArray } from 'drizzle-orm';
import { requireActor } from '$lib/server/authorization';
import { getDb } from '$lib/server/db';
import { assessmentAttempts, attemptAnswers, attemptTasks, gradingRuns, profiles } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const actor = requireActor(locals);
	const db = getDb();
	const [profile] = await db.select().from(profiles).where(eq(profiles.id, actor.userId));
	const attempts = await db.select().from(assessmentAttempts).where(eq(assessmentAttempts.userId, actor.userId));
	const attemptIds = attempts.map((row) => row.id);
	const tasks = attemptIds.length ? await db.select().from(attemptTasks).where(inArray(attemptTasks.attemptId, attemptIds)) : [];
	const taskIds = tasks.map((row) => row.id);
	const answers = taskIds.length ? await db.select().from(attemptAnswers).where(inArray(attemptAnswers.attemptTaskId, taskIds)) : [];
	const answerIds = answers.map((row) => row.id);
	const runs = answerIds.length ? await db.select().from(gradingRuns).where(inArray(gradingRuns.attemptAnswerId, answerIds)) : [];
	return json({ exportedAt: new Date().toISOString(), profile, attempts, attemptTasks: tasks, answers, gradingRuns: runs }, { headers: { 'content-disposition': `attachment; filename="abipro-export-${new Date().toISOString().slice(0, 10)}.json"`, 'cache-control': 'no-store' } });
};
