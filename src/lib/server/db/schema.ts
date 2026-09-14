import { sql } from 'drizzle-orm';
import {
	bigint,
	check,
	index,
	integer,
	jsonb,
	numeric,
	pgSchema,
	primaryKey,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import type { AnswerPayload, GradingRule, QuestionConfig } from '$lib/types/questions';

export const appPrivate = pgSchema('app_private');

export const appRole = appPrivate.enum('app_role', ['learner', 'admin']);
export const taskStatus = appPrivate.enum('task_status', ['draft', 'published', 'archived']);
export const taskVersionStatus = appPrivate.enum('task_version_status', ['draft', 'published', 'retired']);
export const examSessionKind = appPrivate.enum('exam_session_kind', ['spring', 'autumn']);
export const sourceKind = appPrivate.enum('source_kind', ['text', 'image', 'table', 'map']);
export const questionKind = appPrivate.enum('question_kind', ['choice', 'multiple_choice', 'matching', 'ordering', 'short_text']);
export const assessmentKind = appPrivate.enum('assessment_kind', ['practice', 'mock_exam']);
export const assessmentStatus = appPrivate.enum('assessment_status', ['in_progress', 'submitted', 'graded', 'abandoned']);
export const gradingMethod = appPrivate.enum('grading_method', ['deterministic', 'ai']);
export const gradingStatus = appPrivate.enum('grading_status', ['pending', 'processing', 'graded', 'needs_review', 'failed']);

const createdAt = timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
const identity = (name = 'id') => bigint(name, { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity();

export const profiles = appPrivate.table('profiles', {
	id: uuid('id').primaryKey(),
	displayName: text('display_name'),
	role: appRole('role').notNull().default('learner'),
	createdAt,
	updatedAt
});

export const curricula = appPrivate.table('curricula', {
	id: identity(),
	code: text('code').notNull().unique(),
	name: text('name').notNull(),
	createdAt,
	updatedAt
});

export const historicalPeriods = appPrivate.table('historical_periods', {
	id: identity(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	position: integer('position').notNull(),
	createdAt,
	updatedAt
}, (table) => [check('historical_periods_position_check', sql`${table.position} >= 0`)]);

export const topics = appPrivate.table('topics', {
	id: identity(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	periodId: bigint('period_id', { mode: 'number' }).notNull().references(() => historicalPeriods.id, { onDelete: 'restrict' }),
	createdAt,
	updatedAt
}, (table) => [index('topics_period_id_idx').on(table.periodId)]);

export const examSessions = appPrivate.table('exam_sessions', {
	id: identity(),
	year: integer('year').notNull(),
	session: examSessionKind('session').notNull(),
	officialCode: text('official_code'),
	createdAt,
	updatedAt
}, (table) => [
	unique('exam_sessions_year_session_unique').on(table.year, table.session),
	check('exam_sessions_year_check', sql`${table.year} between 2000 and 2100`)
]);

export const tasks = appPrivate.table('tasks', {
	id: identity(),
	slug: text('slug').notNull().unique(),
	status: taskStatus('status').notNull().default('draft'),
	createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
	createdAt,
	updatedAt
}, (table) => [index('tasks_created_by_idx').on(table.createdBy)]);

export const taskVersions = appPrivate.table('task_versions', {
	id: identity(),
	taskId: bigint('task_id', { mode: 'number' }).notNull().references(() => tasks.id, { onDelete: 'cascade' }),
	version: integer('version').notNull(),
	status: taskVersionStatus('status').notNull().default('draft'),
	title: text('title').notNull(),
	instructions: text('instructions'),
	curriculumId: bigint('curriculum_id', { mode: 'number' }).notNull().references(() => curricula.id, { onDelete: 'restrict' }),
	periodId: bigint('period_id', { mode: 'number' }).notNull().references(() => historicalPeriods.id, { onDelete: 'restrict' }),
	examSessionId: bigint('exam_session_id', { mode: 'number' }).notNull().references(() => examSessions.id, { onDelete: 'restrict' }),
	maxPoints: numeric('max_points', { precision: 6, scale: 2, mode: 'number' }).notNull(),
	createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
	publishedAt: timestamp('published_at', { withTimezone: true }),
	createdAt,
	updatedAt
}, (table) => [
	unique('task_versions_task_id_version_unique').on(table.taskId, table.version),
	index('task_versions_task_id_idx').on(table.taskId),
	index('task_versions_curriculum_id_idx').on(table.curriculumId),
	index('task_versions_period_id_idx').on(table.periodId),
	index('task_versions_exam_session_id_idx').on(table.examSessionId),
	index('task_versions_created_by_idx').on(table.createdBy),
	uniqueIndex('task_versions_published_idx').on(table.taskId).where(sql`${table.status} = 'published'`),
	check('task_versions_version_check', sql`${table.version} > 0`),
	check('task_versions_max_points_check', sql`${table.maxPoints} > 0`),
	check('task_versions_published_at_check', sql`(${table.status} = 'published' and ${table.publishedAt} is not null) or ${table.status} <> 'published'`)
]);

export const taskVersionTopics = appPrivate.table('task_version_topics', {
	taskVersionId: bigint('task_version_id', { mode: 'number' }).notNull().references(() => taskVersions.id, { onDelete: 'cascade' }),
	topicId: bigint('topic_id', { mode: 'number' }).notNull().references(() => topics.id, { onDelete: 'restrict' })
}, (table) => [
	primaryKey({ columns: [table.taskVersionId, table.topicId] }),
	index('task_version_topics_topic_id_idx').on(table.topicId)
]);

export const assets = appPrivate.table('assets', {
	id: identity(),
	bucket: text('bucket').notNull().default('exam-assets'),
	path: text('path').notNull(),
	mimeType: text('mime_type').notNull(),
	sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
	altText: text('alt_text'),
	createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
	createdAt,
	updatedAt
}, (table) => [
	unique('assets_bucket_path_unique').on(table.bucket, table.path),
	index('assets_created_by_idx').on(table.createdBy),
	check('assets_size_bytes_check', sql`${table.sizeBytes} >= 0`)
]);

export const sources = appPrivate.table('sources', {
	id: identity(),
	taskVersionId: bigint('task_version_id', { mode: 'number' }).notNull().references(() => taskVersions.id, { onDelete: 'cascade' }),
	position: integer('position').notNull(),
	kind: sourceKind('kind').notNull(),
	title: text('title'),
	content: jsonb('content').$type<Record<string, unknown>>(),
	assetId: bigint('asset_id', { mode: 'number' }).references(() => assets.id, { onDelete: 'restrict' }),
	createdAt,
	updatedAt
}, (table) => [
	unique('sources_task_version_position_unique').on(table.taskVersionId, table.position),
	index('sources_task_version_id_idx').on(table.taskVersionId),
	index('sources_asset_id_idx').on(table.assetId),
	check('sources_position_check', sql`${table.position} >= 0`),
	check('sources_content_check', sql`${table.content} is not null or ${table.assetId} is not null`)
]);

export const questions = appPrivate.table('questions', {
	id: identity(),
	taskVersionId: bigint('task_version_id', { mode: 'number' }).notNull().references(() => taskVersions.id, { onDelete: 'cascade' }),
	position: integer('position').notNull(),
	kind: questionKind('kind').notNull(),
	prompt: text('prompt').notNull(),
	config: jsonb('config').$type<QuestionConfig>().notNull(),
	gradingRule: jsonb('grading_rule').$type<GradingRule>().notNull(),
	maxPoints: numeric('max_points', { precision: 6, scale: 2, mode: 'number' }).notNull(),
	createdAt,
	updatedAt
}, (table) => [
	unique('questions_task_version_position_unique').on(table.taskVersionId, table.position),
	index('questions_task_version_id_idx').on(table.taskVersionId),
	check('questions_position_check', sql`${table.position} >= 0`),
	check('questions_max_points_check', sql`${table.maxPoints} > 0`)
]);

export const assessmentAttempts = appPrivate.table('assessment_attempts', {
	id: identity(),
	userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	kind: assessmentKind('kind').notNull(),
	status: assessmentStatus('status').notNull().default('in_progress'),
	timeLimitSeconds: integer('time_limit_seconds'),
	startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
	expiresAt: timestamp('expires_at', { withTimezone: true }),
	submittedAt: timestamp('submitted_at', { withTimezone: true }),
	score: numeric('score', { precision: 7, scale: 2, mode: 'number' }),
	maxScore: numeric('max_score', { precision: 7, scale: 2, mode: 'number' }).notNull(),
	createdAt,
	updatedAt
}, (table) => [
	index('assessment_attempts_user_id_idx').on(table.userId),
	index('assessment_attempts_user_active_idx').on(table.userId, table.startedAt).where(sql`${table.status} = 'in_progress'`),
	check('assessment_attempts_time_limit_check', sql`${table.timeLimitSeconds} is null or ${table.timeLimitSeconds} > 0`),
	check('assessment_attempts_max_score_check', sql`${table.maxScore} > 0`),
	check('assessment_attempts_score_check', sql`${table.score} is null or (${table.score} >= 0 and ${table.score} <= ${table.maxScore})`),
	check('assessment_attempts_expiry_check', sql`${table.expiresAt} is null or ${table.expiresAt} > ${table.startedAt}`)
]);

export const attemptTasks = appPrivate.table('attempt_tasks', {
	id: identity(),
	attemptId: bigint('attempt_id', { mode: 'number' }).notNull().references(() => assessmentAttempts.id, { onDelete: 'cascade' }),
	taskVersionId: bigint('task_version_id', { mode: 'number' }).notNull().references(() => taskVersions.id, { onDelete: 'restrict' }),
	position: integer('position').notNull(),
	maxPoints: numeric('max_points', { precision: 6, scale: 2, mode: 'number' }).notNull(),
	createdAt
}, (table) => [
	unique('attempt_tasks_attempt_position_unique').on(table.attemptId, table.position),
	unique('attempt_tasks_attempt_version_unique').on(table.attemptId, table.taskVersionId),
	index('attempt_tasks_attempt_id_idx').on(table.attemptId),
	index('attempt_tasks_task_version_id_idx').on(table.taskVersionId),
	check('attempt_tasks_position_check', sql`${table.position} >= 0`),
	check('attempt_tasks_max_points_check', sql`${table.maxPoints} > 0`)
]);

export const attemptAnswers = appPrivate.table('attempt_answers', {
	id: identity(),
	attemptTaskId: bigint('attempt_task_id', { mode: 'number' }).notNull().references(() => attemptTasks.id, { onDelete: 'cascade' }),
	questionId: bigint('question_id', { mode: 'number' }).notNull().references(() => questions.id, { onDelete: 'restrict' }),
	response: jsonb('response').$type<AnswerPayload>().notNull(),
	status: gradingStatus('status').notNull().default('pending'),
	awardedPoints: numeric('awarded_points', { precision: 6, scale: 2, mode: 'number' }),
	feedback: text('feedback'),
	lastSavedAt: timestamp('last_saved_at', { withTimezone: true }).notNull().defaultNow(),
	createdAt,
	updatedAt
}, (table) => [
	unique('attempt_answers_attempt_task_question_unique').on(table.attemptTaskId, table.questionId),
	index('attempt_answers_attempt_task_id_idx').on(table.attemptTaskId),
	index('attempt_answers_question_id_idx').on(table.questionId),
	check('attempt_answers_awarded_points_check', sql`${table.awardedPoints} is null or ${table.awardedPoints} >= 0`)
]);

export const gradingRuns = appPrivate.table('grading_runs', {
	id: identity(),
	attemptAnswerId: bigint('attempt_answer_id', { mode: 'number' }).notNull().references(() => attemptAnswers.id, { onDelete: 'cascade' }),
	method: gradingMethod('method').notNull(),
	status: gradingStatus('status').notNull().default('pending'),
	provider: text('provider'),
	model: text('model'),
	graderSchemaVersion: integer('grader_schema_version').notNull().default(1),
	result: jsonb('result').$type<Record<string, unknown>>(),
	awardedPoints: numeric('awarded_points', { precision: 6, scale: 2, mode: 'number' }),
	feedback: text('feedback'),
	durationMs: integer('duration_ms'),
	errorCode: text('error_code'),
	errorMessage: text('error_message'),
	createdAt,
	completedAt: timestamp('completed_at', { withTimezone: true })
}, (table) => [
	index('grading_runs_attempt_answer_id_idx').on(table.attemptAnswerId),
	index('grading_runs_pending_idx').on(table.createdAt).where(sql`${table.status} in ('pending', 'processing')`),
	check('grading_runs_schema_version_check', sql`${table.graderSchemaVersion} > 0`),
	check('grading_runs_awarded_points_check', sql`${table.awardedPoints} is null or ${table.awardedPoints} >= 0`),
	check('grading_runs_duration_check', sql`${table.durationMs} is null or ${table.durationMs} >= 0`)
]);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
