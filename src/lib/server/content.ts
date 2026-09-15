import { and, asc, count, desc, eq, ilike, inArray } from 'drizzle-orm';
import type { Actor } from '$lib/server/authorization';
import { getDb } from '$lib/server/db';
import {
	assets, curricula, examSessions, historicalPeriods, questions, sources, tasks, taskVersionTopics,
	taskVersions, topics
} from '$lib/server/db/schema';
import type { z } from 'zod';
import { learnerQuestionSelection, toLearnerQuestion } from './learner-content';
import type { questionDraftSchema, sourceDraftSchema, taskMetadataSchema } from './content-validation';
import { questionDraftSchema as questionSchema, sourceDraftSchema as sourceSchema, validatePointTotal } from './content-validation';
import { newestUpdatedFirst } from './sorting';

type TaskMetadata = z.infer<typeof taskMetadataSchema>;
type SourceDraft = z.infer<typeof sourceDraftSchema>;
type QuestionDraft = z.infer<typeof questionDraftSchema>;

function assertAdmin(actor: Actor) {
	if (actor.profile.role !== 'admin') throw new Error('Administrator access is required.');
}

export async function getReferenceData() {
	const db = getDb();
	const [curriculumRows, periodRows, topicRows, sessionRows] = await Promise.all([
		db.select().from(curricula).orderBy(asc(curricula.name)),
		db.select().from(historicalPeriods).orderBy(asc(historicalPeriods.position), asc(historicalPeriods.name)),
		db.select().from(topics).orderBy(asc(topics.name)),
		db.select().from(examSessions).orderBy(desc(examSessions.year), asc(examSessions.session))
	]);
	return { curricula: curriculumRows, periods: periodRows, topics: topicRows, sessions: sessionRows };
}

export async function createTask(actor: Actor, metadata: TaskMetadata) {
	assertAdmin(actor);
	return getDb().transaction(async (transaction) => {
		const [task] = await transaction.insert(tasks).values({ slug: metadata.slug, createdBy: actor.userId }).returning({ id: tasks.id });
		const [version] = await transaction.insert(taskVersions).values({
			taskId: task.id, version: 1, title: metadata.title, instructions: metadata.instructions || null,
			curriculumId: metadata.curriculumId, periodId: metadata.periodId, examSessionId: metadata.examSessionId,
			examPosition: metadata.examPosition, maxPoints: metadata.maxPoints, createdBy: actor.userId
		}).returning({ id: taskVersions.id });
		return version;
	});
}

export async function listAdminTasks() {
	const rows = await getDb().select({
		taskId: tasks.id, slug: tasks.slug, taskStatus: tasks.status, versionId: taskVersions.id,
		version: taskVersions.version, versionStatus: taskVersions.status, title: taskVersions.title,
		updatedAt: taskVersions.updatedAt, curriculumId: taskVersions.curriculumId,
		periodId: taskVersions.periodId, year: examSessions.year, session: examSessions.session
	}).from(tasks).innerJoin(taskVersions, eq(taskVersions.taskId, tasks.id))
		.innerJoin(examSessions, eq(examSessions.id, taskVersions.examSessionId))
		.orderBy(desc(taskVersions.updatedAt), desc(taskVersions.version));
	const latest = new Map<number, (typeof rows)[number]>();
	for (const row of rows) if (!latest.has(row.taskId) || row.version > latest.get(row.taskId)!.version) latest.set(row.taskId, row);
	return [...latest.values()].sort(newestUpdatedFirst);
}

export interface AdminTaskFilters {
	query?: string;
	status?: 'draft' | 'published' | 'archived';
	curriculumId?: number;
	periodId?: number;
	topicId?: number;
	year?: number;
}

