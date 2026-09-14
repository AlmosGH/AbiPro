import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import type { Profile } from '$lib/server/db/schema';

export interface Actor {
	userId: string;
	profile: Profile;
}

export function requireActor(locals: App.Locals, redirectTo = '/login'): Actor {
	if (!locals.userId || !locals.profile) redirect(303, redirectTo);
	return { userId: locals.userId, profile: locals.profile };
}

export function requireAdmin(locals: App.Locals): Actor {
	const actor = requireActor(locals);
	if (actor.profile.role !== 'admin') error(403, 'Diese Seite ist nur für Administratoren verfügbar.');
	return actor;
}

export function actorFromEvent(event: RequestEvent): Actor {
	return requireActor(event.locals);
}
