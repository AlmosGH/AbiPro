import { createHash } from 'node:crypto';
import { and, eq, inArray, lt, or, sql } from 'drizzle-orm';
import { AI_GRADER_PROVIDER, AI_GRADER_SCHEMA_VERSION, gradeShortTextWithAi } from '$lib/grading/ai';
import { getDb } from '$lib/server/db';
import { assessmentAttempts, attemptAnswers, attemptTasks, gradingRuns, questions } from '$lib/server/db/schema';
import { GeminiTransport, GEMINI_MODEL } from '$lib/server/gemini.server';
import { enforceRateLimit } from '$lib/server/rate-limit';
import type { AnswerPayload } from '$lib/types/questions';

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonicalize(child)]));
	return value;
}

export function gradingInputHash(value: unknown) {
	return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

export function isAiEligibleMiss(question: typeof questions.$inferSelect, response: AnswerPayload, deterministicCorrect: boolean) {
	return question.kind === 'short_text' && question.gradingRule.kind === 'short_text' && question.gradingRule.aiEligible && response.kind === 'short_text' && response.text.trim().length > 0 && !deterministicCorrect;
}

export async function queueAiGrade(transaction: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0], answerId: number, question: typeof questions.$inferSelect, response: AnswerPayload) {
	if (question.gradingRule.kind !== 'short_text' || response.kind !== 'short_text') return;
	const inputHash = gradingInputHash({ schemaVersion: AI_GRADER_SCHEMA_VERSION, question: question.prompt, criteria: question.gradingRule.criteria, maximumPoints: question.maxPoints, answer: response.text });
	await transaction.insert(gradingRuns).values({
		attemptAnswerId: answerId, method: 'ai', status: 'pending', provider: AI_GRADER_PROVIDER,
		model: GEMINI_MODEL, graderSchemaVersion: AI_GRADER_SCHEMA_VERSION, inputHash
	}).onConflictDoNothing();
	await transaction.update(attemptAnswers).set({ status: 'pending', awardedPoints: null, feedback: 'Die Antwort wird KI-gestützt bewertet.' }).where(eq(attemptAnswers.id, answerId));
}

export async function processAiGradesForAttempt(userId: string, attemptId: number) {
	const db = getDb();
	const pending = await db.select({ run: gradingRuns, answer: attemptAnswers, question: questions })
		.from(gradingRuns)
		.innerJoin(attemptAnswers, eq(attemptAnswers.id, gradingRuns.attemptAnswerId))
		.innerJoin(questions, eq(questions.id, attemptAnswers.questionId))
		.innerJoin(attemptTasks, eq(attemptTasks.id, attemptAnswers.attemptTaskId))
		.innerJoin(assessmentAttempts, eq(assessmentAttempts.id, attemptTasks.attemptId))
		.where(and(eq(assessmentAttempts.id, attemptId), eq(assessmentAttempts.userId, userId), eq(gradingRuns.method, 'ai'), or(eq(gradingRuns.status, 'pending'), and(eq(gradingRuns.status, 'processing'), lt(gradingRuns.createdAt, new Date(Date.now() - 120_000))))));

	for (const row of pending) {
		if (row.question.gradingRule.kind !== 'short_text' || row.answer.response.kind !== 'short_text') continue;
		try {
			await enforceRateLimit(userId, 'ai_grade');
		} catch {
			await db.transaction(async (transaction) => {
				await transaction.update(gradingRuns).set({ status: 'needs_review', errorCode: 'application_rate_limited', errorMessage: 'AI grading rate limit reached.', completedAt: new Date() }).where(eq(gradingRuns.id, row.run.id));
				await transaction.update(attemptAnswers).set({ status: 'needs_review', feedback: 'Die automatische Bewertung ist derzeit ausgelastet. Bitte bewerte deine Antwort selbst.' }).where(eq(attemptAnswers.id, row.answer.id));
			});
			continue;
		}
		const claimed = await db.update(gradingRuns).set({ status: 'processing' }).where(and(eq(gradingRuns.id, row.run.id), or(eq(gradingRuns.status, 'pending'), and(eq(gradingRuns.status, 'processing'), lt(gradingRuns.createdAt, new Date(Date.now() - 120_000)))))).returning({ id: gradingRuns.id });
		if (!claimed.length) continue;
		const outcome = await gradeShortTextWithAi({
			prompt: row.question.prompt,
			learnerAnswer: row.answer.response.text,
			criteria: row.question.gradingRule.criteria,
			maximumPoints: row.question.maxPoints
		}, { transport: new GeminiTransport() });
		const completedAt = new Date();
		if (outcome.status === 'graded') {
			await db.transaction(async (transaction) => {
				await transaction.update(gradingRuns).set({ status: 'graded', result: outcome.grade, awardedPoints: outcome.grade.awardedPoints, feedback: outcome.grade.feedback, durationMs: outcome.latencyMs, attemptCount: outcome.attempts, completedAt }).where(eq(gradingRuns.id, row.run.id));
				await transaction.update(attemptAnswers).set({ status: 'graded', awardedPoints: outcome.grade.awardedPoints, feedback: outcome.grade.feedback }).where(eq(attemptAnswers.id, row.answer.id));
			});
		} else {
			await db.transaction(async (transaction) => {
				await transaction.update(gradingRuns).set({ status: 'needs_review', durationMs: outcome.latencyMs, attemptCount: outcome.attempts, errorCode: outcome.errorCode, errorMessage: outcome.errorMessage, completedAt }).where(eq(gradingRuns.id, row.run.id));
				await transaction.update(attemptAnswers).set({ status: 'needs_review', feedback: 'Die automatische Bewertung ist fehlgeschlagen. Bitte bewerte deine Antwort selbst.' }).where(eq(attemptAnswers.id, row.answer.id));
			});
		}
	}
	await finalizeAttemptIfReady(userId, attemptId);
}

