import type { GradingRule, QuestionConfig } from './questions';

export type SourceKind = 'text' | 'image' | 'table' | 'map';
export type QuestionKind = QuestionConfig['kind'];
export interface EditorOption { id: string; label: string }
export interface EditorPair { leftId: string; rightId: string }

function id() { return crypto.randomUUID(); }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []; }

export interface EditableSource {
	clientId: string;
	kind: SourceKind;
	title: string;
	text: string;
	assetId: number | null;
	publicUrl: string;
	headers: string[];
	rows: string[][];
}

export interface EditableQuestion {
	clientId: string;
	kind: QuestionKind;
	prompt: string;
	maxPoints: number;
	options: EditorOption[];
	correctOptionIds: string[];
	allOrNothing: boolean;
	minimumSelections: number | null;
	maximumSelections: number | null;
	left: EditorOption[];
	right: EditorOption[];
	pairs: EditorPair[];
	items: EditorOption[];
	correctOrder: string[];
	multiline: boolean;
	maximumLength: number | null;
	acceptedAnswers: string[];
	criteria: string[];
	aiEligible: boolean;
	normalizeWhitespace: boolean;
}

export function newSource(kind: SourceKind = 'text'): EditableSource {
	return { clientId: id(), kind, title: '', text: '', assetId: null, publicUrl: '', headers: ['Spalte 1', 'Spalte 2'], rows: [['', '']] };
}

export function sourceFromRecord(source: { kind: SourceKind; title: string | null; content: Record<string, unknown> | null; assetId: number | null }): EditableSource {
	const content = record(source.content);
	const headers = strings(content.headers);
	const rows = Array.isArray(content.rows) ? content.rows.map(strings) : [];
	return { clientId: id(), kind: source.kind, title: source.title ?? '', text: typeof content.text === 'string' ? content.text : '', assetId: source.assetId, publicUrl: typeof content.url === 'string' ? content.url : '', headers: headers.length ? headers : ['Spalte 1'], rows: rows.length ? rows : [['']] };
}

export function sourcePayload(source: EditableSource) {
	return {
		kind: source.kind,
		title: source.title || null,
		content: source.kind === 'text' ? { text: source.text } : source.kind === 'table' ? { headers: source.headers, rows: source.rows } : source.publicUrl ? { url: source.publicUrl } : null,
		assetId: source.kind === 'image' || source.kind === 'map' ? source.assetId : null
	};
}

function baseQuestion(kind: QuestionKind): EditableQuestion {
	return { clientId: id(), kind, prompt: '', maxPoints: 1, options: [], correctOptionIds: [], allOrNothing: true, minimumSelections: null, maximumSelections: null, left: [], right: [], pairs: [], items: [], correctOrder: [], multiline: false, maximumLength: null, acceptedAnswers: [''], criteria: [''], aiEligible: false, normalizeWhitespace: false };
}

export function newQuestion(kind: QuestionKind = 'choice'): EditableQuestion {
	const question = baseQuestion(kind);
	if (kind === 'choice' || kind === 'multiple_choice') {
		question.options = [{ id: 'a', label: '' }, { id: 'b', label: '' }];
		question.correctOptionIds = ['a'];
	} else if (kind === 'matching') {
		question.left = [{ id: 'a', label: '' }]; question.right = [{ id: '1', label: '' }]; question.pairs = [{ leftId: 'a', rightId: '1' }];
	} else if (kind === 'ordering') {
		question.items = [{ id: 'a', label: '' }, { id: 'b', label: '' }]; question.correctOrder = ['a', 'b'];
	}
	return question;
}

