import { error } from '@sveltejs/kit';
import { getPublishedTask } from '$lib/server/content';
import { createAssetSignedUrl } from '$lib/server/storage';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const task = await getPublishedTask(params.slug);
	if (!task) error(404, 'Aufgabe nicht gefunden.');
	const sources = await Promise.all(task.sources.map(async ({ assetPath, assetMimeType: _assetMimeType, assetId: _assetId, taskVersionId: _taskVersionId, createdAt: _createdAt, updatedAt: _updatedAt, ...source }) => ({
		...source,
		assetUrl: assetPath ? await createAssetSignedUrl(assetPath) : null
	})));
	return { task: { ...task, sources } };
};
