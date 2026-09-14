import { requireAdmin } from '$lib/server/authorization';
import { getAdminDashboard } from '$lib/server/content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	return getAdminDashboard();
};
