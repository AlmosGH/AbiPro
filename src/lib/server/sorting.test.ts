import { describe, expect, it } from 'vitest';
import { newestUpdatedFirst } from './sorting';

describe('newestUpdatedFirst', () => {
	it('sorts Date and serialized timestamp values newest first', () => {
		const rows = [
			{ id: 'older', updatedAt: new Date('2026-01-01T00:00:00Z'), version: 1 },
			{ id: 'newer', updatedAt: '2026-09-14T19:48:27.189Z', version: 1 }
		];
		expect(rows.sort(newestUpdatedFirst).map((row) => row.id)).toEqual(['newer', 'older']);
	});

	it('does not crash when a timestamp is absent', () => {
		const rows = [
			{ id: 'missing', updatedAt: undefined, version: 2 },
			{ id: 'dated', updatedAt: new Date('2026-01-01T00:00:00Z'), version: 1 }
		];
		expect(rows.sort(newestUpdatedFirst).map((row) => row.id)).toEqual(['dated', 'missing']);
	});

	it('uses the version as a deterministic tie-breaker', () => {
		const date = new Date('2026-01-01T00:00:00Z');
		const rows = [{ version: 1, updatedAt: date }, { version: 2, updatedAt: date }];
		expect(rows.sort(newestUpdatedFirst).map((row) => row.version)).toEqual([2, 1]);
	});
});
