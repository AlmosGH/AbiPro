import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('private schema migration hardening', () => {
	it('revokes browser roles and grants the rate-limit table only to the runtime role', () => {
		const foundation = readFileSync(new URL('../../../drizzle/0001_supabase_foundation.sql', import.meta.url), 'utf8');
		const milestone = readFileSync(new URL('../../../drizzle/0004_nice_blue_blade.sql', import.meta.url), 'utf8');
		expect(foundation).toContain('revoke all on schema app_private from public, anon, authenticated');
		expect(milestone).toContain('REVOKE ALL ON TABLE "app_private"."rate_limit_events" FROM public, anon, authenticated');
		expect(milestone).toContain('TO abipro_app');
	});
});
