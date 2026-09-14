import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function safeNext(value: string | null) {
	return value?.startsWith('/') && !value.startsWith('//') ? value : '/profil';
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) redirect(303, safeNext(url.searchParams.get('next')));
	}
	redirect(303, '/login?callback=failed');
};
