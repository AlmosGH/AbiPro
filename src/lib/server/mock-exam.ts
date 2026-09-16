import { and, asc, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { DETERMINISTIC_GRADER_SCHEMA_VERSION, gradeDeterministically, validateAnswerDraft, type DeterministicGrade } from '$lib/grading/deterministic';
import { MOCK_EXAM_CONFIG } from '$lib/exam/config';
import { inspectExamPool, selectExamTasks, type ExamCandidate } from '$lib/exam/selection';
import { deterministicInputHash, defaultUnanswered } from '$lib/server/practice';
import { getDb } from '$lib/server/db';
import { asDatabaseDate } from '$lib/server/database-time';
import {
	assessmentAttempts, assets, attemptAnswers, attemptTasks, curricula, examSessions, gradingRuns,
	historicalPeriods, questions, sources, tasks, taskVersionTopics, taskVersions, topics
} from '$lib/server/db/schema';
import { learnerQuestionSelection, toLearnerQuestion } from '$lib/server/learner-content';
import type { AnswerPayload } from '$lib/types/questions';
import { isAiEligibleMiss, processAiGradesForAttempt, queueAiGrade } from '$lib/server/ai-grading.server';

const eligibleConditions = () => and(
	eq(tasks.status, 'published'),
	eq(taskVersions.status, 'published'),
	inArray(taskVersions.examPosition, MOCK_EXAM_CONFIG.distribution.map((rule) => rule.position))
);

function asCandidates(rows: { taskVersionId: number; taskId: number; examPosition: number | null; maxPoints: number }[]): ExamCandidate[] {
	return rows.flatMap((row) => row.examPosition === null ? [] : [{ ...row, examPosition: row.examPosition }]);
}

async function queryCandidates(database: ReturnType<typeof getDb>) {
	return asCandidates(await database.select({
		taskVersionId: taskVersions.id,
		taskId: tasks.id,
		examPosition: taskVersions.examPosition,
		maxPoints: taskVersions.maxPoints
	}).from(taskVersions)
		.innerJoin(tasks, eq(tasks.id, taskVersions.taskId))
		.innerJoin(curricula, eq(curricula.id, taskVersions.curriculumId))
		.innerJoin(examSessions, eq(examSessions.id, taskVersions.examSessionId))
		.where(eligibleConditions()));
}

export async function getMockExamReadiness() {
	return inspectExamPool(await queryCandidates(getDb()), MOCK_EXAM_CONFIG);
}

export async function getActiveMockExam(userId: string) {
	const rows = await getDb().select({
		id: assessmentAttempts.id,
		startedAt: assessmentAttempts.startedAt,
		expiresAt: assessmentAttempts.expiresAt
	}).from(assessmentAttempts).where(and(
		eq(assessmentAttempts.userId, userId),
		eq(assessmentAttempts.kind, 'mock_exam'),
		eq(assessmentAttempts.status, 'in_progress')
	)).orderBy(desc(assessmentAttempts.startedAt)).limit(1);
	return rows[0] ?? null;
}

export async function createMockExamAttempt(userId: string) {
	return getDb().transaction(async (transaction) => {
		await transaction.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`mock-exam:${userId}`}, 0))`);
		const [active] = await transaction.select({ id: assessmentAttempts.id }).from(assessmentAttempts).where(and(
			eq(assessmentAttempts.userId, userId),
			eq(assessmentAttempts.kind, 'mock_exam'),
			eq(assessmentAttempts.status, 'in_progress')
		)).orderBy(desc(assessmentAttempts.startedAt)).limit(1);
		if (active) return active;

		const candidates = asCandidates(await transaction.select({
			taskVersionId: taskVersions.id,
			taskId: tasks.id,
			examPosition: taskVersions.examPosition,
			maxPoints: taskVersions.maxPoints
		}).from(taskVersions)
			.innerJoin(tasks, eq(tasks.id, taskVersions.taskId))
			.innerJoin(curricula, eq(curricula.id, taskVersions.curriculumId))
			.innerJoin(examSessions, eq(examSessions.id, taskVersions.examSessionId))
			.where(eligibleConditions()));
		const selected = selectExamTasks(candidates, MOCK_EXAM_CONFIG);
		const [attempt] = await transaction.insert(assessmentAttempts).values({
			userId,
			kind: 'mock_exam',
			timeLimitSeconds: MOCK_EXAM_CONFIG.timeLimitSeconds,
			startedAt: sql`clock_timestamp()`,
			expiresAt: sql`clock_timestamp() + (${MOCK_EXAM_CONFIG.timeLimitSeconds} * interval '1 second')`,
			maxScore: MOCK_EXAM_CONFIG.targetMaximumScore
		}).returning({ id: assessmentAttempts.id });
		await transaction.insert(attemptTasks).values(selected.map((candidate, position) => ({
			attemptId: attempt.id,
			taskVersionId: candidate.taskVersionId,
			position,
			maxPoints: candidate.maxPoints
		})));
		return attempt;
	});
}

async function finalizeMockExam(userId: string, attemptId: number, onlyIfExpired: boolean) {
	const prepared = await getDb().transaction(async (transaction) => {
		const [attempt] = await transaction.select({
			id: assessmentAttempts.id,
			status: assessmentAttempts.status,
			expiresAt: assessmentAttempts.expiresAt,
			maxScore: assessmentAttempts.maxScore,
			score: assessmentAttempts.score
		}).from(assessmentAttempts).where(and(
			eq(assessmentAttempts.id, attemptId),
			eq(assessmentAttempts.userId, userId),
			eq(assessmentAttempts.kind, 'mock_exam')
		)).for('update');
		if (!attempt) return null;
		if (attempt.status === 'graded') return { score: Number(attempt.score ?? 0), maximum: attempt.maxScore, hasAi: false };
		if (attempt.status === 'submitted') return { score: Number(attempt.score ?? 0), maximum: attempt.maxScore, hasAi: true };
		if (attempt.status !== 'in_progress') throw new Error('Die Prüfung wird bereits verarbeitet.');
		const clockRows = await transaction.execute(sql`select clock_timestamp() as "serverNow"`);
		const serverNow = asDatabaseDate(clockRows[0].serverNow);
		const expired = Boolean(attempt.expiresAt && serverNow.getTime() >= attempt.expiresAt.getTime());
		if (onlyIfExpired && !expired) return null;

		const questionRows = await transaction.select({
			attemptTaskId: attemptTasks.id,
			taskVersionId: attemptTasks.taskVersionId,
			question: questions
		}).from(attemptTasks).innerJoin(questions, eq(questions.taskVersionId, attemptTasks.taskVersionId))
			.where(eq(attemptTasks.attemptId, attemptId))
			.orderBy(asc(attemptTasks.position), asc(questions.position));
		const existing = await transaction.select().from(attemptAnswers)
			.innerJoin(attemptTasks, eq(attemptTasks.id, attemptAnswers.attemptTaskId))
			.where(eq(attemptTasks.attemptId, attemptId));
		const byQuestion = new Map(existing.map((row) => [row.attempt_answers.questionId, row.attempt_answers]));
		let total = 0;
		let hasAi = false;
		for (const row of questionRows) {
			let answer = byQuestion.get(row.question.id);
			let grade: DeterministicGrade;
			if (!answer) {
				[answer] = await transaction.insert(attemptAnswers).values({
					attemptTaskId: row.attemptTaskId,
					questionId: row.question.id,
					taskVersionId: row.taskVersionId,
					response: defaultUnanswered(row.question.kind),
					status: 'pending'
				}).returning();
				grade = { score: 0, maximum: row.question.maxPoints, correctness: 'incorrect', feedback: 'Nicht beantwortet.' };
			} else {
				grade = gradeDeterministically(row.question, answer.response);
			}
			if (isAiEligibleMiss(row.question, answer.response, grade.correctness === 'correct')) {
				hasAi = true;
				await queueAiGrade(transaction, answer.id, row.question, answer.response);
				continue;
			}
			const result = {
				...grade,
				inputHash: deterministicInputHash({
					graderSchemaVersion: DETERMINISTIC_GRADER_SCHEMA_VERSION,
					question: { kind: row.question.kind, config: row.question.config, gradingRule: row.question.gradingRule, maxPoints: row.question.maxPoints },
					response: answer.response
				})
			};
			await transaction.insert(gradingRuns).values({
				attemptAnswerId: answer.id,
				method: 'deterministic',
				status: 'graded',
				graderSchemaVersion: DETERMINISTIC_GRADER_SCHEMA_VERSION,
				inputHash: result.inputHash,
				result,
				awardedPoints: grade.score,
				feedback: grade.feedback,
				durationMs: 0,
				completedAt: serverNow
			});
			await transaction.update(attemptAnswers).set({ status: 'graded', awardedPoints: grade.score, feedback: grade.feedback })
				.where(eq(attemptAnswers.id, answer.id));
			total += grade.score;
		}
		const score = Math.min(attempt.maxScore, Math.round((total + Number.EPSILON) * 100) / 100);
		await transaction.update(assessmentAttempts).set({ status: hasAi ? 'submitted' : 'graded', submittedAt: serverNow, score: hasAi ? null : score })
			.where(eq(assessmentAttempts.id, attempt.id));
		return { score, maximum: attempt.maxScore, hasAi };
	});
	if (prepared?.hasAi) await processAiGradesForAttempt(userId, attemptId);
	return prepared;
}

export function submitMockExam(userId: string, attemptId: number) {
	return finalizeMockExam(userId, attemptId, false);
}

export function finalizeExpiredMockExam(userId: string, attemptId: number) {
	return finalizeMockExam(userId, attemptId, true);
}

export async function saveMockExamAnswer(userId: string, attemptId: number, questionId: number, response: unknown) {
	return getDb().transaction(async (transaction) => {
		const [attempt] = await transaction.select({
			status: assessmentAttempts.status,
			expiresAt: assessmentAttempts.expiresAt
		}).from(assessmentAttempts).where(and(
			eq(assessmentAttempts.id, attemptId),
			eq(assessmentAttempts.userId, userId),
			eq(assessmentAttempts.kind, 'mock_exam')
		)).for('update');
		if (!attempt) throw new Error('Prüfungsversuch nicht gefunden.');
		const clockRows = await transaction.execute(sql`select clock_timestamp() as "serverNow"`);
		const serverNow = asDatabaseDate(clockRows[0].serverNow);
		if (attempt.status !== 'in_progress' || !attempt.expiresAt || serverNow.getTime() >= attempt.expiresAt.getTime()) {
			throw new Error('Die Bearbeitungszeit ist abgelaufen. Antworten können nicht mehr geändert werden.');
		}
		const [row] = await transaction.select({
			attemptTaskId: attemptTasks.id,
			taskVersionId: attemptTasks.taskVersionId,
			kind: questions.kind,
			config: questions.config,
			gradingRule: questions.gradingRule,
			maxPoints: questions.maxPoints
		}).from(attemptTasks)
			.innerJoin(questions, and(eq(questions.id, questionId), eq(questions.taskVersionId, attemptTasks.taskVersionId)))
			.where(eq(attemptTasks.attemptId, attemptId));
		if (!row) throw new Error('Frage gehört nicht zu diesem Prüfungsversuch.');
		const validation = validateAnswerDraft(row, response);
		if (!validation.success) throw new Error(validation.message);
		await transaction.insert(attemptAnswers).values({
			attemptTaskId: row.attemptTaskId,
			questionId,
			taskVersionId: row.taskVersionId,
			response: validation.data,
			status: 'pending',
			lastSavedAt: serverNow
		}).onConflictDoUpdate({
			target: [attemptAnswers.attemptTaskId, attemptAnswers.questionId],
			set: { response: validation.data, status: 'pending', awardedPoints: null, feedback: null, lastSavedAt: serverNow }
		});
		return { savedAt: serverNow };
	});
}

export async function getMockExamAttempt(userId: string, attemptId: number) {
	await finalizeExpiredMockExam(userId, attemptId);
	const db = getDb();
	const [attempt] = await db.select({
		id: assessmentAttempts.id,
		status: assessmentAttempts.status,
		startedAt: assessmentAttempts.startedAt,
		expiresAt: assessmentAttempts.expiresAt,
		submittedAt: assessmentAttempts.submittedAt,
		timeLimitSeconds: assessmentAttempts.timeLimitSeconds,
		score: assessmentAttempts.score,
		maxScore: assessmentAttempts.maxScore,
		serverNow: sql<Date>`clock_timestamp()`
	}).from(assessmentAttempts).where(and(
		eq(assessmentAttempts.id, attemptId),
		eq(assessmentAttempts.userId, userId),
		eq(assessmentAttempts.kind, 'mock_exam')
	));
	if (!attempt) return null;
	attempt.serverNow = asDatabaseDate(attempt.serverNow);
	const taskRows = await db.select({
		attemptTaskId: attemptTasks.id,
		position: attemptTasks.position,
		taskVersionId: attemptTasks.taskVersionId,
		maxPoints: attemptTasks.maxPoints,
		slug: tasks.slug,
		title: taskVersions.title,
		instructions: taskVersions.instructions,
		curriculum: curricula.name,
		period: historicalPeriods.name,
		year: examSessions.year,
		session: examSessions.session
	}).from(attemptTasks)
		.innerJoin(taskVersions, eq(taskVersions.id, attemptTasks.taskVersionId))
		.innerJoin(tasks, eq(tasks.id, taskVersions.taskId))
		.innerJoin(curricula, eq(curricula.id, taskVersions.curriculumId))
		.innerJoin(historicalPeriods, eq(historicalPeriods.id, taskVersions.periodId))
		.innerJoin(examSessions, eq(examSessions.id, taskVersions.examSessionId))
		.where(eq(attemptTasks.attemptId, attemptId)).orderBy(asc(attemptTasks.position));
	const versionIds = taskRows.map((row) => row.taskVersionId);
	const attemptTaskIds = taskRows.map((row) => row.attemptTaskId);
	const sourceRows = await db.select({ id: sources.id, taskVersionId: sources.taskVersionId, position: sources.position, kind: sources.kind, title: sources.title, content: sources.content, assetPath: assets.path, assetAltText: assets.altText })
			.from(sources).leftJoin(assets, eq(assets.id, sources.assetId)).where(inArray(sources.taskVersionId, versionIds)).orderBy(asc(sources.position));
	const questionRows = await db.select({ ...learnerQuestionSelection, taskVersionId: questions.taskVersionId }).from(questions).where(inArray(questions.taskVersionId, versionIds)).orderBy(asc(questions.position));
	const answerRows = await db.select({ id: attemptAnswers.id, questionId: attemptAnswers.questionId, attemptTaskId: attemptAnswers.attemptTaskId, response: attemptAnswers.response, lastSavedAt: attemptAnswers.lastSavedAt, status: attemptAnswers.status, awardedPoints: attemptAnswers.awardedPoints, feedback: attemptAnswers.feedback })
			.from(attemptAnswers)
			.where(inArray(attemptAnswers.attemptTaskId, attemptTaskIds));
	const topicRows = await db.select({ taskVersionId: taskVersionTopics.taskVersionId, name: topics.name }).from(taskVersionTopics).innerJoin(topics, eq(topics.id, taskVersionTopics.topicId))
			.where(inArray(taskVersionTopics.taskVersionId, versionIds)).orderBy(asc(topics.name));
	const submitted = attempt.status !== 'in_progress';
	return {
		...attempt,
		tasks: taskRows.map((task) => ({
			...task,
			topics: topicRows.filter((row) => row.taskVersionId === task.taskVersionId).map((row) => row.name),
			sources: sourceRows.filter((row) => row.taskVersionId === task.taskVersionId),
			questions: questionRows.filter((row) => row.taskVersionId === task.taskVersionId).map(toLearnerQuestion),
			answers: answerRows.filter((row) => row.attemptTaskId === task.attemptTaskId).map(({ questionId, response, lastSavedAt }) => ({ questionId, response, lastSavedAt })),
			results: submitted ? answerRows.filter((row) => row.attemptTaskId === task.attemptTaskId).map((answer) => ({
				answerId: answer.id,
				questionId: answer.questionId,
				status: answer.status,
				score: answer.awardedPoints ?? 0,
				maximum: Number(questionRows.find((question) => question.id === answer.questionId)?.maxPoints ?? 0),
				correctness: (answer.status === 'needs_review' ? 'invalid' : Number(answer.awardedPoints) >= Number(questionRows.find((question) => question.id === answer.questionId)?.maxPoints ?? 0) ? 'correct' : answer.awardedPoints && answer.awardedPoints > 0 ? 'partial' : 'incorrect') as DeterministicGrade['correctness'],
				feedback: answer.feedback ?? ''
			})) : []
		}))
	};
}
