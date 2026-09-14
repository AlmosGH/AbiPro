import { describe, expect, it } from 'vitest';
import { newQuestion, newSource, questionPayload, sourcePayload, validationSummary } from './admin';

describe('structured admin editor model', () => {
	it.each(['choice', 'multiple_choice', 'matching', 'ordering', 'short_text'] as const)('serializes a %s question', (kind) => {
		const question = newQuestion(kind); question.prompt = 'Frage';
		if (kind === 'choice' || kind === 'multiple_choice') question.options.forEach((option) => option.label = option.id);
		if (kind === 'matching') { question.left[0].label = 'Links'; question.right[0].label = 'Rechts'; }
		if (kind === 'ordering') question.items.forEach((item) => item.label = item.id);
		if (kind === 'short_text') question.criteria = ['Kriterium'];
		const payload = questionPayload(question);
		expect(payload.kind).toBe(kind);
		expect(payload.config.kind).toBe(kind);
		expect(payload.gradingRule.kind).toBe(kind);
	});

	it('serializes each source kind without editor-only fields', () => {
		const text = newSource('text'); text.text = 'Quelle';
		const image = newSource('image'); image.assetId = 7;
		const map = newSource('map'); map.publicUrl = '/test-data/map.png';
		expect(sourcePayload(text)).toMatchObject({ kind: 'text', content: { text: 'Quelle' }, assetId: null });
		expect(sourcePayload(image)).toMatchObject({ kind: 'image', content: null, assetId: 7 });
		expect(sourcePayload(map)).toMatchObject({ kind: 'map', content: { url: '/test-data/map.png' }, assetId: null });
	});

	it('reports incomplete content and point mismatches', () => {
		const source = newSource('text'); const question = newQuestion('choice'); question.maxPoints = 1;
		const issues = validationSummary(2, [source], [question]);
		expect(issues).toContain('Quelle 1: Quellentext fehlt.');
		expect(issues.some((issue) => issue.includes('Frage 1'))).toBe(true);
		expect(issues.some((issue) => issue.includes('Aufgabe: 2'))).toBe(true);
	});
});
