import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { OFFICIAL_TOPICS, periodSlug, topicSlug } from '../src/lib/history-taxonomy.ts';
import { classifyHistoryTask } from '../src/lib/history-classification.ts';

const root = process.cwd();
const sourceRoot = join(root, 'erettsegik_2006_2026');
const jobsRoot = join(root, 'tmp', 'exam-imports');
const [command, examName] = process.argv.slice(2);
if (!['prepare', 'generate', 'validate', 'publish'].includes(command ?? '') || !examName || !/^20(?:0[6-9]|1\d|2[0-6])_(?:tavasz|osz)$/u.test(examName)) {
	throw new Error('Usage: exam-import.ts <prepare|generate|validate|publish> <YYYY_tavasz|YYYY_osz>.');
}

const option = z.object({ id: z.string().min(1), label: z.string().min(1) });
const config = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('choice'), options: z.array(option).min(2) }),
	z.object({ kind: z.literal('multiple_choice'), options: z.array(option).min(2), minimumSelections: z.number().int().min(0).optional(), maximumSelections: z.number().int().positive().optional() }),
	z.object({ kind: z.literal('matching'), left: z.array(option).min(1), right: z.array(option).min(1) }),
	z.object({ kind: z.literal('ordering'), items: z.array(option).min(2) }),
	z.object({ kind: z.literal('short_text'), multiline: z.boolean(), maximumLength: z.number().int().positive().optional() })
]);
const rule = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('choice'), correctOptionId: z.string().min(1) }),
	z.object({ kind: z.literal('multiple_choice'), correctOptionIds: z.array(z.string().min(1)).min(1), allOrNothing: z.boolean() }),
	z.object({ kind: z.literal('matching'), pairs: z.array(z.object({ leftId: z.string().min(1), rightId: z.string().min(1) })).min(1) }),
	z.object({ kind: z.literal('ordering'), correctOrder: z.array(z.string().min(1)).min(2) }),
	z.object({ kind: z.literal('short_text'), acceptedAnswers: z.array(z.string().min(1)), criteria: z.array(z.string().min(1)).min(1), aiEligible: z.boolean(), normalizeWhitespace: z.boolean() })
]);
const question = z.object({ kind: z.enum(['choice', 'multiple_choice', 'matching', 'ordering', 'short_text']), prompt: z.string().min(1).max(3000), config, gradingRule: rule, maxPoints: z.number().positive().max(100) });
// Solution pages are evidence for Gemini, never learner-visible sources.
const source = z.object({ kind: z.enum(['text', 'image', 'table', 'map']), title: z.string().max(200).nullable(), content: z.record(z.string(), z.unknown()).nullable().optional(), pageRef: z.string().regex(/^exam-\d{3}$/u).nullable().optional() });
const topic = z.object({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u), name: z.string().min(1).max(160) });
const period = z.object({ slug: z.enum(['altertum', 'mittelalter', 'fruehe-neuzeit', 'neunzehntes-jahrhundert', 'zwanzigstes-jahrhundert', 'nach-1945', 'gegenwart']), name: z.string().min(1).max(100), position: z.number().int().positive() });
const task = z.object({ position: z.number().int().min(1).max(12), title: z.string().min(1).max(200), instructions: z.string().max(5000), maxPoints: z.number().positive(), officialMaxPoints: z.number().positive().optional(), period, topics: z.array(topic).min(1), officialTopicCode: z.enum(OFFICIAL_TOPICS.map(([code]) => code)).optional(), historyScope: z.enum(['hungarian', 'global']).optional(), sources: z.array(source).min(1), questions: z.array(question).min(1) });
// Sources for official exams are intentionally not AI-generated. Each mapped original
// exam page is shown verbatim to learners, which avoids lossy transcription and layout
// interpretation for tables, maps, images, and every other source type.
const taskForGemini = task.omit({ sources: true, officialMaxPoints: true });
const examMap = z.object({ officialCode: z.string().max(80).nullable(), tasks: z.array(z.object({ position: z.number().int().min(1).max(12), title: z.string().min(1), maxPoints: z.number().positive(), examPageRefs: z.array(z.string().regex(/^exam-\d{3}$/u)).min(1), solutionPageRefs: z.array(z.string().regex(/^solution-\d{3}$/u)).min(1) })).length(12), officialTotalPoints: z.number().positive() });
type Task = z.infer<typeof task>;

