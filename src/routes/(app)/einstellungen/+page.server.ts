import { env as publicEnv } from '$env/dynamic/public';
import { env } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requireActor } from '$lib/server/authorization';
import { getDb } from '$lib/server/db';
import { profiles } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	requireActor(locals, `/login?next=${encodeURIComponent(url.pathname)}`);
	return {};
};

export const actions: Actions = {
	updateName: async ({ locals, request }) => {
		const actor = requireActor(locals);
		const parsed = z.object({ displayName: z.string().trim().min(1).max(80) }).safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { message: 'Der Anzeigename muss 1 bis 80 Zeichen lang sein.' });
		await getDb().update(profiles).set({ displayName: parsed.data.displayName }).where(eq(profiles.id, actor.userId));
		locals.profile = { ...actor.profile, displayName: parsed.data.displayName };
		return { updated: true };
	},
	deleteAccount: async ({ locals, request }) => {
		const actor = requireActor(locals);
		if ((await request.formData()).get('confirmation') !== 'LÖSCHEN') return fail(400, { message: 'Gib LÖSCHEN ein, um die Kontolöschung zu bestätigen.' });
		if (!env.SUPABASE_SECRET_KEY || !publicEnv.PUBLIC_SUPABASE_URL) return fail(503, { message: 'Die Kontolöschung ist derzeit nicht konfiguriert.' });
		const admin = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
		const { error } = await admin.auth.admin.deleteUser(actor.userId);
		if (error) return fail(502, { message: 'Das Konto konnte nicht gelöscht werden.' });
		redirect(303, '/');
	}
};
