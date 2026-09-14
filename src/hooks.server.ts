import { env as publicEnv } from '$env/dynamic/public';
import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { findProfile } from '$lib/server/profiles';

export const handle: Handle = async ({ event, resolve }) => {
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
	event.locals.profile = userId ? await findProfile(userId) : null;

	return resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-range' || name === 'x-supabase-api-version'
	});
};