class GeminiGenerationError extends Error {
	readonly finishReason?: string;
	constructor(message: string, finishReason?: string) { super(message); this.finishReason = finishReason; }
}

const jobDir = join(jobsRoot, examName);
const aiDir = join(jobDir, 'ai');
const sourceDir = join(jobDir, 'source');
const pagesDir = join(jobDir, 'pages');
const manifestPath = join(jobDir, 'manifest.json');
const json = async <T>(path: string) => JSON.parse(await readFile(path, 'utf8')) as T;
const hash = async (path: string) => createHash('sha256').update(await readFile(path)).digest('hex');

function retryDelayMs(response: Response, body: string, attempt: number) {
	const retryAfter = response.headers.get('retry-after');
	if (retryAfter) {
		const seconds = Number(retryAfter);
		if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
		const timestamp = Date.parse(retryAfter);
		if (!Number.isNaN(timestamp)) return Math.max(0, timestamp - Date.now());
	}
	const retryInfo = /"retryDelay"\s*:\s*"([\d.]+)s"/u.exec(body);
	if (retryInfo) {
		const seconds = Number(retryInfo[1]);
		if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
	}
	return Math.min(60_000, 1_000 * 2 ** attempt);
}

const wait = (milliseconds: number) => new Promise<void>((resolveWait) => setTimeout(resolveWait, milliseconds));

function run(commandName: string, args: string[]) {
	return new Promise<void>((resolveRun, reject) => {
		const child = spawn(commandName, args, { cwd: root, stdio: 'inherit' });
		child.on('error', reject); child.on('exit', (code) => code === 0 ? resolveRun() : reject(new Error(`${commandName} exited ${code}`)));
	});
}

async function prepare() {
	const folder = resolve(sourceRoot, examName);
	if (!folder.startsWith(resolve(sourceRoot)) || !(await stat(folder)).isDirectory()) throw new Error(`Unknown exam: ${examName}`);
	await mkdir(sourceDir, { recursive: true });
	for (const file of ['feladatsor.pdf', 'megoldas.pdf']) await cp(join(folder, file), join(sourceDir, file));
	await run('python', ['scripts/render-exam-assets.py', '--exam', sourceDir, '--output', jobDir]);
	const pages = await json<{ examPages: unknown[]; solutionPages: unknown[] }>(join(jobDir, 'pages.json'));
	await writeFile(manifestPath, JSON.stringify({ schemaVersion: 1, examName, createdAt: new Date().toISOString(), sourceHashes: { exam: await hash(join(sourceDir, 'feladatsor.pdf')), solutions: await hash(join(sourceDir, 'megoldas.pdf')) }, ...pages }, null, 2));
	console.log(`Prepared ${examName}: ${pages.examPages.length} exam pages and ${pages.solutionPages.length} solution pages.`);
}

