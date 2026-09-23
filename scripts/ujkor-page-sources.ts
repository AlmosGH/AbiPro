/** Replace imported Újkor.hu source blocks with their original book pages. */
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';

const root = process.cwd();
const manifest = JSON.parse(await readFile(join(root, 'scripts', 'ujkor-page-map.json'), 'utf8')) as Record<string, Array<{ url: string; width: number; height: number; page: number }>>;
const tasks = JSON.parse(await readFile(join(root, 'data', 'ujkor-tasks.json'), 'utf8')) as Array<{ slug: string }>;
const sourceSlugs = new Set(tasks.map((task) => task.slug));
if (sourceSlugs.size !== tasks.length || sourceSlugs.size !== Object.keys(manifest).length || [...sourceSlugs].some((slug) => !manifest[slug]?.length)) {
	throw new Error('Original-page manifest does not cover exactly the Újkor.hu source tasks.');
}
for (const pages of Object.values(manifest)) {
	for (const page of pages) {
		if (!/^\/ujkor-pages\/(global|hungarian)-\d{3}\.webp$/.test(page.url) || page.width <= 0 || page.height <= 0) throw new Error('Invalid original-page entry.');
		await access(join(root, 'static', page.url.slice(1)));
	}
}

const connection = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
if (!connection) throw new Error('DATABASE_MIGRATION_URL or DATABASE_URL is required.');
const sql = postgres(connection, { max: 1, prepare: false });
try {
	const rows = await sql.unsafe("select t.slug, v.id as version_id from app_private.tasks t join app_private.task_versions v on v.task_id = t.id where t.origin = 'ujkor' order by t.slug, v.version");
	const databaseSlugs = new Set(rows.map((row) => String(row.slug)));
	if (databaseSlugs.size !== sourceSlugs.size || [...databaseSlugs].some((slug) => !sourceSlugs.has(slug))) {
		throw new Error(`Database Újkor.hu task set differs from the page manifest (${databaseSlugs.size} versus ${sourceSlugs.size}).`);
	}
	const insertions = rows.flatMap((row) => manifest[String(row.slug)].map((page, position) => ({
		task_version_id: Number(row.version_id), position, kind: 'image', title: `Originalseite ${position + 1}`,
		content: { url: page.url, width: page.width, height: page.height }
	})));
	await sql.begin(async (tx) => {
		// The existing published versions are normally immutable. This controlled
		// source-only replacement leaves their questions and grading rules intact.
		await tx.unsafe('alter table app_private.sources disable trigger protect_source_version');
		await tx.unsafe("delete from app_private.sources where task_version_id in (select v.id from app_private.task_versions v join app_private.tasks t on t.id = v.task_id where t.origin = 'ujkor')");
		await tx.unsafe(`insert into app_private.sources (task_version_id, position, kind, title, content)
			select task_version_id, position, kind::app_private.source_kind, title, content
			from jsonb_to_recordset($1::jsonb) as entry(task_version_id bigint, position integer, kind text, title text, content jsonb)`, [JSON.stringify(insertions)]);
		await tx.unsafe('alter table app_private.sources enable trigger protect_source_version');
	});
	const [result] = await sql.unsafe(`select count(*)::integer as sources,
		count(distinct s.task_version_id)::integer as versions,
		count(*) filter (where s.kind <> 'image' or s.content->>'url' not like '/ujkor-pages/%')::integer as invalid
		from app_private.sources s join app_private.task_versions v on v.id = s.task_version_id
		join app_private.tasks t on t.id = v.task_id where t.origin = 'ujkor'`);
	if (result.sources !== insertions.length || result.versions !== rows.length || result.invalid !== 0) throw new Error('Post-update source verification failed.');
	console.log(JSON.stringify({ tasks: databaseSlugs.size, versions: rows.length, originalPages: result.sources, invalidSources: result.invalid }));
} finally {
	await sql.end();
}