/** Requeue provider failures so a learner is not forced to self-grade after a transient outage or model change. */
export async function retryAiGradesForAttempt(userId: string, attemptId: number) {
	const db = getDb();
	const retryable = await db.select({ runId: gradingRuns.id, answerId: attemptAnswers.id })
		.from(gradingRuns)
		.innerJoin(attemptAnswers, eq(attemptAnswers.id, gradingRuns.attemptAnswerId))
		.innerJoin(attemptTasks, eq(attemptTasks.id, attemptAnswers.attemptTaskId))
		.innerJoin(assessmentAttempts, eq(assessmentAttempts.id, attemptTasks.attemptId))
		.where(and(
			eq(assessmentAttempts.id, attemptId),
			eq(assessmentAttempts.userId, userId),
			eq(gradingRuns.method, 'ai'),
			eq(gradingRuns.status, 'needs_review'),
			eq(attemptAnswers.status, 'needs_review')
		));

	if (!retryable.length) return { retried: 0 };
	await db.transaction(async (transaction) => {
		for (const { runId, answerId } of retryable) {
			await transaction.update(gradingRuns).set({ status: 'pending', errorCode: null, errorMessage: null, completedAt: null }).where(eq(gradingRuns.id, runId));
			await transaction.update(attemptAnswers).set({ status: 'pending', feedback: 'Die automatische Bewertung wird erneut versucht.' }).where(eq(attemptAnswers.id, answerId));
		}
	});
	await processAiGradesForAttempt(userId, attemptId);
	return { retried: retryable.length };
}

export async function finalizeAttemptIfReady(userId: string, attemptId: number) {
	const db = getDb();
	const [summary] = await db.select({
		unresolved: sql<number>`count(*) filter (where ${attemptAnswers.status} in ('pending', 'processing', 'needs_review', 'failed'))::int`,
		score: sql<number>`coalesce(sum(${attemptAnswers.awardedPoints}), 0)::float`
	}).from(attemptAnswers).innerJoin(attemptTasks, eq(attemptTasks.id, attemptAnswers.attemptTaskId))
		.innerJoin(assessmentAttempts, eq(assessmentAttempts.id, attemptTasks.attemptId))
		.where(and(eq(assessmentAttempts.id, attemptId), eq(assessmentAttempts.userId, userId)));
	if (summary && summary.unresolved === 0) {
		await db.update(assessmentAttempts).set({ status: 'graded', score: sql`least(${assessmentAttempts.maxScore}, ${summary.score})` }).where(and(eq(assessmentAttempts.id, attemptId), eq(assessmentAttempts.userId, userId)));
	}
}

export async function selfGradeAnswer(userId: string, attemptId: number, answerId: number, awardedPoints: number) {
	return getDb().transaction(async (transaction) => {
		const [row] = await transaction.select({ answer: attemptAnswers, maximum: questions.maxPoints })
			.from(attemptAnswers).innerJoin(questions, eq(questions.id, attemptAnswers.questionId))
			.innerJoin(attemptTasks, eq(attemptTasks.id, attemptAnswers.attemptTaskId))
			.innerJoin(assessmentAttempts, eq(assessmentAttempts.id, attemptTasks.attemptId))
			.where(and(eq(attemptAnswers.id, answerId), eq(assessmentAttempts.id, attemptId), eq(assessmentAttempts.userId, userId))).for('update');
		if (!row || row.answer.status !== 'needs_review') throw new Error('Diese Antwort kann nicht selbst bewertet werden.');
		if (!Number.isFinite(awardedPoints) || awardedPoints < 0 || awardedPoints > row.maximum) throw new Error('Die Punktzahl liegt außerhalb des gültigen Bereichs.');
		const inputHash = gradingInputHash({ answerId, awardedPoints });
		await transaction.insert(gradingRuns).values({ attemptAnswerId: answerId, method: 'self', status: 'graded', provider: 'learner', model: null, graderSchemaVersion: 1, inputHash, result: { awardedPoints, matchedCriteria: [], feedback: 'Selbstbewertung', confidence: 1, needsReview: false }, awardedPoints, feedback: 'Vom Lernenden selbst bewertet.', durationMs: 0, completedAt: new Date() }).onConflictDoNothing();
		await transaction.update(attemptAnswers).set({ status: 'graded', awardedPoints, feedback: 'Von dir selbst bewertet.' }).where(eq(attemptAnswers.id, answerId));
	}).then(() => finalizeAttemptIfReady(userId, attemptId));
}