async function generateContent(prompt: string, parts: Array<{ mimeType: string; bytes: Buffer }>, schema: object) {
	const key = process.env.GEMINI_API_KEY;
	if (!key) throw new Error('GEMINI_API_KEY is required.');
	const model = process.env.GEMINI_IMPORT_MODEL?.trim() || process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite';
	const retries = Math.max(0, Number.parseInt(process.env.GEMINI_IMPORT_MAX_RETRIES ?? '3', 10) || 0);
	for (let attempt = 0; attempt <= retries; attempt += 1) {
		const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
			method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
			body: JSON.stringify({ systemInstruction: { parts: [{ text: 'You are an exacting official Hungarian history-exam conversion system. Preserve original-language text. Use only evidence in supplied pages and official solutions. Never invent a fact, image, answer, source, or point value. Return JSON only.' }] }, contents: [{ role: 'user', parts: [{ text: prompt }, ...parts.map((part) => ({ inlineData: { mimeType: part.mimeType, data: part.bytes.toString('base64') } }))] }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, temperature: 0, maxOutputTokens: 32000 } })
		});
		if (!response.ok) {
			const body = await response.text();
			if (response.status !== 429) throw new GeminiGenerationError(`Gemini request failed: ${response.status} ${body}`);
			if (attempt === retries) throw new GeminiGenerationError(`Gemini remained rate limited after ${retries} automatic retries. Retry later or increase GEMINI_IMPORT_MAX_RETRIES. Last response: ${body}`);
			const delay = retryDelayMs(response, body, attempt);
			console.warn(`Gemini rate limited; retrying request ${attempt + 1}/${retries} in ${Math.ceil(delay / 1000)} seconds.`);
			await wait(delay);
			continue;
		}
		const payload = await response.json() as { candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>; promptFeedback?: unknown };
		const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text).find((part): part is string => Boolean(part));
		if (!text) throw new GeminiGenerationError(`Gemini returned no JSON: ${JSON.stringify({ finishReason: payload.candidates?.[0]?.finishReason, promptFeedback: payload.promptFeedback })}`, payload.candidates?.[0]?.finishReason);
		return JSON.parse(text) as unknown;
	}
	throw new Error('Unreachable Gemini retry state.');
}

function normalizeSlug(value: string) {
	return value
		.trim()
		.toLocaleLowerCase('de')
		.replace(/ß/gu, 'ss')
		.normalize('NFKD')
		.replace(/\p{Mark}/gu, '')
		.replace(/[^a-z0-9]+/gu, '-')
		.replace(/^-+|-+$/gu, '');
}

function normalizeTaskOutput(value: unknown) {
	if (!value || typeof value !== 'object' || !Array.isArray((value as { questions?: unknown }).questions)) return value;
	const { officialMaxPoints: _ignoredOfficialMaxPoints, ...draft } = value as { officialMaxPoints?: unknown; questions: Array<Record<string, unknown>>; topics?: unknown };
	return {
		...draft,
		topics: Array.isArray(draft.topics)
			? draft.topics.map((topic) => topic && typeof topic === 'object' && typeof (topic as { slug?: unknown }).slug === 'string'
				? { ...(topic as Record<string, unknown>), slug: normalizeSlug((topic as { slug: string }).slug) }
				: topic)
			: draft.topics,
		questions: draft.questions.map((question) => {
			const kind = question.kind;
			return {
				...question,
				config: question.config && typeof question.config === 'object' ? { ...(question.config as Record<string, unknown>), kind } : question.config,
				gradingRule: question.gradingRule && typeof question.gradingRule === 'object' ? { ...(question.gradingRule as Record<string, unknown>), kind } : question.gradingRule
			};
		})
	};
}

function originalPageSources(examPageRefs: string[]) {
	return examPageRefs.map((pageRef, index) => ({ kind: 'image' as const, title: `Originalseite ${index + 1}`, content: null, pageRef }));
}

