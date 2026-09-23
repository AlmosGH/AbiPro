import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin } from '$lib/server/authorization';
import { archiveTask, createTask, getReferenceData, listFilteredAdminTasks, restoreTask } from '$lib/server/content';
import { taskMetadataSchema } from '$lib/server/content-validation';
import type { Actions, PageServerLoad } from './$types';

const positiveId = z.coerce.number().int().positive();
function optionalId(value: string | null) { const parsed = positiveId.safeParse(value); return parsed.success ? parsed.data : undefined; }

export const load: PageServerLoad = async ({ locals, url }) => {
	requireAdmin(locals);
	const statusValue = url.searchParams.get('status');
	const status: 'draft' | 'published' | 'archived' | undefined = statusValue === 'draft' || statusValue === 'published' || statusValue === 'archived' ? statusValue : undefined;
	const originValue = url.searchParams.get('origin');
	const scopeValue = url.searchParams.get('historyScope');
	const origin: 'official' | 'ujkor' | undefined = originValue === 'official' || originValue === 'ujkor' ? originValue : undefined;
	const historyScope: 'hungarian' | 'global' | undefined = scopeValue === 'hungarian' || scopeValue === 'global' ? scopeValue : undefined;
	const filters = { query: url.searchParams.get('q')?.trim() || undefined, status, origin, historyScope,
		curriculumId: optionalId(url.searchParams.get('curriculumId')), periodId: optionalId(url.searchParams.get('periodId')), topicId: optionalId(url.searchParams.get('topicId')), year: optionalId(url.searchParams.get('year')) };
	const references = await getReferenceData();
	const taskVersions = await listFilteredAdminTasks(filters);
	return { ...references, taskVersions, filters };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const actor = requireAdmin(locals);
		const raw = Object.fromEntries(await request.formData());
		const parsed = taskMetadataSchema.safeParse(raw);
		if (!parsed.success) return fail(400, { message: parsed.error.issues.map((issue) => issue.message).join(' '), values: raw });
		let versionId: number;
		try {
			const version = await createTask(actor, parsed.data);
			versionId = version.id;
		} catch (error) {
			return fail(400, { message: error instanceof Error ? error.message : 'Aufgabe konnte nicht erstellt werden.', values: raw });
		}
		redirect(303, `/admin/aufgaben/${versionId}`);
	},
	archive: async ({ request, locals }) => taskStatusAction(request, locals, 'archive'),
	restore: async ({ request, locals }) => taskStatusAction(request, locals, 'restore')
};

async function taskStatusAction(request: Request, locals: App.Locals, action: 'archive' | 'restore') {
	const actor = requireAdmin(locals); const id = positiveId.safeParse((await request.formData()).get('taskId'));
	if (!id.success) return fail(400, { message: 'Ungültige Aufgaben-ID.' });
	try { if (action === 'archive') await archiveTask(actor, id.data); else await restoreTask(actor, id.data); return { message: action === 'archive' ? 'Aufgabe archiviert.' : 'Aufgabe wiederhergestellt.' }; }
	catch (error) { return fail(400, { message: error instanceof Error ? error.message : 'Status konnte nicht geändert werden.' }); }
}
