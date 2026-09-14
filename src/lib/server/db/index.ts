import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let database: ReturnType<typeof createDatabase> | undefined;

function createDatabase() {
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

	const client = postgres(env.DATABASE_URL, { max: 5, prepare: false, idle_timeout: 20 });
	return drizzle(client, { schema });
}

export function getDb() {
	database ??= createDatabase();
	return database;
}