async function generate() {
	const manifest = await json<Record<string, unknown>>(manifestPath);
	const storedHashes = manifest.sourceHashes as { exam?: string; solutions?: string } | undefined;
	if (storedHashes?.exam !== await hash(join(sourceDir, 'feladatsor.pdf')) || storedHashes?.solutions !== await hash(join(sourceDir, 'megoldas.pdf'))) throw new Error('Source PDFs changed after preparation. Run prepare again and regenerate the job.');
	await mkdir(aiDir, { recursive: true });
	const mapPath = join(aiDir, 'exam-map.json');
	const map = await stat(mapPath).then(() => json(mapPath).then((value) => examMap.parse(value))).catch(async (error: unknown) => {
		if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
		const mapRaw = await generateContent('Create an exam map for the supplied official question and solution PDFs. Identify exactly the 12 short-answer tasks (exclude the essay section), their exact point totals, and the relevant question and solution page IDs. officialTotalPoints must be the sum of those 12 short-answer task totals only; do not use the full paper total if it includes essays. Page IDs are assigned by page order: exam-001... and solution-001....', [{ mimeType: 'application/pdf', bytes: await readFile(join(sourceDir, 'feladatsor.pdf')) }, { mimeType: 'application/pdf', bytes: await readFile(join(sourceDir, 'megoldas.pdf')) }], z.toJSONSchema(examMap));
		const generated = examMap.parse(mapRaw); await writeFile(mapPath, JSON.stringify(generated, null, 2)); return generated;
	});
	const taskLimit = Math.max(1, Number.parseInt(process.env.GEMINI_IMPORT_TASK_LIMIT ?? '12', 10) || 12);
	let generatedCount = 0;
	for (const entry of map.tasks) {
		const taskPath = join(aiDir, `task-${String(entry.position).padStart(2, '0')}.json`);
		const existing = await stat(taskPath).then(() => json(taskPath).then((value) => task.parse({ ...task.parse(value), sources: originalPageSources(entry.examPageRefs) }))).catch((error: unknown) => {
			if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
			throw error;
		});
		if (existing) { await writeFile(taskPath, JSON.stringify(existing, null, 2)); console.log(`Reusing task ${entry.position}.`); continue; }
		if (generatedCount >= taskLimit) break;
		const pageRefs = [...entry.examPageRefs, ...entry.solutionPageRefs];
		const parts = await Promise.all(pageRefs.map(async (id) => ({ mimeType: 'image/webp', bytes: await readFile(join(pagesDir, `${id}.webp`)) })));
		const commonPrompt = `Convert task ${entry.position} into the exact requested AbiPro JSON. Its official title is ${entry.title}; exact total is ${entry.maxPoints}. The image parts are in this order: ${pageRefs.join(', ')}. Do not return sources: original exam pages are attached separately and shown verbatim to learners. Solution-* pages are grading evidence only. Model every subquestion separately and make deterministic answer keys whenever official solutions permit. A matching pair has exactly one left and one right endpoint: never use a left ID more than once. If an official prompt assigns multiple answers to one item, expand it into separately labelled rows (for example, “Photo A — first answer” and “Photo A — second answer”). short_text.aiEligible may be true only for genuinely semantic answers. Question points must total ${entry.maxPoints}. Set officialTopicCode to the best matching code from this official list: ${OFFICIAL_TOPICS.map(([code, name]) => `${code} ${name}`).join('; ')}. Set historyScope to hungarian for Hungarian history or global for world history.`;
		const taskRaw = await generateContent(commonPrompt, parts, z.toJSONSchema(taskForGemini));
		const normalized = normalizeTaskOutput(taskRaw);
		try { await writeFile(join(aiDir, `task-${String(entry.position).padStart(2, '0')}.raw.json`), JSON.stringify(taskRaw, null, 2)); } catch { /* diagnostic output must not block a valid draft */ }
		let parsed = task.parse({ ...normalized as object, sources: originalPageSources(entry.examPageRefs) });
		if (parsed.position !== entry.position) throw new Error(`Task ${entry.position} position disagrees with the exam map.`);
		const rubricPoints = parsed.questions.reduce((sum, item) => sum + item.maxPoints, 0);
		if (parsed.maxPoints !== entry.maxPoints && Math.abs(rubricPoints - parsed.maxPoints) > 0.001) throw new Error(`Task ${entry.position} total disagrees with the exam map.`);
		if (parsed.maxPoints !== entry.maxPoints) parsed = { ...parsed, officialMaxPoints: entry.maxPoints, maxPoints: rubricPoints };
		else if (Math.abs(rubricPoints - parsed.maxPoints) > 0.001) parsed = { ...parsed, officialMaxPoints: parsed.maxPoints, maxPoints: rubricPoints };
		await writeFile(taskPath, JSON.stringify(parsed, null, 2));
		generatedCount += 1;
		console.log(`Generated task ${entry.position}.`);
	}
	const completed = await Promise.all(map.tasks.map((entry) => stat(join(aiDir, `task-${String(entry.position).padStart(2, '0')}.json`)).then(() => true).catch(() => false)));
	if (completed.every(Boolean)) await writeFile(join(aiDir, 'generation.json'), JSON.stringify({ generatedAt: new Date().toISOString(), manifestHash: createHash('sha256').update(JSON.stringify(manifest)).digest('hex') }, null, 2));
	console.log(`Generated ${completed.filter(Boolean).length}/12 task drafts for ${examName}.`);
}