export function questionFromRecord(question: { kind: QuestionKind; prompt: string; maxPoints: number; config: QuestionConfig; gradingRule: GradingRule }): EditableQuestion {
	const editable = baseQuestion(question.kind); editable.prompt = question.prompt; editable.maxPoints = question.maxPoints;
	const config = question.config; const rule = question.gradingRule;
	if ((config.kind === 'choice' || config.kind === 'multiple_choice')) editable.options = structuredClone(config.options);
	if (config.kind === 'multiple_choice') { editable.minimumSelections = config.minimumSelections ?? null; editable.maximumSelections = config.maximumSelections ?? null; }
	if (config.kind === 'matching') { editable.left = structuredClone(config.left); editable.right = structuredClone(config.right); }
	if (config.kind === 'ordering') editable.items = structuredClone(config.items);
	if (config.kind === 'short_text') { editable.multiline = config.multiline; editable.maximumLength = config.maximumLength ?? null; }
	if (rule.kind === 'choice') editable.correctOptionIds = [rule.correctOptionId];
	if (rule.kind === 'multiple_choice') { editable.correctOptionIds = [...rule.correctOptionIds]; editable.allOrNothing = rule.allOrNothing; }
	if (rule.kind === 'matching') editable.pairs = structuredClone(rule.pairs);
	if (rule.kind === 'ordering') editable.correctOrder = [...rule.correctOrder];
	if (rule.kind === 'short_text') { editable.acceptedAnswers = rule.acceptedAnswers.length ? [...rule.acceptedAnswers] : ['']; editable.criteria = [...rule.criteria]; editable.aiEligible = rule.aiEligible; editable.normalizeWhitespace = rule.normalizeWhitespace ?? false; }
	return editable;
}

export function questionPayload(question: EditableQuestion) {
	const base = { kind: question.kind, prompt: question.prompt, maxPoints: question.maxPoints };
	switch (question.kind) {
		case 'choice': return { ...base, config: { kind: 'choice', options: question.options }, gradingRule: { kind: 'choice', correctOptionId: question.correctOptionIds[0] ?? '' } };
		case 'multiple_choice': return { ...base, config: { kind: 'multiple_choice', options: question.options, ...(question.minimumSelections !== null ? { minimumSelections: question.minimumSelections } : {}), ...(question.maximumSelections !== null ? { maximumSelections: question.maximumSelections } : {}) }, gradingRule: { kind: 'multiple_choice', correctOptionIds: question.correctOptionIds, allOrNothing: question.allOrNothing } };
		case 'matching': return { ...base, config: { kind: 'matching', left: question.left, right: question.right }, gradingRule: { kind: 'matching', pairs: question.pairs } };
		case 'ordering': return { ...base, config: { kind: 'ordering', items: question.items }, gradingRule: { kind: 'ordering', correctOrder: question.correctOrder } };
		case 'short_text': return { ...base, config: { kind: 'short_text', multiline: question.multiline, ...(question.maximumLength ? { maximumLength: question.maximumLength } : {}) }, gradingRule: { kind: 'short_text', acceptedAnswers: question.acceptedAnswers.filter(Boolean), criteria: question.criteria.filter(Boolean), aiEligible: question.aiEligible, normalizeWhitespace: question.normalizeWhitespace } };
	}
}

export function validationSummary(maxPoints: number, sources: EditableSource[], questions: EditableQuestion[]) {
	const issues: string[] = [];
	if (!sources.length) issues.push('Mindestens eine Quelle fehlt.');
	if (!questions.length) issues.push('Mindestens eine Frage fehlt.');
	sources.forEach((source, index) => {
		if (source.kind === 'text' && !source.text.trim()) issues.push(`Quelle ${index + 1}: Quellentext fehlt.`);
		if ((source.kind === 'image' || source.kind === 'map') && !source.assetId && !source.publicUrl.trim()) issues.push(`Quelle ${index + 1}: Asset oder öffentliche URL fehlt.`);
		if (source.kind === 'table' && (!source.headers.length || !source.rows.length)) issues.push(`Quelle ${index + 1}: Tabelle ist leer.`);
	});
	questions.forEach((question, index) => {
		if (!question.prompt.trim()) issues.push(`Frage ${index + 1}: Fragetext fehlt.`);
		if (question.kind === 'short_text' && !question.criteria.some((criterion) => criterion.trim())) issues.push(`Frage ${index + 1}: Bewertungskriterium fehlt.`);
	});
	const total = questions.reduce((sum, question) => sum + Number(question.maxPoints || 0), 0);
	if (Math.abs(total - Number(maxPoints || 0)) > 0.001) issues.push(`Fragen: ${total} Punkte; Aufgabe: ${maxPoints || 0} Punkte.`);
	return issues;
}
