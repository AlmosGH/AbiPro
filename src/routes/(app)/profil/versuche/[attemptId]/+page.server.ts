import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireActor } from '$lib/server/authorization';
import { getAttemptHistoryDetail } from '$lib/server/profile-progress';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const actor = requireActor(locals);
	const id = z.coerce.number().int().positive().safeParse(params.attemptId);
	if (!id.success) error(404, 'Versuch nicht gefunden.');
	const detail = await getAttemptHistoryDetail(actor.userId, id.data);
	if (!detail) error(404, 'Versuch nicht gefunden.');
	return { detail };
};
