import { and, eq, ne } from 'drizzle-orm';
import type { Actor } from '$lib/server/authorization';
import { getDb } from '$lib/server/db';
import { tasks, taskVersions } from '$lib/server/db/schema';

export async function publishTaskVersion(actor: Actor, taskVersionId: number) {
	if (actor.profile.role !== 'admin') throw new Error('Administrator access is required.');

	return getDb().transaction(async (transaction) => {
		const [version] = await transaction
			.select({ id: taskVersions.id, taskId: taskVersions.taskId, status: taskVersions.status })
			.from(taskVersions)
			.where(eq(taskVersions.id, taskVersionId))
			.for('update');

		if (!version) throw new Error('Task version not found.');
		if (version.status !== 'draft') throw new Error('Only a draft task version can be published.');

		await transaction
			.update(taskVersions)
			.set({ status: 'retired' })
			.where(and(
				eq(taskVersions.taskId, version.taskId),
				eq(taskVersions.status, 'published'),
				ne(taskVersions.id, version.id)
			));

		const [published] = await transaction
			.update(taskVersions)
			.set({ status: 'published', publishedAt: new Date() })
			.where(and(eq(taskVersions.id, version.id), eq(taskVersions.status, 'draft')))
			.returning({ id: taskVersions.id });

		if (!published) throw new Error('The task version changed before it could be published.');
		await transaction.update(tasks).set({ status: 'published' }).where(eq(tasks.id, version.taskId));
		return published;
	});
}
