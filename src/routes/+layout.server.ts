import type { LayoutServerLoad } from './$types';
import { resolveLocale } from '$lib/i18n';

export const load: LayoutServerLoad = ({ cookies, request }) => ({
	locale: resolveLocale(cookies.get('locale'), request.headers.get('accept-language'))
});
