import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { profiles, type Profile } from '$lib/server/db/schema';

export async function findProfile(userId: string): Promise<Profile | null> {
	const [profile] = await getDb().select().from(profiles).where(eq(profiles.id, userId)).limit(1);
	return profile ?? null;
}
