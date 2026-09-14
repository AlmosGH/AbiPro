import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

const loginSchema = z.object({ email: z.email(), password: z.string().min(1), next: z.string().optional() });

function safeNext(value: string | undefined) {
	return value?.startsWith('/') && !value.startsWith('//') ? value : '/profil';
}

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.userId && locals.profile) redirect(303, '/profil');
	return {
		next: safeNext(url.searchParams.get('next') ?? undefined),
		callbackFailed: url.searchParams.get('callback') === 'failed'
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const values = Object.fromEntries(await request.formData());
		const email = typeof values.email === 'string' ? values.email : '';
		const parsed = loginSchema.safeParse(values);
		if (!parsed.success) return fail(400, { message: 'Bitte gib eine gültige E-Mail-Adresse und dein Passwort ein.', email });

		const { error } = await locals.supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
		if (error) return fail(400, { message: 'E-Mail-Adresse oder Passwort ist ungültig.', email: parsed.data.email });
		redirect(303, safeNext(parsed.data.next));
	}
};