function validateTask(value: Task, knownPages: Set<string>) {
	const problems: string[] = [];
	if (Math.abs(value.maxPoints - value.questions.reduce((sum, item) => sum + item.maxPoints, 0)) > 0.001) problems.push('question points do not equal task points');
	for (const item of value.sources) { if (item.pageRef && !knownPages.has(item.pageRef)) problems.push(`unknown page reference ${item.pageRef}`); if (!item.content && !item.pageRef) problems.push('source has neither content nor pageRef'); }
	for (const item of value.questions) {
		if (item.kind !== item.config.kind || item.kind !== item.gradingRule.kind) problems.push(`question type mismatch: ${item.prompt.slice(0, 50)}`);
		const ids = item.config.kind === 'choice' || item.config.kind === 'multiple_choice' ? item.config.options.map((x) => x.id) : item.config.kind === 'matching' ? [...item.config.left, ...item.config.right].map((x) => x.id) : item.config.kind === 'ordering' ? item.config.items.map((x) => x.id) : [];
		if (new Set(ids).size !== ids.length) problems.push('duplicate option IDs');
		if (item.config.kind === 'choice' && item.gradingRule.kind === 'choice' && !ids.includes(item.gradingRule.correctOptionId)) problems.push('choice key does not reference an option');
		if (item.config.kind === 'multiple_choice' && item.gradingRule.kind === 'multiple_choice') {
			if (item.gradingRule.correctOptionIds.some((id) => !ids.includes(id)) || new Set(item.gradingRule.correctOptionIds).size !== item.gradingRule.correctOptionIds.length) problems.push('multiple-choice key is invalid');
			if (item.config.minimumSelections !== undefined && item.config.maximumSelections !== undefined && item.config.minimumSelections > item.config.maximumSelections) problems.push('multiple-choice selection bounds are invalid');
			if (item.config.maximumSelections !== undefined && item.config.maximumSelections > ids.length) problems.push('multiple-choice maximum exceeds options');
		}
		if (item.config.kind === 'matching' && item.gradingRule.kind === 'matching') {
			const left = new Set(item.config.left.map((x) => x.id)), right = new Set(item.config.right.map((x) => x.id));
			if (item.gradingRule.pairs.some((pair) => !left.has(pair.leftId) || !right.has(pair.rightId)) || new Set(item.gradingRule.pairs.map((pair) => pair.leftId)).size !== item.gradingRule.pairs.length) problems.push('matching key is invalid');
		}
		if (item.config.kind === 'ordering' && item.gradingRule.kind === 'ordering' && (item.gradingRule.correctOrder.length !== ids.length || new Set(item.gradingRule.correctOrder).size !== ids.length || item.gradingRule.correctOrder.some((id) => !ids.includes(id)))) problems.push('ordering key is invalid');
	}
	return problems;
}

