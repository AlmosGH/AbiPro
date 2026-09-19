import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { profiles, type Profile } from '$lib/server/db/schema';

export async function findProfile(userId: string): Promise<Profile | null> {
	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			const [profile] = await getDb().select().from(profiles).where(eq(profiles.id, userId)).limit(1);
			return profile ?? null;
		} catch (cause) {
			const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
			if (attempt > 0 || !['57014', 'ECONNRESET', 'ETIMEDOUT'].includes(code)) throw cause;
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}
	return null;
}
