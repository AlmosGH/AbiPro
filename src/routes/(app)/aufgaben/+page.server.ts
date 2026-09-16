import { z } from 'zod';
import { getReferenceData, listPublishedTasks } from '$lib/server/content';
import type { PageServerLoad } from './$types';
import { requireActor } from '$lib/server/authorization';
import { getPracticedTaskVersionIds, getProfileProgress } from '$lib/server/profile-progress';

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
	const sortValue = url.searchParams.get('sort');
	const sort = sortValue === 'unpracticed' || sortValue === 'weakest' || sortValue === 'year'
		? sortValue
		: 'newest';
	const page = optionalId(url.searchParams.get('page')) ?? 1;
	const taskRows = await listPublishedTasks(filters);
	const references = await getReferenceData();
	const practiced = await getPracticedTaskVersionIds(actor.userId);
	const progress = sort === 'weakest' ? await getProfileProgress(actor.userId) : null;
	const topicScores = new Map(progress?.topics.map((topic) => [topic.name, topic.averagePercent ?? 101]) ?? []);
	const tasks = taskRows.map((task) => ({ ...task, practiced: practiced.has(task.taskVersionId) })).sort((a, b) => {
		if (sort === 'unpracticed') return Number(a.practiced) - Number(b.practiced) || b.year - a.year;
		if (sort === 'weakest') {
			const aScore = Math.min(...a.topics.map((topic) => topicScores.get(topic) ?? 101), 101);
			const bScore = Math.min(...b.topics.map((topic) => topicScores.get(topic) ?? 101), 101);
			return aScore - bScore || b.year - a.year;
		}
		return b.year - a.year || a.title.localeCompare(b.title, 'de');
	});
	const pageSize = 12;
	const pageCount = Math.max(1, Math.ceil(tasks.length / pageSize));
	const currentPage = Math.min(page, pageCount);
	return {
		tasks: tasks.slice(0, currentPage * pageSize),
		total: tasks.length,
		page: currentPage,
		pageCount,
		filters: { ...filters, sort },
		...references
	};
};
