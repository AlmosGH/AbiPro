import { describe, expect, it } from 'vitest';
import { deterministicInputHash } from './practice';

describe('grading audit input hash', () => {
	it('is stable across object key insertion order', () => {
		expect(deterministicInputHash({ response: { optionId: 'a', kind: 'choice' }, version: 1 }))
			.toBe(deterministicInputHash({ version: 1, response: { kind: 'choice', optionId: 'a' } }));
	});

	it('changes when the answer or server rule changes', () => {
		const base = deterministicInputHash({ response: ['a'], correct: ['a'], maximum: 1 });
		expect(deterministicInputHash({ response: ['b'], correct: ['a'], maximum: 1 })).not.toBe(base);
		expect(deterministicInputHash({ response: ['a'], correct: ['b'], maximum: 1 })).not.toBe(base);
	});
});
