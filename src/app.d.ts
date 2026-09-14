import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '$lib/server/db/schema';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			claims: Record<string, unknown> | null;
			userId: string | null;
			profile: Profile | null;
		}
	}
}

export {};