async function validate() {
	const manifest = await json<{ examPages: Array<{ id: string }>; solutionPages: Array<{ id: string }> }>(manifestPath);
	const map = examMap.parse(await json(join(aiDir, 'exam-map.json')));
	const issues: Array<{ task?: number; issue: string }> = [];
	const warnings: Array<{ task: number; warning: string }> = [];
	if (new Set(map.tasks.map((x) => x.position)).size !== 12) issues.push({ issue: 'exam map has duplicate positions' });
	if (Math.abs(map.officialTotalPoints - map.tasks.reduce((sum, x) => sum + x.maxPoints, 0)) > 0.001) issues.push({ issue: 'exam map totals do not add up' });
	const pages = new Set([...manifest.examPages, ...manifest.solutionPages].map((x) => x.id));
	const content = [JSON.stringify(map)];
	for (const entry of map.tasks) {
		try { const raw = await readFile(join(aiDir, `task-${String(entry.position).padStart(2, '0')}.json`), 'utf8'); content.push(raw); const parsed = task.parse(JSON.parse(raw)); if ((parsed.officialMaxPoints ?? parsed.maxPoints) !== entry.maxPoints) issues.push({ task: entry.position, issue: 'task total disagrees with official exam map' }); const actualPageRefs = parsed.sources.map((item) => item.pageRef); if (parsed.sources.length !== entry.examPageRefs.length || actualPageRefs.some((pageRef, index) => pageRef !== entry.examPageRefs[index])) issues.push({ task: entry.position, issue: 'learner-visible sources must exactly match mapped original exam pages' }); if (parsed.sources.some((item) => item.kind !== 'image' || item.content !== null || !item.pageRef)) issues.push({ task: entry.position, issue: 'learner-visible sources must be original page images only' }); if (parsed.officialMaxPoints !== undefined && Math.abs(parsed.officialMaxPoints - parsed.maxPoints) > 0.001) warnings.push({ task: entry.position, warning: `Printed official total ${parsed.officialMaxPoints} differs from detailed rubric total ${parsed.maxPoints}; detailed rubric total will be used for grading.` }); for (const issue of validateTask(parsed, pages)) issues.push({ task: entry.position, issue }); } catch (error) { issues.push({ task: entry.position, issue: error instanceof Error ? error.message : 'invalid task JSON' }); }
	}
	await mkdir(join(jobDir, 'review'), { recursive: true });
	await writeFile(join(jobDir, 'review', 'report.json'), JSON.stringify({ validatedAt: new Date().toISOString(), contentHash: createHash('sha256').update(content.join('\n')).digest('hex'), passed: issues.length === 0, issues, warnings }, null, 2));
	if (issues.length) throw new Error(`Validation failed with ${issues.length} issue(s); see tmp/exam-imports/${examName}/review/report.json.`);
	console.log(`Validation passed for ${examName}. Ready to publish.`);
}

