import { and, asc, countDistinct, desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { assessmentAttempts, attemptAnswers, attemptTasks, historicalPeriods, questions, taskVersionTopics, taskVersions, tasks, topics } from '$lib/server/db/schema';

const completed = inArray(assessmentAttempts.status, ['submitted', 'graded']);

export async function getProfileProgress(userId: string) {
	const db = getDb();
	const overviewQuery = db.select({
			practiceCompleted: sql<number>`count(*) filter (where ${assessmentAttempts.kind} = 'practice')::int`,
			mockExamsCompleted: sql<number>`count(*) filter (where ${assessmentAttempts.kind} = 'mock_exam')::int`,
			averagePercent: sql<number | null>`round(avg(100 * ${assessmentAttempts.score} / ${assessmentAttempts.maxScore}) filter (where ${assessmentAttempts.status} = 'graded'), 1)::float`,
			bestPercent: sql<number | null>`round(max(100 * ${assessmentAttempts.score} / ${assessmentAttempts.maxScore}) filter (where ${assessmentAttempts.status} = 'graded'), 1)::float`,
			pendingAi: sql<number>`count(*) filter (where ${assessmentAttempts.status} = 'submitted')::int`,
			weeklyCompleted: sql<number>`count(*) filter (where ${assessmentAttempts.submittedAt} >= now() - interval '7 days')::int`
		}).from(assessmentAttempts).where(and(eq(assessmentAttempts.userId, userId), completed));
	const recentQuery = db.select({ id: assessmentAttempts.id, kind: assessmentAttempts.kind, status: assessmentAttempts.status, submittedAt: assessmentAttempts.submittedAt, score: assessmentAttempts.score, maxScore: assessmentAttempts.maxScore, title: sql<string>`string_agg(${taskVersions.title}, ', ' order by ${attemptTasks.position})` })
			.from(assessmentAttempts).innerJoin(attemptTasks, eq(attemptTasks.attemptId, assessmentAttempts.id)).innerJoin(taskVersions, eq(taskVersions.id, attemptTasks.taskVersionId))
			.where(and(eq(assessmentAttempts.userId, userId), completed)).groupBy(assessmentAttempts.id).orderBy(desc(assessmentAttempts.submittedAt)).limit(10);
	const periodsQuery = db.select({ name: historicalPeriods.name, attempts: countDistinct(assessmentAttempts.id), averagePercent: sql<number | null>`round(100 * sum(${attemptAnswers.awardedPoints}) filter (where ${assessmentAttempts.status} = 'graded') / nullif(sum(${questions.maxPoints}) filter (where ${assessmentAttempts.status} = 'graded'), 0), 1)::float` })
			.from(assessmentAttempts).innerJoin(attemptTasks, eq(attemptTasks.attemptId, assessmentAttempts.id)).innerJoin(taskVersions, eq(taskVersions.id, attemptTasks.taskVersionId)).innerJoin(historicalPeriods, eq(historicalPeriods.id, taskVersions.periodId)).innerJoin(questions, eq(questions.taskVersionId, taskVersions.id)).leftJoin(attemptAnswers, and(eq(attemptAnswers.attemptTaskId, attemptTasks.id), eq(attemptAnswers.questionId, questions.id)))
			.where(and(eq(assessmentAttempts.userId, userId), completed)).groupBy(historicalPeriods.id).orderBy(asc(historicalPeriods.position));
	const topicsQuery = db.select({ id: topics.id, name: topics.name, attempts: countDistinct(assessmentAttempts.id), averagePercent: sql<number | null>`round(100 * sum(${attemptAnswers.awardedPoints}) filter (where ${assessmentAttempts.status} = 'graded') / nullif(sum(${questions.maxPoints}) filter (where ${assessmentAttempts.status} = 'graded'), 0), 1)::float` })
			.from(assessmentAttempts).innerJoin(attemptTasks, eq(attemptTasks.attemptId, assessmentAttempts.id)).innerJoin(taskVersionTopics, eq(taskVersionTopics.taskVersionId, attemptTasks.taskVersionId)).innerJoin(topics, eq(topics.id, taskVersionTopics.topicId)).innerJoin(questions, eq(questions.taskVersionId, attemptTasks.taskVersionId)).leftJoin(attemptAnswers, and(eq(attemptAnswers.attemptTaskId, attemptTasks.id), eq(attemptAnswers.questionId, questions.id)))
			.where(and(eq(assessmentAttempts.userId, userId), completed)).groupBy(topics.id).orderBy(asc(topics.name));
	// Keep useful concurrency without exhausting the small application pool when
	// this aggregate is loaded alongside dashboard or catalogue queries.
	const [overviewRows, recent] = await Promise.all([overviewQuery, recentQuery]);
	const [periods, topicRows] = await Promise.all([periodsQuery, topicsQuery]);
	return { overview: overviewRows[0] ?? { practiceCompleted: 0, mockExamsCompleted: 0, averagePercent: null, bestPercent: null, pendingAi: 0, weeklyCompleted: 0 }, recent, periods, topics: topicRows };
}

export async function getAttemptHistoryDetail(userId: string, attemptId: number) {
	const db = getDb();
	const [attempt] = await db.select().from(assessmentAttempts).where(and(eq(assessmentAttempts.id, attemptId), eq(assessmentAttempts.userId, userId), completed));
	if (!attempt) return null;
	const rows = await db.select({
		title: taskVersions.title, slug: tasks.slug, version: taskVersions.version, taskStatus: tasks.status, versionStatus: taskVersions.status,
		question: sql<string>`${questions.prompt}`, response: attemptAnswers.response, answerStatus: attemptAnswers.status,
		awardedPoints: attemptAnswers.awardedPoints, maximum: questions.maxPoints, feedback: attemptAnswers.feedback
	}).from(attemptTasks).innerJoin(taskVersions, eq(taskVersions.id, attemptTasks.taskVersionId)).innerJoin(tasks, eq(tasks.id, taskVersions.taskId))
		.innerJoin(questions, eq(questions.taskVersionId, taskVersions.id)).leftJoin(attemptAnswers, and(eq(attemptAnswers.attemptTaskId, attemptTasks.id), eq(attemptAnswers.questionId, questions.id)))
		.where(eq(attemptTasks.attemptId, attemptId)).orderBy(asc(attemptTasks.position), asc(questions.position));
	return { attempt, rows };
}

export async function getPracticedTaskVersionIds(userId: string) {
	const rows = await getDb().selectDistinct({ taskVersionId: attemptTasks.taskVersionId }).from(attemptTasks)
		.innerJoin(assessmentAttempts, eq(assessmentAttempts.id, attemptTasks.attemptId))
		.where(and(eq(assessmentAttempts.userId, userId), eq(assessmentAttempts.kind, 'practice'), completed));
	return new Set(rows.map((row) => row.taskVersionId));
}
