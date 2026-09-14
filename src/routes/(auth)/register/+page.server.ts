import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

const registrationSchema = z.object({ displayName: z.string().trim().min(1).max(100), email: z.email(), password: z.string().min(8).max(128) });

export const load: PageServerLoad = ({ locals }) => {
	if (locals.userId && locals.profile) redirect(303, '/profil');
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const values = Object.fromEntries(await request.formData());
		const email = typeof values.email === 'string' ? values.email : '';
		const displayName = typeof values.displayName === 'string' ? values.displayName : '';
		const parsed = registrationSchema.safeParse(values);
		if (!parsed.success) return fail(400, { message: 'Prüfe deinen Namen, deine E-Mail-Adresse und das Passwort (mindestens 8 Zeichen).', email, displayName });

		const { data, error } = await locals.supabase.auth.signUp({
			email: parsed.data.email,
			password: parsed.data.password,
			options: { emailRedirectTo: `${url.origin}/auth/callback?next=/profil`, data: { display_name: parsed.data.displayName } }
		});
		if (error) return fail(400, { message: 'Die Registrierung ist fehlgeschlagen. Bitte versuche es erneut.', email: parsed.data.email, displayName: parsed.data.displayName });
		if (data.session) redirect(303, '/profil');
		return { checkEmail: true, email: parsed.data.email, displayName: parsed.data.displayName };
	}
};
