import type { LayoutServerLoad } from './$types';
import { requireAdmin } from '$lib/server/authorization';

export const load: LayoutServerLoad = ({ locals }) => {
	requireAdmin(locals);
	return {};
};