export async function listFilteredAdminTasks(filters: AdminTaskFilters) {
	const rows = await listAdminTasks();
	const versionIds = rows.map((row) => row.versionId);
	const topicRows = versionIds.length ? await getDb().select({ versionId: taskVersionTopics.taskVersionId, topicId: taskVersionTopics.topicId })
		.from(taskVersionTopics).where(inArray(taskVersionTopics.taskVersionId, versionIds)) : [];
	const normalizedQuery = filters.query?.toLocaleLowerCase('de');
	return rows.filter((row) => {
		if (normalizedQuery && !`${row.title} ${row.slug}`.toLocaleLowerCase('de').includes(normalizedQuery)) return false;
		if (filters.status === 'archived' && row.taskStatus !== 'archived') return false;
		if (filters.status === 'draft' && (row.taskStatus === 'archived' || row.versionStatus !== 'draft')) return false;
		if (filters.status === 'published' && (row.taskStatus === 'archived' || row.versionStatus !== 'published')) return false;
		if (filters.curriculumId && row.curriculumId !== filters.curriculumId) return false;
		if (filters.periodId && row.periodId !== filters.periodId) return false;
		if (filters.year && row.year !== filters.year) return false;
		if (filters.topicId && !topicRows.some((topic) => topic.versionId === row.versionId && topic.topicId === filters.topicId)) return false;
		return true;
	});
}

export async function getAdminTaskVersion(id: number) {
	const db = getDb();
	const [version] = await db.select({
		id: taskVersions.id, taskId: tasks.id, slug: tasks.slug, taskStatus: tasks.status,
		version: taskVersions.version, status: taskVersions.status, title: taskVersions.title,
		instructions: taskVersions.instructions, curriculumId: taskVersions.curriculumId,
		periodId: taskVersions.periodId, examSessionId: taskVersions.examSessionId,
		examPosition: taskVersions.examPosition, maxPoints: taskVersions.maxPoints, publishedAt: taskVersions.publishedAt
	}).from(taskVersions).innerJoin(tasks, eq(tasks.id, taskVersions.taskId)).where(eq(taskVersions.id, id));
	if (!version) return null;
	const [sourceRows, questionRows, topicRows] = await Promise.all([
		db.select().from(sources).where(eq(sources.taskVersionId, id)).orderBy(asc(sources.position)),
		db.select().from(questions).where(eq(questions.taskVersionId, id)).orderBy(asc(questions.position)),
		db.select({ topicId: taskVersionTopics.topicId }).from(taskVersionTopics).where(eq(taskVersionTopics.taskVersionId, id))
	]);
	return { ...version, sources: sourceRows, questions: questionRows, topicIds: topicRows.map((row) => row.topicId) };
}

export async function saveTaskDraft(actor: Actor, id: number, metadata: Omit<TaskMetadata, 'slug'>, topicIds: number[], sourceDrafts: SourceDraft[], questionDrafts: QuestionDraft[]) {
	assertAdmin(actor);
	return getDb().transaction(async (transaction) => {
		const [version] = await transaction.select({ status: taskVersions.status }).from(taskVersions).where(eq(taskVersions.id, id)).for('update');
		if (!version) throw new Error('Aufgabenversion nicht gefunden.');
		if (version.status !== 'draft') throw new Error('Nur Entwürfe können bearbeitet werden.');
		const pointError = validatePointTotal(metadata.maxPoints, questionDrafts);
		if (pointError) throw new Error(pointError);

		await transaction.update(taskVersions).set({
			title: metadata.title, instructions: metadata.instructions || null, curriculumId: metadata.curriculumId,
			periodId: metadata.periodId, examSessionId: metadata.examSessionId, examPosition: metadata.examPosition, maxPoints: metadata.maxPoints
		}).where(eq(taskVersions.id, id));
		await transaction.delete(taskVersionTopics).where(eq(taskVersionTopics.taskVersionId, id));
		await transaction.delete(sources).where(eq(sources.taskVersionId, id));
		await transaction.delete(questions).where(eq(questions.taskVersionId, id));
		await transaction.insert(taskVersionTopics).values(topicIds.map((topicId) => ({ taskVersionId: id, topicId })));
		await transaction.insert(sources).values(sourceDrafts.map((source, position) => ({
			taskVersionId: id, position, kind: source.kind, title: source.title || null,
			content: source.content ?? null, assetId: source.assetId ?? null
		})));
		await transaction.insert(questions).values(questionDrafts.map((question, position) => ({
			taskVersionId: id, position, kind: question.kind, prompt: question.prompt,
			config: question.config, gradingRule: question.gradingRule, maxPoints: question.maxPoints
		})));
	});
}

