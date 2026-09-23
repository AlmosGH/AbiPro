import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, depends }) => {
	depends('app:profile');
	return { profile: locals.profile };
};
