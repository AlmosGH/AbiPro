import { describe, expect, it } from 'vitest';
import { asDatabaseDate } from './database-time';

describe('database timestamp normalization', () => {
	it('accepts Date instances', () => {
		const value = new Date('2026-09-15T08:00:00.000Z');
		expect(asDatabaseDate(value)).toBe(value);
	});

	it('normalizes timestamps returned as strings by the postgres driver', () => {
		expect(asDatabaseDate('2026-09-15T08:00:00.000Z').getTime()).toBe(1789459200000);
	});

	it('rejects invalid database values', () => {
		expect(() => asDatabaseDate('not-a-timestamp')).toThrow('invalid timestamp');
	});
});
