import postgres from 'postgres';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { OFFICIAL_PERIODS, OFFICIAL_TOPICS, periodSlug, topicSlug } from '../src/lib/history-taxonomy.ts';
import { classifyHistoryTask } from '../src/lib/history-classification.ts';

const connectionString = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_MIGRATION_URL or DATABASE_URL is required.');
const sql = postgres(connectionString, { max: 1, prepare: false });
const apply = process.argv.includes('--apply');

try {
	const rows = await sql.unsafe('select v.id, v.task_id, v.title, p.slug as old_period, coalesce(array_agg(distinct tp.slug) filter (where tp.slug is not null), \'{}\') as old_topics, v.exam_position from app_private.task_versions v join app_private.historical_periods p on p.id = v.period_id left join app_private.task_version_topics vt on vt.task_version_id = v.id left join app_private.topics tp on tp.id = vt.topic_id group by v.id, p.slug order by v.id') as {
		id: number; task_id: number; title: string; old_period: string; old_topics: string[]; exam_position: number | null;
	}[];
	const tagDir = join(process.cwd(), 'data', 'history-tags');
	const files = (await readdir(tagDir)).filter((file) => /^batch-\d+\.json$/.test(file));
	const aiTags = new Map<number, { topicCode: string; scope: 'hungarian' | 'global'; confidence: string }>();
	for (const file of files) {
		const batch = JSON.parse(await readFile(join(tagDir, file), 'utf8')) as { tasks: Array<{ taskId: number; topicCode: string; scope: 'hungarian' | 'global'; confidence: string }> };
		for (const item of batch.tasks) aiTags.set(item.taskId, item);
	}
	const mapped = rows.map((row) => {
		const ai = aiTags.get(Number(row.task_id));
		const fallback = classifyHistoryTask({ title: row.title, oldPeriod: row.old_period, oldTopics: row.old_topics, examPosition: row.exam_position });
		const topic = /r[oö]mischen? Republik|római köztársaság/iu.test(row.title) ? '1.1' : ai?.topicCode ?? fallback.topic;
		return { ...row, topic, period: Number(topic.split('.')[0]), scope: ai?.scope ?? fallback.scope, confident: ai?.confidence === 'high' || ai?.confidence === 'medium' };
	});
	const missing = [...new Set(rows.map((row) => Number(row.task_id)))].filter((id) => !aiTags.has(id));
	console.log('AI tags', aiTags.size, 'missing task IDs', missing.length);
	if (apply && missing.length) throw new Error('Refusing to update official tasks until every task has an AI classification.');
	const uncertain = mapped.filter((row) => !row.confident);
	console.log('Classified', mapped.length, 'task versions;', uncertain.length, 'require editorial topic review.');
	for (const row of uncertain) console.log('REVIEW', row.id, row.topic, row.title);
	if (!apply) {
		console.log('Dry run only; pass --apply to update the database.');
	} else {
		await sql.begin(async (tx) => {
			// Update classifications of published versions in one transaction, then restore immutability guards.
			await tx.unsafe('alter table app_private.task_versions disable trigger protect_task_version');
			await tx.unsafe('alter table app_private.task_version_topics disable trigger protect_topic_version');
			const periodIds = new Map<number, number>();
			const topicIds = new Map<string, number>();
			for (const [code, name] of OFFICIAL_PERIODS) {
				const [period] = await tx.unsafe('insert into app_private.historical_periods (slug, name, position) values ($1, $2, $3) on conflict (slug) do update set name = excluded.name, position = excluded.position returning id', [periodSlug(code), name, Number(code)]) as { id: number }[];
				periodIds.set(Number(code), period.id);
			}
			for (const [code, name] of OFFICIAL_TOPICS) {
				const [topic] = await tx.unsafe('insert into app_private.topics (slug, name, period_id) values ($1, $2, $3) on conflict (slug) do update set name = excluded.name, period_id = excluded.period_id returning id', [topicSlug(code), name, periodIds.get(Number(code.split('.')[0]))!]) as { id: number }[];
				topicIds.set(code, topic.id);
			}
			for (const row of mapped) {
				await tx.unsafe('update app_private.task_versions set period_id = $1, history_scope = $2, updated_at = now() where id = $3', [periodIds.get(row.period)!, row.scope, row.id]);
				await tx.unsafe('delete from app_private.task_version_topics where task_version_id = $1', [row.id]);
				await tx.unsafe('insert into app_private.task_version_topics (task_version_id, topic_id) values ($1, $2)', [row.id, topicIds.get(row.topic)!]);
			}
			await tx.unsafe("delete from app_private.topics where slug not like 'thema-%'");
			await tx.unsafe("delete from app_private.historical_periods where slug not like 'epoche-%'");
			await tx.unsafe('alter table app_private.task_version_topics enable trigger protect_topic_version');
			await tx.unsafe('alter table app_private.task_versions enable trigger protect_task_version');
		});
		console.log('Official taxonomy applied.');
	}
} finally {
	await sql.end();
}
