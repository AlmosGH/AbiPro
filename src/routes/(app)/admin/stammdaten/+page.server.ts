import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdmin } from '$lib/server/authorization';
import { getReferenceData } from '$lib/server/content';
import { getDb } from '$lib/server/db';
import { curricula, examSessions } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

const idSchema = z.coerce.number().int().positive();
const curriculumSchema = z.object({ id: idSchema.optional(), code: z.string().trim().min(2).max(30), name: z.string().trim().min(2).max(100) });
const sessionSchema = z.object({ id: idSchema.optional(), year: z.coerce.number().int().min(2000).max(2100), session: z.enum(['spring', 'autumn']), officialCode: z.string().trim().max(100).optional() });

function values(formData: FormData) { return Object.fromEntries(formData); }
function databaseFailure(error: unknown) { return fail(400, { message: `Änderung nicht möglich: ${error instanceof Error ? error.message : 'Unbekannter Datenbankfehler'}` }); }

export const load: PageServerLoad = async ({ locals }) => { requireAdmin(locals); return getReferenceData(); };

export const actions: Actions = {
	saveCurriculum: async ({ request, locals }) => {
		requireAdmin(locals); const parsed = curriculumSchema.safeParse(values(await request.formData()));
		if (!parsed.success) return fail(400, { message: 'Lehrplan: Bitte prüfe Code und Name.' });
		try { const { id, ...row } = parsed.data; if (id) await getDb().update(curricula).set(row).where(eq(curricula.id, id)); else await getDb().insert(curricula).values(row); return { message: 'Lehrplan gespeichert.' }; } catch (error) { return databaseFailure(error); }
	},
	saveSession: async ({ request, locals }) => {
		requireAdmin(locals); const parsed = sessionSchema.safeParse(values(await request.formData()));
		if (!parsed.success) return fail(400, { message: 'Prüfungstermin: Bitte prüfe Jahr und Session.' });
		try { const { id, officialCode, ...row } = parsed.data; const values = { ...row, officialCode: officialCode || null }; if (id) await getDb().update(examSessions).set(values).where(eq(examSessions.id, id)); else await getDb().insert(examSessions).values(values); return { message: 'Prüfungstermin gespeichert.' }; } catch (error) { return databaseFailure(error); }
	},
	deleteCurriculum: async ({ request, locals }) => deleteRow(request, locals, curricula),
	deleteSession: async ({ request, locals }) => deleteRow(request, locals, examSessions)
};

async function deleteRow(request: Request, locals: App.Locals, table: typeof curricula | typeof examSessions) {
	requireAdmin(locals); const parsed = idSchema.safeParse((await request.formData()).get('id'));
	if (!parsed.success) return fail(400, { message: 'Ungültige ID.' });
	try { await getDb().delete(table).where(eq(table.id, parsed.data)); return { message: 'Eintrag gelöscht.' }; } catch (error) { return databaseFailure(error); }
}