export async function publishTaskVersion(actor: Actor, id: number) {
	assertAdmin(actor);
	return getDb().transaction(async (transaction) => {
		const [version] = await transaction.select().from(taskVersions).where(eq(taskVersions.id, id)).for('update');
		if (!version) throw new Error('Aufgabenversion nicht gefunden.');
		if (version.status !== 'draft') throw new Error('Nur Entwürfe können veröffentlicht werden.');
		const [sourceRows, questionRows, topicRows] = await Promise.all([
			transaction.select().from(sources).where(eq(sources.taskVersionId, id)),
			transaction.select().from(questions).where(eq(questions.taskVersionId, id)),
			transaction.select().from(taskVersionTopics).where(eq(taskVersionTopics.taskVersionId, id))
		]);
		if (!sourceRows.length || !questionRows.length || !topicRows.length) throw new Error('Eine veröffentlichte Aufgabe benötigt mindestens eine Quelle, eine Frage und ein Thema.');
		for (const source of sourceRows) sourceSchema.parse(source);
		for (const question of questionRows) questionSchema.parse(question);
		const pointError = validatePointTotal(version.maxPoints, questionRows);
		if (pointError) throw new Error(pointError);

		await transaction.update(taskVersions).set({ status: 'retired' }).where(and(
			eq(taskVersions.taskId, version.taskId), eq(taskVersions.status, 'published')
		));
		await transaction.update(taskVersions).set({ status: 'published', publishedAt: new Date() }).where(eq(taskVersions.id, id));
		await transaction.update(tasks).set({ status: 'published' }).where(eq(tasks.id, version.taskId));
	});
}

export async function createDraftRevision(actor: Actor, sourceVersionId: number) {
	assertAdmin(actor);
	return getDb().transaction(async (transaction) => {
		const [sourceVersion] = await transaction.select().from(taskVersions).where(eq(taskVersions.id, sourceVersionId)).for('update');
		if (!sourceVersion) throw new Error('Aufgabenversion nicht gefunden.');
		const [existingDraft] = await transaction.select({ id: taskVersions.id }).from(taskVersions)
			.where(and(eq(taskVersions.taskId, sourceVersion.taskId), eq(taskVersions.status, 'draft'))).limit(1);
		if (existingDraft) return existingDraft;
		const [latest] = await transaction.select({ version: taskVersions.version }).from(taskVersions)
			.where(eq(taskVersions.taskId, sourceVersion.taskId)).orderBy(desc(taskVersions.version)).limit(1);
		const [draft] = await transaction.insert(taskVersions).values({
			taskId: sourceVersion.taskId, version: (latest?.version ?? 0) + 1, status: 'draft',
			title: sourceVersion.title, instructions: sourceVersion.instructions,
			curriculumId: sourceVersion.curriculumId, periodId: sourceVersion.periodId,
			examSessionId: sourceVersion.examSessionId, examPosition: sourceVersion.examPosition, maxPoints: sourceVersion.maxPoints,
			createdBy: actor.userId
		}).returning({ id: taskVersions.id });
		const [sourceRows, questionRows, topicRows] = await Promise.all([
			transaction.select().from(sources).where(eq(sources.taskVersionId, sourceVersionId)).orderBy(asc(sources.position)),
			transaction.select().from(questions).where(eq(questions.taskVersionId, sourceVersionId)).orderBy(asc(questions.position)),
			transaction.select().from(taskVersionTopics).where(eq(taskVersionTopics.taskVersionId, sourceVersionId))
		]);
		if (sourceRows.length) await transaction.insert(sources).values(sourceRows.map(({ id: _id, createdAt: _created, updatedAt: _updated, ...row }) => ({ ...row, taskVersionId: draft.id })));
		if (questionRows.length) await transaction.insert(questions).values(questionRows.map(({ id: _id, createdAt: _created, updatedAt: _updated, ...row }) => ({ ...row, taskVersionId: draft.id })));
		if (topicRows.length) await transaction.insert(taskVersionTopics).values(topicRows.map((row) => ({ taskVersionId: draft.id, topicId: row.topicId })));
		return draft;
	});
}

export async function archiveTask(actor: Actor, taskId: number) {
	assertAdmin(actor);
	const [task] = await getDb().update(tasks).set({ status: 'archived' }).where(eq(tasks.id, taskId)).returning({ id: tasks.id });
	if (!task) throw new Error('Aufgabe nicht gefunden.');
}

