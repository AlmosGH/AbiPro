import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';

const bucket = 'exam-assets';

function getStorageClient() {
	const url = publicEnv.PUBLIC_SUPABASE_URL;
	const secretKey = privateEnv.SUPABASE_SECRET_KEY;
	if (!url || !secretKey) throw new Error('PUBLIC_SUPABASE_URL und SUPABASE_SECRET_KEY werden für Assets benötigt.');
	return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function safeFilename(name: string) {
	const parts = name.toLocaleLowerCase('de').replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
	return parts || 'asset';
}

export async function uploadAssetFile(userId: string, file: File) {
	const path = `${userId}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
	const { error } = await getStorageClient().storage.from(bucket).upload(path, file, {
		contentType: file.type,
		upsert: false,
		cacheControl: '3600'
	});
	if (error) throw new Error(`Upload fehlgeschlagen: ${error.message}`);
	return { bucket, path };
}

export async function deleteAssetFile(path: string) {
	const { error } = await getStorageClient().storage.from(bucket).remove([path]);
	if (error) throw new Error(`Datei konnte nicht gelöscht werden: ${error.message}`);
}

export async function createAssetSignedUrl(path: string) {
	try {
		const { data, error } = await getStorageClient().storage.from(bucket).createSignedUrl(path, 60 * 60);
		if (error) return null;
		return data.signedUrl;
	} catch {
		return null;
	}
}
