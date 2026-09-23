import { z } from 'zod';
import { getReferenceData, listPublishedTasks } from '$lib/server/content';
import type { PageServerLoad } from './$types';
import { getPracticedTaskVersionIds, getProfileProgress } from '$lib/server/profile-progress';
import { timeQuery } from '$lib/server/query-timing';

const positiveInteger = z.coerce.number().int().positive();
function optionalId(value: string | null) {
	const result = positiveInteger.safeParse(value);
	return result.success ? result.data : undefined;
}

export const load: PageServerLoad = async ({ url, locals, depends }) => {
	depends('app:tasks');
	const userId = locals.profile ? locals.userId : null;
	const query = url.searchParams.get('q')?.trim() || undefined;
	const sessionValue = url.searchParams.get('session');
	const session: 'spring' | 'autumn' | undefined = sessionValue === 'spring' || sessionValue === 'autumn' ? sessionValue : undefined;
	const originValue = url.searchParams.get('origin');
	const origin: 'official' | 'ujkor' | undefined = originValue === 'official' || originValue === 'ujkor' ? originValue : undefined;
	const scopeValue = url.searchParams.get('historyScope');
	const historyScope: 'hungarian' | 'global' | undefined = scopeValue === 'hungarian' || scopeValue === 'global' ? scopeValue : undefined;
	const filters = {
		query,
		origin,
		historyScope,
		curriculumId: optionalId(url.searchParams.get('curriculumId')),
		periodId: optionalId(url.searchParams.get('periodId')),
		topicId: optionalId(url.searchParams.get('topicId')),
		year: optionalId(url.searchParams.get('year')),
		session
	};
	const sortValue = url.searchParams.get('sort');
	const requestedSort = sortValue === 'unpracticed' || sortValue === 'weakest' || sortValue === 'year'
		? sortValue
		: 'newest';
	const sort = userId || (requestedSort !== 'unpracticed' && requestedSort !== 'weakest') ? requestedSort : 'newest';
	const page = optionalId(url.searchParams.get('page')) ?? 1;
	const [taskRows, references, practiced, progress] = await timeQuery('task_browsing', () => Promise.all([
		listPublishedTasks(filters),
		getReferenceData(),
		userId ? getPracticedTaskVersionIds(userId) : Promise.resolve(new Set<number>()),
		userId && sort === 'weakest' ? getProfileProgress(userId) : Promise.resolve(null)
	]), { userId: userId ?? undefined });
	const topicScores = new Map(progress?.topics.map((topic) => [topic.name, topic.averagePercent ?? 101]) ?? []);
	const tasks = taskRows.map((task) => ({ ...task, practiced: practiced.has(task.taskVersionId) })).sort((a, b) => {
		if (sort === 'unpracticed') return Number(a.practiced) - Number(b.practiced) || (b.year ?? 0) - (a.year ?? 0);
		if (sort === 'weakest') {
			const aScore = Math.min(...a.topics.map((topic) => topicScores.get(topic) ?? 101), 101);
			const bScore = Math.min(...b.topics.map((topic) => topicScores.get(topic) ?? 101), 101);
			return aScore - bScore || (b.year ?? 0) - (a.year ?? 0);
		}
		return (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title, 'de');
	});
	const pageSize = 12;
	const pageCount = Math.max(1, Math.ceil(tasks.length / pageSize));
	const currentPage = Math.min(page, pageCount);
	return {
		signedIn: Boolean(userId),
		tasks: tasks.slice(0, currentPage * pageSize),
		total: tasks.length,
		page: currentPage,
		pageCount,
		filters: { ...filters, sort },
		...references
	};
};
