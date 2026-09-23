import { env as publicEnv } from '$env/dynamic/public';
import { createServerClient } from '@supabase/ssr';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { findProfile } from '$lib/server/profiles';
import { logServerError } from '$lib/server/logger.server';
import { resolveLocale } from '$lib/i18n';

export const handle: Handle = async ({ event, resolve }) => {
	const started = performance.now();
	const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL;
	const publishableKey = publicEnv.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!supabaseUrl || !publishableKey) {
		throw new Error('PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY are required.');
	}

	event.locals.supabase = createServerClient(supabaseUrl, publishableKey, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				for (const { name, value, options } of cookiesToSet) {
					event.cookies.set(name, value, { ...options, path: '/' });
				}
			}
		}
	});

	const { data, error } = await event.locals.supabase.auth.getClaims();
	const userId = !error && typeof data?.claims?.sub === 'string' ? data.claims.sub : null;
	event.locals.claims = !error ? data?.claims ?? null : null;
	event.locals.userId = userId;
	const isPublicRoute = ['/login', '/register', '/auth/', '/datenschutz', '/impressum', '/ki-bewertung'].some((path) => event.url.pathname === path || event.url.pathname.startsWith(path));
	event.locals.profile = userId && !isPublicRoute ? await findProfile(userId) : null;

	const locale = resolveLocale(event.cookies.get('locale'), event.request.headers.get('accept-language'));
	const response = await resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-range' || name === 'x-supabase-api-version',
		transformPageChunk: ({ html }) => html.replace('%lang%', locale)
	});
	console.info(JSON.stringify({ level: 'info', type: 'hook_timing', operation: 'authentication', route: event.route.id ?? event.url.pathname, durationMs: Math.round((performance.now() - started) * 10) / 10, profileRead: Boolean(userId && !isPublicRoute) }));
	return response;
};

export const handleError: HandleServerError = ({ error, event, status }) => {
	const requestId = event.request.headers.get('x-request-id') ?? crypto.randomUUID();
	logServerError(error, { requestId, route: event.route.id ?? event.url.pathname, userId: event.locals.userId });
	return { message: status >= 500 ? 'Ein interner Fehler ist aufgetreten.' : 'Die Anfrage konnte nicht verarbeitet werden.', requestId };
};
