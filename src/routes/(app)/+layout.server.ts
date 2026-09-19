import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url, depends }) => {
	depends('app:profile');
	if (!locals.userId || !locals.profile) redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	return { profile: locals.profile };
};
