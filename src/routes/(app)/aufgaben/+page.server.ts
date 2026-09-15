import { z } from 'zod';
import { getReferenceData, listPublishedTasks } from '$lib/server/content';
import type { PageServerLoad } from './$types';
import { requireActor } from '$lib/server/authorization';
import { getPracticedTaskVersionIds } from '$lib/server/profile-progress';

const positiveInteger = z.coerce.number().int().positive();
function optionalId(value: string | null) {
	const result = positiveInteger.safeParse(value);
	return result.success ? result.data : undefined;
}

export const load: PageServerLoad = async ({ url, locals }) => {
	const actor = requireActor(locals);
	const query = url.searchParams.get('q')?.trim() || undefined;
	const sessionValue = url.searchParams.get('session');
	const session: 'spring' | 'autumn' | undefined = sessionValue === 'spring' || sessionValue === 'autumn' ? sessionValue : undefined;
	const filters = {
		query,
		curriculumId: optionalId(url.searchParams.get('curriculumId')),
		periodId: optionalId(url.searchParams.get('periodId')),
		topicId: optionalId(url.searchParams.get('topicId')),
		year: optionalId(url.searchParams.get('year')),
		session
	};
	const [taskRows, references, practiced] = await Promise.all([listPublishedTasks(filters), getReferenceData(), getPracticedTaskVersionIds(actor.userId)]);
	return { tasks: taskRows.map((task) => ({ ...task, practiced: practiced.has(task.taskVersionId) })), filters, ...references };
};
