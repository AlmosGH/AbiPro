import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

type PreparedTask = {
	number: number;
	slug: string;
	title: string;
	maximumPoints: number;
	curriculumCode: string;
	curriculumName: string;
	imagePaths: string[];
	rubric: string;
};

type PreparedExam = {
	year: number;
	session: 'spring' | 'autumn';
	sourceFolder: string;
	tasks: PreparedTask[];
};

type Manifest = { exams: PreparedExam[]; failures: { folder: string; error: string }[] };

const connectionString = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!connectionString || !supabaseUrl || !secretKey) {
	throw new Error('DATABASE_MIGRATION_URL, PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.');
}

const importRoot = join(process.cwd(), 'tmp', 'real-exam-import');
const manifest = JSON.parse(await readFile(join(importRoot, 'manifest.json'), 'utf8')) as Manifest;
if (manifest.failures.length || manifest.exams.length !== 39 || manifest.exams.some((exam) => exam.tasks.length !== 12)) {
	throw new Error(`Refusing incomplete import: exams=${manifest.exams.length}, failures=${manifest.failures.length}.`);
}

const expectedTasks = manifest.exams.length * 12;
const storage = createClient(supabaseUrl, secretKey, {
	auth: { persistSession: false, autoRefreshToken: false }
}).storage.from('exam-assets');

async function uploadTaskImages(exam: PreparedExam, task: PreparedTask) {
	const uploaded: { localPath: string; objectPath: string; sizeBytes: number }[] = [];
	for (const localPath of task.imagePaths) {
		const bytes = await readFile(join(importRoot, 'images', localPath));
		const objectPath = `official-exams/${localPath}`;
		const { error } = await storage.upload(objectPath, bytes, {
			contentType: 'image/webp',
			cacheControl: '31536000',
			upsert: true
		});
		if (error) throw new Error(`Upload failed for ${objectPath}: ${error.message}`);
		uploaded.push({ localPath, objectPath, sizeBytes: bytes.byteLength });
	}
	return { exam, task, uploaded };
}

const work = manifest.exams.flatMap((exam) => exam.tasks.map((task) => ({ exam, task })));
const uploadedTasks: Awaited<ReturnType<typeof uploadTaskImages>>[] = [];
for (let index = 0; index < work.length; index += 4) {
	uploadedTasks.push(...await Promise.all(work.slice(index, index + 4).map(({ exam, task }) => uploadTaskImages(exam, task))));
	if ((index + 4) % 48 === 0 || index + 4 >= work.length) {
		console.log(`Uploaded ${Math.min(index + 4, work.length)}/${work.length} task image sets.`);
	}
}

const positionMetadata = [
	['altertum-weltgeschichte', 'Altertum – Weltgeschichte', 'altertum', 'Altertum', 10],
	['mittelalter-weltgeschichte', 'Mittelalter – Weltgeschichte', 'mittelalter', 'Mittelalter', 20],
	['mittelalter-ungarn', 'Mittelalter – ungarische Geschichte', 'mittelalter', 'Mittelalter', 20],
	['fruehe-neuzeit-weltgeschichte', 'Frühe Neuzeit – Weltgeschichte', 'fruehe-neuzeit', 'Frühe Neuzeit', 30],
	['fruehe-neuzeit-ungarn', 'Frühe Neuzeit – ungarische Geschichte', 'fruehe-neuzeit', 'Frühe Neuzeit', 30],
	['neunzehntes-jahrhundert-weltgeschichte', '19. Jahrhundert – Weltgeschichte', 'neunzehntes-jahrhundert', 'Das 19. Jahrhundert', 40],
	['neunzehntes-jahrhundert-ungarn', '19. Jahrhundert – ungarische Geschichte', 'neunzehntes-jahrhundert', 'Das 19. Jahrhundert', 40],
	['zwanzigstes-jahrhundert-weltgeschichte', '20. Jahrhundert – Weltgeschichte', 'zwanzigstes-jahrhundert', 'Das 20. Jahrhundert', 50],
	['zwanzigstes-jahrhundert-ungarn', '20. Jahrhundert – ungarische Geschichte', 'zwanzigstes-jahrhundert', 'Das 20. Jahrhundert', 50],
	['nach-1945-weltgeschichte', 'Nach 1945 – Weltgeschichte', 'nach-1945', 'Nach 1945', 60],
	['nach-1945-ungarn', 'Nach 1945 – ungarische Geschichte', 'nach-1945', 'Nach 1945', 60],
	['gesellschaft-und-gegenwart', 'Gesellschaft und Gegenwart', 'gegenwart', 'Gegenwart', 70]
] as const;