export async function restoreTask(actor: Actor, taskId: number) {
	assertAdmin(actor);
	const [published] = await getDb().select({ id: taskVersions.id }).from(taskVersions)
		.where(and(eq(taskVersions.taskId, taskId), eq(taskVersions.status, 'published'))).limit(1);
	const [task] = await getDb().update(tasks).set({ status: published ? 'published' : 'draft' }).where(eq(tasks.id, taskId)).returning({ id: tasks.id });
	if (!task) throw new Error('Aufgabe nicht gefunden.');
}

export async function getTaskValidationIssues(id: number) {
	const task = await getAdminTaskVersion(id);
	if (!task) return ['Aufgabe nicht gefunden.'];
	const issues: string[] = [];
	if (!task.topicIds.length) issues.push('Mindestens ein Thema fehlt.');
	if (!task.sources.length) issues.push('Mindestens eine Quelle fehlt.');
	if (!task.questions.length) issues.push('Mindestens eine Frage fehlt.');
	for (const [index, source] of task.sources.entries()) {
		const result = sourceSchema.safeParse(source);
		if (!result.success) issues.push(`Quelle ${index + 1}: ${result.error.issues.map((issue) => issue.message).join(' ')}`);
	}
	for (const [index, question] of task.questions.entries()) {
		const result = questionSchema.safeParse(question);
		if (!result.success) issues.push(`Frage ${index + 1}: ${result.error.issues.map((issue) => issue.message).join(' ')}`);
	}
	const pointError = validatePointTotal(task.maxPoints, task.questions);
	if (pointError) issues.push(pointError);
	return issues;
}

export async function getAdminDashboard() {
	const allTasks = await listAdminTasks();
	const drafts = allTasks.filter((task) => task.versionStatus === 'draft');
	const draftChecks = await Promise.all(drafts.map(async (task) => ({ ...task, issues: await getTaskValidationIssues(task.versionId) })));
	return {
		counts: {
			total: allTasks.length,
			drafts: drafts.length,
			published: allTasks.filter((task) => task.taskStatus === 'published').length,
			archived: allTasks.filter((task) => task.taskStatus === 'archived').length
		},
		problemDrafts: draftChecks.filter((task) => task.issues.length),
		recentlyPublished: allTasks.filter((task) => task.versionStatus === 'published').slice(0, 5)
	};
}

export async function listAssetRecords() {
	const db = getDb();
	const rows = await db.select({
		id: assets.id, bucket: assets.bucket, path: assets.path, mimeType: assets.mimeType,
		sizeBytes: assets.sizeBytes, altText: assets.altText, createdAt: assets.createdAt,
		updatedAt: assets.updatedAt, usageCount: count(sources.id)
	}).from(assets).leftJoin(sources, eq(sources.assetId, assets.id)).groupBy(assets.id).orderBy(desc(assets.createdAt));
	return rows;
}

export async function createAssetRecord(actor: Actor, input: { path: string; mimeType: string; sizeBytes: number; altText?: string }) {
	assertAdmin(actor);
	const [asset] = await getDb().insert(assets).values({ ...input, altText: input.altText || null, createdBy: actor.userId }).returning();
	return asset;
}

export async function updateAssetRecord(actor: Actor, id: number, altText: string | null) {
	assertAdmin(actor);
	const [asset] = await getDb().update(assets).set({ altText }).where(eq(assets.id, id)).returning();
	if (!asset) throw new Error('Asset nicht gefunden.');
	return asset;
}

export async function replaceAssetRecord(actor: Actor, id: number, input: { path: string; mimeType: string; sizeBytes: number; altText?: string }) {
	assertAdmin(actor);
	const [previous] = await getDb().select().from(assets).where(eq(assets.id, id));
	if (!previous) throw new Error('Asset nicht gefunden.');
	const [asset] = await getDb().update(assets).set({ ...input, altText: input.altText || null }).where(eq(assets.id, id)).returning();
	return { asset, previous };
}

export async function deleteAssetRecord(actor: Actor, id: number) {
	assertAdmin(actor);
	const [asset] = await getDb().select().from(assets).where(eq(assets.id, id));
	if (!asset) throw new Error('Asset nicht gefunden.');
	const [usage] = await getDb().select({ count: count() }).from(sources).where(eq(sources.assetId, id));
	if (usage.count > 0) throw new Error('Das Asset wird noch von einer Aufgabe verwendet.');
	await getDb().delete(assets).where(eq(assets.id, id));
	return asset;
}

