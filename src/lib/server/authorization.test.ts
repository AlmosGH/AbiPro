import { describe, expect, it } from 'vitest';
import { requireAdmin } from './authorization';
import type { Profile } from './db/schema';

function locals(role: Profile['role'] | null): App.Locals {
	const profile = role ? {
		id: '00000000-0000-0000-0000-000000000001', displayName: null, role,
		createdAt: new Date(), updatedAt: new Date()
	} : null;
	return { userId: profile?.id ?? null, profile, claims: null, supabase: {} as App.Locals['supabase'] };
}

describe('admin authorization', () => {
	it('accepts an authenticated administrator', () => {
		expect(requireAdmin(locals('admin')).profile.role).toBe('admin');
	});

	it('rejects an authenticated learner', () => {
		expect(() => requireAdmin(locals('learner'))).toThrow();
	});

	it('rejects an anonymous request', () => {
		expect(() => requireAdmin(locals(null))).toThrow();
	});
});
