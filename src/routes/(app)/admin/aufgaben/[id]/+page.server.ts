import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin } from '$lib/server/authorization';
import { archiveTask, createDraftRevision, getAdminTaskVersion, getReferenceData, listAssetRecords, publishTaskVersion, restoreTask, saveTaskDraft } from '$lib/server/content';
import { parseJsonField, questionDraftSchema, sourceDraftSchema, taskMetadataSchema } from '$lib/server/content-validation';
import { createAssetSignedUrl } from '$lib/server/storage';
import type { Actions, PageServerLoad } from './$types';

const idSchema = z.coerce.number().int().positive();
const editableMetadataSchema = taskMetadataSchema.omit({ slug: true });

export const load: PageServerLoad = async ({ params, locals }) => {
	console.log('load', params.id);
	requireAdmin(locals);
	const id = idSchema.safeParse(params.id);
	if (!id.success) error(404, 'Aufgabe nicht gefunden.');
	const task = await getAdminTaskVersion(id.data);

	const references = await getReferenceData();

	const assetRecords = await listAssetRecords();

	if (!task) error(404, 'Aufgabe nicht gefunden.');
	const assets = await Promise.all(assetRecords.map(async (asset) => ({ ...asset, signedUrl: await createAssetSignedUrl(asset.path) })));
	return { task, assets, ...references };
};

export const actions: Actions = {
	save: async ({ params, request, locals }) => {
		const actor = requireAdmin(locals);
		const id = idSchema.safeParse(params.id);
		if (!id.success) return fail(404, { message: 'Aufgabe nicht gefunden.' });
		const formData = await request.formData();
		const metadata = editableMetadataSchema.safeParse(Object.fromEntries(formData));
		if (!metadata.success) return fail(400, { message: metadata.error.issues.map((issue) => issue.message).join(' ') });
		const topicIds = z.array(idSchema).min(1).safeParse(formData.getAll('topicIds'));
		if (!topicIds.success) return fail(400, { message: 'Wähle mindestens ein Thema.' });
		const sourceDrafts = parseJsonField(formData.get('sources'), z.array(sourceDraftSchema).min(1), 'Quellen');
		if (!sourceDrafts.success) return fail(400, { message: sourceDrafts.message });
		const questionDrafts = parseJsonField(formData.get('questions'), z.array(questionDraftSchema).min(1), 'Fragen');
		if (!questionDrafts.success) return fail(400, { message: questionDrafts.message });
		try {
			await saveTaskDraft(actor, id.data, metadata.data, topicIds.data, sourceDrafts.data, questionDrafts.data);
			return { message: 'Entwurf gespeichert.' };
		} catch (caught) {
			return fail(400, { message: caught instanceof Error ? caught.message : 'Entwurf konnte nicht gespeichert werden.' });
		}
	},
	publish: async ({ params, locals }) => {
		const actor = requireAdmin(locals);
		const id = idSchema.safeParse(params.id);
		if (!id.success) return fail(404, { message: 'Aufgabe nicht gefunden.' });
		try {
			await publishTaskVersion(actor, id.data);
		} catch (caught) {
			return fail(400, { message: caught instanceof Error ? caught.message : 'Aufgabe konnte nicht veröffentlicht werden.' });
		}
		redirect(303, `/admin/aufgaben/${id.data}`);
	},
	createRevision: async ({ params, locals }) => {
		const actor = requireAdmin(locals); const id = idSchema.safeParse(params.id);
		if (!id.success) return fail(404, { message: 'Aufgabe nicht gefunden.' });
		let draftId: number;
		try { const draft = await createDraftRevision(actor, id.data); draftId = draft.id; }
		catch (caught) { return fail(400, { message: caught instanceof Error ? caught.message : 'Neue Version konnte nicht erstellt werden.' }); }
		redirect(303, `/admin/aufgaben/${draftId}`);
	},
	archive: async ({ params, locals }) => {
		const actor = requireAdmin(locals); const id = idSchema.safeParse(params.id); if (!id.success) return fail(404, { message: 'Aufgabe nicht gefunden.' });
		const task = await getAdminTaskVersion(id.data); if (!task) return fail(404, { message: 'Aufgabe nicht gefunden.' });
		try { await archiveTask(actor, task.taskId); return { message: 'Aufgabe archiviert.' }; } catch (caught) { return fail(400, { message: caught instanceof Error ? caught.message : 'Aufgabe konnte nicht archiviert werden.' }); }
	},
	restore: async ({ params, locals }) => {
		const actor = requireAdmin(locals); const id = idSchema.safeParse(params.id); if (!id.success) return fail(404, { message: 'Aufgabe nicht gefunden.' });
		const task = await getAdminTaskVersion(id.data); if (!task) return fail(404, { message: 'Aufgabe nicht gefunden.' });
		try { await restoreTask(actor, task.taskId); return { message: 'Aufgabe wiederhergestellt.' }; } catch (caught) { return fail(400, { message: caught instanceof Error ? caught.message : 'Aufgabe konnte nicht wiederhergestellt werden.' }); }
	}
};
