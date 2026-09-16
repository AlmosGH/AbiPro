import { requireActor } from '$lib/server/authorization';
import { getProfileProgress } from '$lib/server/profile-progress';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const actor = requireActor(locals);
	return { progress: await getProfileProgress(actor.userId) };
};