const sql = postgres(connectionString, { max: 1, prepare: false });
try {
	await sql.begin(async (transaction) => {
		await transaction`set local session_replication_role = replica`;
		await transaction`delete from app_private.assessment_attempts`;
		await transaction`delete from app_private.rate_limit_events`;
		await transaction`delete from app_private.tasks`;
		await transaction`delete from app_private.assets`;
		await transaction`delete from app_private.topics`;
		await transaction`delete from app_private.historical_periods`;
		await transaction`delete from app_private.exam_sessions`;
		await transaction`set local session_replication_role = origin`;

		const periodIds = new Map<string, number>();
		const topicIds = new Map<number, number>();
		for (const [position, metadata] of positionMetadata.entries()) {
			const [topicSlug, topicName, periodSlug, periodName, periodPosition] = metadata;
			let periodId = periodIds.get(periodSlug);
			if (!periodId) {
				const [period] = await transaction<{ id: number }[]>`
					insert into app_private.historical_periods (slug, name, position)
					values (${periodSlug}, ${periodName}, ${periodPosition}) returning id
				`;
				periodId = period.id;
				periodIds.set(periodSlug, periodId);
			}
			const [topic] = await transaction<{ id: number }[]>`
				insert into app_private.topics (slug, name, period_id)
				values (${topicSlug}, ${topicName}, ${periodId}) returning id
			`;
			topicIds.set(position + 1, topic.id);
		}

		const curriculumIds = new Map<string, number>();
		for (const exam of manifest.exams) {
			const firstTask = exam.tasks[0];
			if (!curriculumIds.has(firstTask.curriculumCode)) {
				const [curriculum] = await transaction<{ id: number }[]>`
					insert into app_private.curricula (code, name) values (${firstTask.curriculumCode}, ${firstTask.curriculumName})
					on conflict (code) do update set name = excluded.name returning id
				`;
				curriculumIds.set(firstTask.curriculumCode, curriculum.id);
			}
			const [session] = await transaction<{ id: number }[]>`
				insert into app_private.exam_sessions (year, session, official_code)
				values (${exam.year}, ${exam.session}, ${exam.sourceFolder}) returning id
			`;
			for (const task of exam.tasks) {
				const [createdTask] = await transaction<{ id: number }[]>`
					insert into app_private.tasks (slug, status) values (${task.slug}, 'published') returning id
				`;
				const topicId = topicIds.get(task.number);
				const periodSlug = positionMetadata[task.number - 1][2];
				const periodId = periodIds.get(periodSlug);
				if (!topicId || !periodId) throw new Error(`Missing metadata for task position ${task.number}.`);
				const [version] = await transaction<{ id: number }[]>`
					insert into app_private.task_versions
						(task_id, version, status, title, instructions, curriculum_id, period_id, exam_session_id, max_points, exam_position, published_at)
					values
						(${createdTask.id}, 1, 'published', ${task.title}, 'Offizielle deutschsprachige Abituraufgabe. Bearbeiten Sie alle auf den Originalseiten gezeigten Teilaufgaben und geben Sie Ihre Antworten in derselben Reihenfolge ein.', ${curriculumIds.get(task.curriculumCode)!}, ${periodId}, ${session.id}, ${task.maximumPoints}, ${task.number}, now())
					returning id
				`;
				await transaction`insert into app_private.task_version_topics (task_version_id, topic_id) values (${version.id}, ${topicId})`;
				const upload = uploadedTasks.find((item) => item.task.slug === task.slug);
				if (!upload) throw new Error(`Missing uploaded images for ${task.slug}.`);
				for (const [position, image] of upload.uploaded.entries()) {
					const [asset] = await transaction<{ id: number }[]>`
						insert into app_private.assets (bucket, path, mime_type, size_bytes, alt_text)
						values ('exam-assets', ${image.objectPath}, 'image/webp', ${image.sizeBytes}, ${`Originalseite ${position + 1} der Aufgabe ${task.number} aus ${exam.sourceFolder}`}) returning id
					`;
					await transaction`
						insert into app_private.sources (task_version_id, position, kind, title, content, asset_id)
						values (${version.id}, ${position}, 'image', ${`Originalaufgabe – Seite ${position + 1}`}, ${transaction.json({})}, ${asset.id})
					`;
				}
				await transaction`
					insert into app_private.questions (task_version_id, position, kind, prompt, config, grading_rule, max_points)
					values (${version.id}, 0, 'short_text', 'Antworten zu allen Teilaufgaben', ${transaction.json({ kind: 'short_text', multiline: true, maximumLength: 8000 })}, ${transaction.json({ kind: 'short_text', acceptedAnswers: [], criteria: [task.rubric], aiEligible: true, normalizeWhitespace: true })}, ${task.maximumPoints})
				`;
			}
		}
	});

	const [summary] = await sql<{ exams: number; tasks: number; questions: number; assets: number }[]>`
		select
			(select count(*)::int from app_private.exam_sessions) as exams,
			(select count(*)::int from app_private.tasks) as tasks,
			(select count(*)::int from app_private.questions) as questions,
			(select count(*)::int from app_private.assets) as assets
	`;
	if (summary.exams !== 39 || summary.tasks !== expectedTasks || summary.questions !== expectedTasks || summary.assets < expectedTasks) {
		throw new Error(`Import verification failed: ${JSON.stringify(summary)}.`);
	}
	console.log(`Imported ${summary.exams} official exams, ${summary.tasks} tasks, ${summary.questions} questions and ${summary.assets} page assets.`);
} finally {
	await sql.end();
}
