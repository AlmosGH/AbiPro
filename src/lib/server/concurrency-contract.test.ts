import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8');

describe('attempt transaction and concurrency contracts', () => {
	it('serializes submissions and uses an atomic autosave upsert', () => {
		for (const file of ['./practice.ts', './mock-exam.ts']) {
			const code = source(file);
			expect(code).toContain(".for('update')");
			expect(code).toContain('.onConflictDoUpdate({');
		}
	});

	it('enforces database uniqueness for autosave and AI retry idempotency', () => {
		const initial = source('../../../drizzle/0000_initial_schema.sql');
		const ai = source('../../../drizzle/0004_nice_blue_blade.sql');
		expect(initial).toContain('attempt_answers_attempt_task_question_unique');
		expect(ai).toContain('grading_runs_idempotency_idx');
	});

	it('serializes rate-limit counters per learner and action', () => {
		expect(source('./rate-limit.ts')).toContain('pg_advisory_xact_lock');
	});
});
