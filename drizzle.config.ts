import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_MIGRATION_URL) {
	throw new Error('DATABASE_MIGRATION_URL is not set');
}

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	out: './drizzle',
	dbCredentials: { url: process.env.DATABASE_MIGRATION_URL },
	verbose: true,
	strict: true
});
