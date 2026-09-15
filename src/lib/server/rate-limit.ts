import { and, count, eq, gt, lt, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { rateLimitEvents } from '$lib/server/db/schema';

const policies = {
	attempt_create: { limit: 20, windowMs: 60_000 },
	attempt_submit: { limit: 12, windowMs: 60_000 },
	ai_grade: { limit: 10, windowMs: 60_000 }
} as const;

export type RateLimitedAction = keyof typeof policies;

export async function enforceRateLimit(userId: string, action: RateLimitedAction) {
	const policy = policies[action];
	await getDb().transaction(async (transaction) => {
		await transaction.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`rate:${userId}:${action}`}, 0))`);
		const since = new Date(Date.now() - policy.windowMs);
		const [row] = await transaction.select({ total: count() }).from(rateLimitEvents).where(and(
			eq(rateLimitEvents.userId, userId), eq(rateLimitEvents.action, action), gt(rateLimitEvents.createdAt, since)
		));
		if (row.total >= policy.limit) throw new Error('Zu viele Anfragen. Bitte warte kurz und versuche es erneut.');
		await transaction.insert(rateLimitEvents).values({ userId, action });
		await transaction.delete(rateLimitEvents).where(and(eq(rateLimitEvents.userId, userId), eq(rateLimitEvents.action, action), lt(rateLimitEvents.createdAt, new Date(Date.now() - 86_400_000))));
	});
}
