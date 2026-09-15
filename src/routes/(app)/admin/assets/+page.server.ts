import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin } from '$lib/server/authorization';
import { createAssetRecord, deleteAssetRecord, listAssetRecords, replaceAssetRecord, updateAssetRecord } from '$lib/server/content';
import { createAssetSignedUrl, deleteAssetFile, uploadAssetFile } from '$lib/server/storage';
import type { Actions, PageServerLoad } from './$types';

const idSchema = z.coerce.number().int().positive();
const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);
const maximumSize = 10 * 1024 * 1024;

function validateFile(value: FormDataEntryValue | null) {
	if (!(value instanceof File) || value.size === 0) return 'Wähle eine Datei aus.';
	if (!acceptedTypes.has(value.type)) return 'Erlaubt sind JPEG, PNG, WebP, GIF und PDF.';
	if (value.size > maximumSize) return 'Die Datei darf höchstens 10 MB groß sein.';
	return null;
}

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	const rows = await listAssetRecords();
	const assetRows = [];
	for (const asset of rows) {
		assetRows.push({ ...asset, signedUrl: await createAssetSignedUrl(asset.path) });
	}
	return { assets: assetRows, storageConfigured: assetRows.length === 0 || assetRows.some((asset) => asset.signedUrl !== null) };
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		const actor = requireAdmin(locals); const formData = await request.formData(); const file = formData.get('file');
		const fileError = validateFile(file); if (fileError) return fail(400, { message: fileError });
		const altText = formData.get('altText')?.toString().trim() ?? '';
		let uploadedPath: string | null = null;
		try {
			const uploaded = await uploadAssetFile(actor.userId, file as File); uploadedPath = uploaded.path;
			await createAssetRecord(actor, { path: uploaded.path, mimeType: (file as File).type, sizeBytes: (file as File).size, altText });
			return { message: 'Asset hochgeladen.' };
		} catch (error) {
			if (uploadedPath) await deleteAssetFile(uploadedPath).catch(() => undefined);
			return fail(400, { message: error instanceof Error ? error.message : 'Asset konnte nicht hochgeladen werden.' });
		}
	},
	update: async ({ request, locals }) => {
		const actor = requireAdmin(locals); const formData = await request.formData(); const id = idSchema.safeParse(formData.get('id'));
		if (!id.success) return fail(400, { message: 'Ungültige Asset-ID.' });
		try { await updateAssetRecord(actor, id.data, formData.get('altText')?.toString().trim() || null); return { message: 'Asset-Metadaten gespeichert.' }; }
		catch (error) { return fail(400, { message: error instanceof Error ? error.message : 'Asset konnte nicht gespeichert werden.' }); }
	},
	replace: async ({ request, locals }) => {
		const actor = requireAdmin(locals); const formData = await request.formData(); const id = idSchema.safeParse(formData.get('id')); const file = formData.get('file');
		if (!id.success) return fail(400, { message: 'Ungültige Asset-ID.' }); const fileError = validateFile(file); if (fileError) return fail(400, { message: fileError });
		let uploadedPath: string | null = null;
		try {
			const uploaded = await uploadAssetFile(actor.userId, file as File); uploadedPath = uploaded.path;
			const { previous } = await replaceAssetRecord(actor, id.data, { path: uploaded.path, mimeType: (file as File).type, sizeBytes: (file as File).size, altText: formData.get('altText')?.toString().trim() });
			await deleteAssetFile(previous.path).catch(() => undefined);
			return { message: 'Asset-Datei ersetzt.' };
		} catch (error) {
			if (uploadedPath) await deleteAssetFile(uploadedPath).catch(() => undefined);
			return fail(400, { message: error instanceof Error ? error.message : 'Asset konnte nicht ersetzt werden.' });
		}
	},
	delete: async ({ request, locals }) => {
		const actor = requireAdmin(locals); const id = idSchema.safeParse((await request.formData()).get('id'));
		if (!id.success) return fail(400, { message: 'Ungültige Asset-ID.' });
		try { const asset = await deleteAssetRecord(actor, id.data); await deleteAssetFile(asset.path); return { message: 'Asset gelöscht.' }; }
		catch (error) { return fail(400, { message: error instanceof Error ? error.message : 'Asset konnte nicht gelöscht werden.' }); }
	}
};
