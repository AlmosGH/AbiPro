import { z } from 'zod';
import { gradingRuleSchema, questionConfigSchema } from '$lib/types/questions';

const positiveId = z.coerce.number().int().positive();

export const taskMetadataSchema = z.object({
	slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Der Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.'),
	title: z.string().trim().min(3).max(200),
	instructions: z.string().trim().max(5000).optional().default(''),
	curriculumId: positiveId,
	periodId: positiveId,
	examSessionId: positiveId,
	examPosition: z.preprocess((value) => value === '' || value === null ? null : value, z.coerce.number().int().min(1).max(12).nullable()).optional().default(null),
	maxPoints: z.coerce.number().positive().max(1000)
});

export const sourceDraftSchema = z.object({
	kind: z.enum(['text', 'image', 'table', 'map']),
	title: z.string().trim().max(200).nullable().optional(),
	content: z.record(z.string(), z.unknown()).nullable().optional(),
	assetId: positiveId.nullable().optional()
}).superRefine((source, context) => {
	if (!source.content && !source.assetId) context.addIssue({ code: 'custom', message: 'Eine Quelle benötigt Inhalt oder ein Asset.' });
	if (source.kind === 'text' && typeof source.content?.text !== 'string') context.addIssue({ code: 'custom', message: 'Eine Textquelle benötigt content.text.' });
	if (source.kind === 'table') {
		if (!Array.isArray(source.content?.headers) || !Array.isArray(source.content?.rows)) {
			context.addIssue({ code: 'custom', message: 'Eine Tabelle benötigt content.headers und content.rows.' });
		} else {
			const headers = source.content.headers;
			if (!headers.every((header) => typeof header === 'string') || !source.content.rows.every((row) => Array.isArray(row) && row.length === headers.length && row.every((cell) => typeof cell === 'string'))) {
				context.addIssue({ code: 'custom', message: 'Alle Tabellenzeilen müssen zur Spaltenzahl passen und Textwerte enthalten.' });
			}
		}
	}
});

export const questionDraftSchema = z.object({
	kind: z.enum(['choice', 'multiple_choice', 'matching', 'ordering', 'short_text']),
	prompt: z.string().trim().min(1).max(3000),
	config: questionConfigSchema,
	gradingRule: gradingRuleSchema,
	maxPoints: z.coerce.number().positive().max(100)
}).superRefine((question, context) => {
	if (question.config.kind !== question.kind || question.gradingRule.kind !== question.kind) {
		context.addIssue({ code: 'custom', message: 'Fragetyp, Konfiguration und Bewertungsregel müssen übereinstimmen.' });
		return;
	}

	let optionIds: string[];
	switch (question.config.kind) {
		case 'choice':
		case 'multiple_choice': optionIds = question.config.options.map((option) => option.id); break;
		case 'matching': optionIds = [...question.config.left, ...question.config.right].map((option) => option.id); break;
		case 'ordering': optionIds = question.config.items.map((option) => option.id); break;
		case 'short_text': optionIds = []; break;
	}
	if (new Set(optionIds).size !== optionIds.length) context.addIssue({ code: 'custom', message: 'Options-IDs müssen innerhalb einer Frage eindeutig sein.' });

	if (question.kind === 'choice' && question.config.kind === 'choice' && question.gradingRule.kind === 'choice') {
		const correctOptionId = question.gradingRule.correctOptionId;
		if (!question.config.options.some((option) => option.id === correctOptionId)) context.addIssue({ code: 'custom', message: 'Die richtige Option existiert nicht.' });
	}
	if (question.kind === 'multiple_choice' && question.config.kind === 'multiple_choice' && question.gradingRule.kind === 'multiple_choice') {
		const ids = new Set(question.config.options.map((option) => option.id));
		if (question.gradingRule.correctOptionIds.some((id) => !ids.has(id))) context.addIssue({ code: 'custom', message: 'Mindestens eine richtige Option existiert nicht.' });
		if (new Set(question.gradingRule.correctOptionIds).size !== question.gradingRule.correctOptionIds.length) context.addIssue({ code: 'custom', message: 'Richtige Optionen dürfen nicht doppelt vorkommen.' });
		if (question.config.minimumSelections !== undefined && question.config.maximumSelections !== undefined && question.config.minimumSelections > question.config.maximumSelections) context.addIssue({ code: 'custom', message: 'Die Mindestauswahl darf die Maximalauswahl nicht überschreiten.' });
		if (question.config.maximumSelections !== undefined && question.config.maximumSelections > question.config.options.length) context.addIssue({ code: 'custom', message: 'Die Maximalauswahl überschreitet die Anzahl der Optionen.' });
	}
	if (question.kind === 'ordering' && question.config.kind === 'ordering' && question.gradingRule.kind === 'ordering') {
		const configured = new Set(question.config.items.map((item) => item.id));
		const correct = new Set(question.gradingRule.correctOrder);
		if (configured.size !== correct.size || [...configured].some((id) => !correct.has(id))) context.addIssue({ code: 'custom', message: 'Die korrekte Reihenfolge muss alle Elemente genau einmal enthalten.' });
	}
	if (question.kind === 'matching' && question.config.kind === 'matching' && question.gradingRule.kind === 'matching') {
		const left = new Set(question.config.left.map((item) => item.id));
		const right = new Set(question.config.right.map((item) => item.id));
		if (question.gradingRule.pairs.some((pair) => !left.has(pair.leftId) || !right.has(pair.rightId))) context.addIssue({ code: 'custom', message: 'Mindestens ein Zuordnungspaar verweist auf eine unbekannte Option.' });
		if (new Set(question.gradingRule.pairs.map((pair) => pair.leftId)).size !== question.gradingRule.pairs.length) context.addIssue({ code: 'custom', message: 'Jeder linke Eintrag darf in der Lösung nur einmal zugeordnet werden.' });
	}
});

export const taskContentSchema = z.object({
	topicIds: z.array(positiveId).min(1, 'Wähle mindestens ein Thema.').refine((ids) => new Set(ids).size === ids.length, 'Themen dürfen nicht doppelt vorkommen.'),
	sources: z.array(sourceDraftSchema).min(1, 'Füge mindestens eine Quelle hinzu.'),
	questions: z.array(questionDraftSchema).min(1, 'Füge mindestens eine Frage hinzu.')
});

export function parseJsonField<T>(value: FormDataEntryValue | null, schema: z.ZodType<T>, label: string) {
	if (typeof value !== 'string') return { success: false as const, message: `${label} fehlt.` };
	try {
		const result = schema.safeParse(JSON.parse(value));
		if (!result.success) return { success: false as const, message: `${label}: ${result.error.issues.map((issue) => issue.message).join(' ')}` };
		return { success: true as const, data: result.data };
	} catch {
		return { success: false as const, message: `${label} enthält ungültiges JSON.` };
	}
}

export function validatePointTotal(maxPoints: number, questions: Array<{ maxPoints: number }>) {
	const total = questions.reduce((sum, question) => sum + question.maxPoints, 0);
	return Math.abs(total - maxPoints) < 0.001 ? null : `Die Fragen ergeben ${total} Punkte, die Aufgabe ist aber mit ${maxPoints} Punkten angegeben.`;
}