export async function listPublishedTasks(filters: { query?: string; curriculumId?: number; periodId?: number; topicId?: number; year?: number; session?: 'spring' | 'autumn' }) {
	const db = getDb();
	const conditions = [eq(tasks.status, 'published'), eq(taskVersions.status, 'published')];
	if (filters.query) conditions.push(ilike(taskVersions.title, `%${filters.query}%`));
	if (filters.curriculumId) conditions.push(eq(taskVersions.curriculumId, filters.curriculumId));
	if (filters.periodId) conditions.push(eq(taskVersions.periodId, filters.periodId));
	if (filters.year) conditions.push(eq(examSessions.year, filters.year));
	if (filters.session) conditions.push(eq(examSessions.session, filters.session));

	let query = db.select({
		slug: tasks.slug, title: taskVersions.title, maxPoints: taskVersions.maxPoints,
		curriculum: curricula.name, period: historicalPeriods.name, year: examSessions.year,
		session: examSessions.session, versionId: taskVersions.id
	}).from(taskVersions)
		.innerJoin(tasks, eq(tasks.id, taskVersions.taskId))
		.innerJoin(curricula, eq(curricula.id, taskVersions.curriculumId))
		.innerJoin(historicalPeriods, eq(historicalPeriods.id, taskVersions.periodId))
		.innerJoin(examSessions, eq(examSessions.id, taskVersions.examSessionId));
	if (filters.topicId) {
		query = query.innerJoin(taskVersionTopics, and(eq(taskVersionTopics.taskVersionId, taskVersions.id), eq(taskVersionTopics.topicId, filters.topicId))) as typeof query;
	}
	const rows = await query.where(and(...conditions)).orderBy(desc(examSessions.year), asc(taskVersions.title));
	const ids = rows.map((row) => row.versionId);
	const topicRows = ids.length ? await db.select({ versionId: taskVersionTopics.taskVersionId, name: topics.name })
		.from(taskVersionTopics).innerJoin(topics, eq(topics.id, taskVersionTopics.topicId))
		.where(inArray(taskVersionTopics.taskVersionId, ids)).orderBy(asc(topics.name)) : [];
	return rows.map(({ versionId, ...row }) => ({ ...row, topics: topicRows.filter((topic) => topic.versionId === versionId).map((topic) => topic.name) }));
}

export async function getPublishedTask(slug: string) {
	const db = getDb();
	const [task] = await db.select({
		versionId: taskVersions.id, slug: tasks.slug, title: taskVersions.title, instructions: taskVersions.instructions,
		maxPoints: taskVersions.maxPoints, curriculum: curricula.name, period: historicalPeriods.name,
		year: examSessions.year, session: examSessions.session
	}).from(taskVersions)
		.innerJoin(tasks, and(eq(tasks.id, taskVersions.taskId), eq(tasks.status, 'published')))
		.innerJoin(curricula, eq(curricula.id, taskVersions.curriculumId))
		.innerJoin(historicalPeriods, eq(historicalPeriods.id, taskVersions.periodId))
		.innerJoin(examSessions, eq(examSessions.id, taskVersions.examSessionId))
		.where(and(eq(tasks.slug, slug), eq(taskVersions.status, 'published')));
	if (!task) return null;
	const [sourceRows, questionRows, topicRows] = await Promise.all([
		db.select({ id: sources.id, taskVersionId: sources.taskVersionId, position: sources.position, kind: sources.kind, title: sources.title, content: sources.content, assetId: sources.assetId, createdAt: sources.createdAt, updatedAt: sources.updatedAt, assetPath: assets.path, assetMimeType: assets.mimeType, assetAltText: assets.altText })
			.from(sources).leftJoin(assets, eq(assets.id, sources.assetId)).where(eq(sources.taskVersionId, task.versionId)).orderBy(asc(sources.position)),
		db.select(learnerQuestionSelection).from(questions).where(eq(questions.taskVersionId, task.versionId)).orderBy(asc(questions.position)),
		db.select({ name: topics.name }).from(taskVersionTopics).innerJoin(topics, eq(topics.id, taskVersionTopics.topicId)).where(eq(taskVersionTopics.taskVersionId, task.versionId)).orderBy(asc(topics.name))
	]);
	return { ...task, sources: sourceRows, questions: questionRows.map(toLearnerQuestion), topics: topicRows.map((row) => row.name) };
}
