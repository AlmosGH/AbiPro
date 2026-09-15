import { createHash } from 'node:crypto';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { gradeDeterministically, DETERMINISTIC_GRADER_SCHEMA_VERSION, type DeterministicGrade } from '$lib/grading/deterministic';
import { getDb } from '$lib/server/db';
import {
	assessmentAttempts, assets, attemptAnswers, attemptTasks, curricula, examSessions, gradingRuns,
	historicalPeriods, questions, sources, tasks, taskVersionTopics, taskVersions, topics
} from '$lib/server/db/schema';
import { learnerQuestionSelection, toLearnerQuestion } from '$lib/server/learner-content';
import type { AnswerPayload } from '$lib/types/questions';
import { isAiEligibleMiss, processAiGradesForAttempt, queueAiGrade } from '$lib/server/ai-grading.server';

export interface PracticeFilters {
	curriculumId?: number;
	periodId?: number;
	topicId?: number;
	onlyNotPracticed?: boolean;
	taskSlug?: string;
}

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (value && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonicalize(child)]));
	}
	return value;
}

export function deterministicInputHash(value: unknown) {
	return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

export function defaultUnanswered(kind: AnswerPayload['kind']): AnswerPayload {
	switch (kind) {
		case 'choice': return { kind, optionId: '__unanswered__' };
		case 'multiple_choice': return { kind, optionIds: [] };
		case 'matching': return { kind, pairs: [] };
		case 'ordering': return { kind, itemIds: [] };
		case 'short_text': return { kind, text: '' };
	}
}

export async function listResumablePracticeAttempts(userId: string) {
	return getDb().select({
		id: assessmentAttempts.id,
		title: taskVersions.title,
		startedAt: assessmentAttempts.startedAt,
		maxScore: assessmentAttempts.maxScore
	}).from(assessmentAttempts)
		.innerJoin(attemptTasks, eq(attemptTasks.attemptId, assessmentAttempts.id))
		.innerJoin(taskVersions, eq(taskVersions.id, attemptTasks.taskVersionId))
		.where(and(eq(assessmentAttempts.userId, userId), eq(assessmentAttempts.kind, 'practice'), eq(assessmentAttempts.status, 'in_progress')))
		.orderBy(desc(assessmentAttempts.startedAt));
}

export async function createPracticeAttempt(userId: string, filters: PracticeFilters) {
	return getDb().transaction(async (transaction) => {
		const conditions = [eq(tasks.status, 'published'), eq(taskVersions.status, 'published')];
		if (filters.curriculumId) conditions.push(eq(taskVersions.curriculumId, filters.curriculumId));
		if (filters.periodId) conditions.push(eq(taskVersions.periodId, filters.periodId));
		if (filters.taskSlug) conditions.push(eq(tasks.slug, filters.taskSlug));
		let query = transaction.select({ id: taskVersions.id, maxPoints: taskVersions.maxPoints }).from(taskVersions)
			.innerJoin(tasks, eq(tasks.id, taskVersions.taskId));
		if (filters.topicId) {
			query = query.innerJoin(taskVersionTopics, and(eq(taskVersionTopics.taskVersionId, taskVersions.id), eq(taskVersionTopics.topicId, filters.topicId))) as typeof query;
		}
		let candidates = await query.where(and(...conditions));

		if (filters.onlyNotPracticed && candidates.length) {
			const completed = await transaction.select({ taskVersionId: attemptTasks.taskVersionId }).from(attemptTasks)
				.innerJoin(assessmentAttempts, eq(assessmentAttempts.id, attemptTasks.attemptId))
				.where(and(eq(assessmentAttempts.userId, userId), eq(assessmentAttempts.kind, 'practice'), inArray(assessmentAttempts.status, ['submitted', 'graded'])));
			const practiced = new Set(completed.map((row) => row.taskVersionId));
			candidates = candidates.filter((candidate) => !practiced.has(candidate.id));
		}
		if (!candidates.length) throw new Error('Keine passende veröffentlichte Aufgabe gefunden.');
		const selected = candidates[Math.floor(Math.random() * candidates.length)];
		const [attempt] = await transaction.insert(assessmentAttempts).values({
			userId, kind: 'practice', maxScore: selected.maxPoints
		}).returning({ id: assessmentAttempts.id });
		await transaction.insert(attemptTasks).values({
			attemptId: attempt.id, taskVersionId: selected.id, position: 0, maxPoints: selected.maxPoints
		});
		return attempt;
	});
}

export async function getPracticeAttempt(userId: string, attemptId: number) {
	const db = getDb();
	const [attempt] = await db.select({
		id: assessmentAttempts.id, status: assessmentAttempts.status, startedAt: assessmentAttempts.startedAt,
		submittedAt: assessmentAttempts.submittedAt, score: assessmentAttempts.score, maxScore: assessmentAttempts.maxScore,
		attemptTaskId: attemptTasks.id, taskVersionId: attemptTasks.taskVersionId,
		slug: tasks.slug, title: taskVersions.title, instructions: taskVersions.instructions,
		curriculum: curricula.name, period: historicalPeriods.name, year: examSessions.year,
		session: examSessions.session
	}).from(assessmentAttempts)
		.innerJoin(attemptTasks, eq(attemptTasks.attemptId, assessmentAttempts.id))
		.innerJoin(taskVersions, eq(taskVersions.id, attemptTasks.taskVersionId))
		.innerJoin(tasks, eq(tasks.id, taskVersions.taskId))
		.innerJoin(curricula, eq(curricula.id, taskVersions.curriculumId))
		.innerJoin(historicalPeriods, eq(historicalPeriods.id, taskVersions.periodId))
		.innerJoin(examSessions, eq(examSessions.id, taskVersions.examSessionId))
		.where(and(eq(assessmentAttempts.id, attemptId), eq(assessmentAttempts.userId, userId), eq(assessmentAttempts.kind, 'practice')));
	if (!attempt) return null;

	const sourceRows = await db.select({
			id: sources.id, position: sources.position, kind: sources.kind, title: sources.title, content: sources.content,
			assetPath: assets.path, assetAltText: assets.altText
		}).from(sources).leftJoin(assets, eq(assets.id, sources.assetId))
			.where(eq(sources.taskVersionId, attempt.taskVersionId)).orderBy(asc(sources.position));
	const questionRows = await db.select(learnerQuestionSelection).from(questions).where(eq(questions.taskVersionId, attempt.taskVersionId)).orderBy(asc(questions.position));
	const answerRows = await db.select({
			id: attemptAnswers.id, questionId: attemptAnswers.questionId, response: attemptAnswers.response, lastSavedAt: attemptAnswers.lastSavedAt,
			status: attemptAnswers.status,
			awardedPoints: attemptAnswers.awardedPoints, feedback: attemptAnswers.feedback,
		}).from(attemptAnswers)
			.where(eq(attemptAnswers.attemptTaskId, attempt.attemptTaskId));
	const topicRows = await db.select({ name: topics.name }).from(taskVersionTopics).innerJoin(topics, eq(topics.id, taskVersionTopics.topicId))
			.where(eq(taskVersionTopics.taskVersionId, attempt.taskVersionId)).orderBy(asc(topics.name));
	const isSubmitted = attempt.status !== 'in_progress';
	return {
		...attempt,
		topics: topicRows.map((row) => row.name),
		sources: sourceRows,
		questions: questionRows.map(toLearnerQuestion),
		answers: answerRows.map((answer) => ({ questionId: answer.questionId, response: answer.response, lastSavedAt: answer.lastSavedAt })),
		results: isSubmitted ? answerRows.map((answer) => ({
			answerId: answer.id,
			questionId: answer.questionId,
			status: answer.status,
			score: answer.awardedPoints ?? 0,
			maximum: Number(questionRows.find((question) => question.id === answer.questionId)?.maxPoints ?? 0),
			correctness: (answer.status === 'needs_review' ? 'invalid' : Number(answer.awardedPoints) >= Number(questionRows.find((question) => question.id === answer.questionId)?.maxPoints ?? 0) ? 'correct' : answer.awardedPoints && answer.awardedPoints > 0 ? 'partial' : 'incorrect') as DeterministicGrade['correctness'],
			feedback: answer.feedback ?? ''
		})) : []
	};
}

export async function savePracticeAnswer(userId: string, attemptId: number, questionId: number, response: unknown) {
	return getDb().transaction(async (transaction) => {
		const [row] = await transaction.select({
			status: assessmentAttempts.status, attemptTaskId: attemptTasks.id, taskVersionId: attemptTasks.taskVersionId,
			kind: questions.kind, config: questions.config, gradingRule: questions.gradingRule, maxPoints: questions.maxPoints
		}).from(assessmentAttempts)
			.innerJoin(attemptTasks, eq(attemptTasks.attemptId, assessmentAttempts.id))
			.innerJoin(questions, and(eq(questions.id, questionId), eq(questions.taskVersionId, attemptTasks.taskVersionId)))
			.where(and(eq(assessmentAttempts.id, attemptId), eq(assessmentAttempts.userId, userId), eq(assessmentAttempts.kind, 'practice')))
			.for('update');
		if (!row) throw new Error('Frage gehört nicht zu diesem Übungsversuch.');
		if (row.status !== 'in_progress') throw new Error('Ein abgegebener Versuch kann nicht mehr geändert werden.');
		const validation = gradeDeterministically(row, response);
		if (validation.correctness === 'invalid') throw new Error(validation.feedback);
		const now = new Date();
		await transaction.insert(attemptAnswers).values({
			attemptTaskId: row.attemptTaskId, questionId, taskVersionId: row.taskVersionId,
			response: response as AnswerPayload, status: 'pending', lastSavedAt: now
		}).onConflictDoUpdate({
			target: [attemptAnswers.attemptTaskId, attemptAnswers.questionId],
			set: { response: response as AnswerPayload, status: 'pending', awardedPoints: null, feedback: null, lastSavedAt: now }
		});
		return { savedAt: now };
	});
}

export async function submitPracticeAttempt(userId: string, attemptId: number) {
	const prepared = await getDb().transaction(async (transaction) => {
		const [attempt] = await transaction.select({
			id: assessmentAttempts.id, status: assessmentAttempts.status, attemptTaskId: attemptTasks.id,
			taskVersionId: attemptTasks.taskVersionId, maxScore: assessmentAttempts.maxScore
		}).from(assessmentAttempts).innerJoin(attemptTasks, eq(attemptTasks.attemptId, assessmentAttempts.id))
			.where(and(eq(assessmentAttempts.id, attemptId), eq(assessmentAttempts.userId, userId), eq(assessmentAttempts.kind, 'practice')))
			.for('update');
		if (!attempt) throw new Error('Übungsversuch nicht gefunden.');
		if (attempt.status === 'graded') return { score: Number((await transaction.select({ score: assessmentAttempts.score }).from(assessmentAttempts).where(eq(assessmentAttempts.id, attemptId)))[0]?.score ?? 0), maximum: attempt.maxScore, hasAi: false };
		if (attempt.status === 'submitted') return { score: 0, maximum: attempt.maxScore, hasAi: true };
		if (attempt.status !== 'in_progress') throw new Error('Der Versuch wird bereits verarbeitet.');

		const questionRows = await transaction.select().from(questions)
			.where(eq(questions.taskVersionId, attempt.taskVersionId)).orderBy(asc(questions.position));
		const existing = await transaction.select().from(attemptAnswers).where(eq(attemptAnswers.attemptTaskId, attempt.attemptTaskId));
		const byQuestion = new Map(existing.map((answer) => [answer.questionId, answer]));
		let total = 0;
		let hasAi = false;
		for (const question of questionRows) {
			let answer = byQuestion.get(question.id);
			if (!answer) {
				[answer] = await transaction.insert(attemptAnswers).values({
					attemptTaskId: attempt.attemptTaskId, questionId: question.id, taskVersionId: attempt.taskVersionId,
					response: defaultUnanswered(question.kind), status: 'pending'
				}).returning();
			}
			const grade = gradeDeterministically(question, answer.response);
			if (isAiEligibleMiss(question, answer.response, grade.correctness === 'correct')) {
				hasAi = true;
				await queueAiGrade(transaction, answer.id, question, answer.response);
				continue;
			}
			const auditResult = {
				...grade,
				inputHash: deterministicInputHash({
					graderSchemaVersion: DETERMINISTIC_GRADER_SCHEMA_VERSION,
					question: { kind: question.kind, config: question.config, gradingRule: question.gradingRule, maxPoints: question.maxPoints },
					response: answer.response
				})
			};
			await transaction.insert(gradingRuns).values({
				attemptAnswerId: answer.id, method: 'deterministic', status: 'graded',
				graderSchemaVersion: DETERMINISTIC_GRADER_SCHEMA_VERSION, inputHash: auditResult.inputHash, result: auditResult,
				awardedPoints: grade.score, feedback: grade.feedback, durationMs: 0, completedAt: new Date()
			});
			await transaction.update(attemptAnswers).set({
				status: 'graded', awardedPoints: grade.score, feedback: grade.feedback
			}).where(eq(attemptAnswers.id, answer.id));
			total += grade.score;
		}
		const score = Math.min(attempt.maxScore, Math.round((total + Number.EPSILON) * 100) / 100);
		await transaction.update(assessmentAttempts).set({
			status: hasAi ? 'submitted' : 'graded', submittedAt: new Date(), score: hasAi ? null : score
		}).where(eq(assessmentAttempts.id, attempt.id));
		return { score, maximum: attempt.maxScore, hasAi };
	});
	if (prepared.hasAi) await processAiGradesForAttempt(userId, attemptId);
	const [current] = await getDb().select({ score: assessmentAttempts.score, status: assessmentAttempts.status }).from(assessmentAttempts).where(eq(assessmentAttempts.id, attemptId));
	return { score: Number(current?.score ?? prepared.score), maximum: prepared.maximum, pendingReview: current?.status === 'submitted' };
}

export async function getBestPracticeScore(userId: string, taskVersionId: number) {
	const rows = await getDb().select({ score: assessmentAttempts.score, maxScore: assessmentAttempts.maxScore })
		.from(assessmentAttempts).innerJoin(attemptTasks, eq(attemptTasks.attemptId, assessmentAttempts.id))
		.where(and(eq(assessmentAttempts.userId, userId), eq(assessmentAttempts.kind, 'practice'), eq(assessmentAttempts.status, 'graded'), eq(attemptTasks.taskVersionId, taskVersionId)))
		.orderBy(desc(assessmentAttempts.score)).limit(1);
	return rows[0] ?? null;
}
