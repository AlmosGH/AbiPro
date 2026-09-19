import { requireActor } from '$lib/server/authorization';
import { getProfileProgress } from '$lib/server/profile-progress';
import type { PageServerLoad } from './$types';
import { timeQuery } from '$lib/server/query-timing';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('app:profile-progress');
	const actor = requireActor(locals);
	return { progress: await timeQuery('profile_aggregates', () => getProfileProgress(actor.userId), { userId: actor.userId }) };
};