async function publish() {
	const report = await json<{ passed: boolean; contentHash?: string }>(join(jobDir, 'review', 'report.json'));
	if (!report.passed) throw new Error('Refusing to publish: validation has not passed.');
	const connection = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL, url = process.env.PUBLIC_SUPABASE_URL, secret = process.env.SUPABASE_SECRET_KEY;
	if (!connection || !url || !secret) throw new Error('DATABASE_MIGRATION_URL (or DATABASE_URL), PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.');
	const mapRaw = await readFile(join(aiDir, 'exam-map.json'), 'utf8'); const map = examMap.parse(JSON.parse(mapRaw));
	const digestContent = [JSON.stringify(map)]; for (const entry of map.tasks) digestContent.push(await readFile(join(aiDir, `task-${String(entry.position).padStart(2, '0')}.json`), 'utf8'));
	if (!report.contentHash || report.contentHash !== createHash('sha256').update(digestContent.join('\n')).digest('hex')) throw new Error('Draft JSON changed after validation. Run exams:validate again.');
	const year = Number(examName.slice(0, 4)), session = examName.endsWith('_tavasz') ? 'spring' : 'autumn';
	const storage = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from('exam-assets');
	const sql = postgres(connection, { max: 1, prepare: false });
	try { await sql.begin(async (tx) => {
		const [curriculum] = await tx<{ id: number }[]>`insert into app_private.curricula (code, name) values (${year >= 2024 ? 'NAT_2020' : year >= 2017 ? 'NAT_2012' : 'NAT_2007'}, ${year >= 2024 ? 'NAT 2020' : year >= 2017 ? 'NAT 2012' : 'NAT 2007'}) on conflict (code) do update set name = excluded.name returning id`;
		const [sessionRow] = await tx<{ id: number }[]>`insert into app_private.exam_sessions (year, session, official_code) values (${year}, ${session}, ${map.officialCode ?? examName}) on conflict (year, session) do update set official_code = excluded.official_code returning id`;
		for (const entry of map.tasks) {
			const data = task.parse(await json(join(aiDir, `task-${String(entry.position).padStart(2, '0')}.json`))); const slug = `official-${year}-${session}-${String(entry.position).padStart(2, '0')}`;
			const fallback = classifyHistoryTask({ title: data.title, oldPeriod: data.period.slug, oldTopics: data.topics.map((value) => value.name), examPosition: data.position });
			const topicCode = data.officialTopicCode ?? fallback.topic;
			const scope = data.historyScope ?? fallback.scope;
			const [periodRow] = await tx<{ id: number }[]>`select id from app_private.historical_periods where slug = ${periodSlug(topicCode.split('.')[0])}`;
			const [topicRow] = await tx<{ id: number }[]>`select id from app_private.topics where slug = ${topicSlug(topicCode)}`;
			if (!periodRow || !topicRow) throw new Error('Official taxonomy must be installed before importing exams.');
			const existing = await tx<{ id: number; next_version: number }[]>`select task.id, coalesce(max(version.version), 0)::int + 1 as next_version from app_private.tasks as task left join app_private.task_versions as version on version.task_id=task.id where task.slug=${slug} group by task.id`;
			const created = existing[0] ?? (await tx<{ id: number; next_version: number }[]>`insert into app_private.tasks (slug, status) values (${slug}, 'draft') returning id, 1 as next_version`)[0];
			const [version] = await tx<{ id: number }[]>`insert into app_private.task_versions (task_id, version, status, title, instructions, curriculum_id, period_id, exam_session_id, history_scope, max_points, exam_position) values (${created.id}, ${created.next_version}, 'draft', ${data.title}, ${data.instructions}, ${curriculum.id}, ${periodRow.id}, ${sessionRow.id}, ${scope}, ${data.maxPoints}, ${data.position}) returning id`;
			await tx`insert into app_private.task_version_topics (task_version_id, topic_id) values (${version.id}, ${topicRow.id})`;
			for (const [position, value] of data.sources.entries()) { let assetId: number | null = null; if (value.pageRef) { const objectPath = `official-exams/${examName}/${value.pageRef}.webp`, bytes = await readFile(join(pagesDir, `${value.pageRef}.webp`)); const { error } = await storage.upload(objectPath, bytes, { contentType: 'image/webp', cacheControl: '31536000', upsert: true }); if (error) throw new Error(error.message); const [asset] = await tx<{ id: number }[]>`insert into app_private.assets (bucket, path, mime_type, size_bytes, alt_text) values ('exam-assets', ${objectPath}, 'image/webp', ${bytes.byteLength}, ${`${examName} ${value.pageRef}`}) on conflict (bucket, path) do update set size_bytes = excluded.size_bytes returning id`; assetId = asset.id; } await tx`insert into app_private.sources (task_version_id, position, kind, title, content, asset_id) values (${version.id}, ${position}, 'image', ${value.title}, ${tx.json({})}, ${assetId})`; }
			for (const [position, value] of data.questions.entries()) await tx`insert into app_private.questions (task_version_id, position, kind, prompt, config, grading_rule, max_points) values (${version.id}, ${position}, ${value.kind}, ${value.prompt}, ${tx.json(value.config)}, ${tx.json(value.gradingRule)}, ${value.maxPoints})`;
			await tx`update app_private.task_versions set status = 'retired' where task_id = ${created.id} and status = 'published'`;
			await tx`update app_private.task_versions set status = 'published', published_at = now() where id = ${version.id}`; await tx`update app_private.tasks set status = 'published' where id = ${created.id}`;
		}
	}); } finally { await sql.end(); }
	console.log(`Published ${examName}.`);
}

if (command === 'prepare') await prepare(); else if (command === 'generate') await generate(); else if (command === 'validate') await validate(); else await publish();
