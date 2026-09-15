import { describe, expect, it } from 'vitest';
import { MOCK_EXAM_CONFIG } from './config';
import { inspectExamPool, selectExamTasks, type ExamCandidate } from './selection';

const completePool: ExamCandidate[] = MOCK_EXAM_CONFIG.distribution.map((rule) => ({
	taskVersionId: rule.position * 10,
	taskId: rule.position,
	examPosition: rule.position,
	maxPoints: rule.maximumPoints
}));

describe('mock-exam task selection', () => {
	it('keeps the official defaults internally consistent', () => {
		expect(MOCK_EXAM_CONFIG.distribution).toHaveLength(MOCK_EXAM_CONFIG.taskCount);
		expect(MOCK_EXAM_CONFIG.distribution.reduce((total, rule) => total + rule.maximumPoints, 0)).toBe(MOCK_EXAM_CONFIG.targetMaximumScore);
	});

	it('selects one unique version for every persisted exam position', () => {
		const selected = selectExamTasks([...completePool, { ...completePool[0], taskVersionId: 999, taskId: 999 }], MOCK_EXAM_CONFIG, () => 0);
		expect(selected).toHaveLength(12);
		expect(selected.map((task) => task.examPosition)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
		expect(new Set(selected.map((task) => task.taskVersionId))).toHaveLength(12);
		expect(selected.reduce((total, task) => total + task.maxPoints, 0)).toBe(50);
	});

	it('reports a precise readiness failure without relaxing a rule', () => {
		const pool = completePool.filter((candidate) => candidate.examPosition !== 7);
		const readiness = inspectExamPool(pool, MOCK_EXAM_CONFIG);
		expect(readiness.ready).toBe(false);
		expect(readiness.missingRules).toEqual([{ position: 7, label: '19. Jahrhundert – ungarische Geschichte', maximumPoints: 4 }]);
		expect(() => selectExamTasks(pool, MOCK_EXAM_CONFIG)).toThrow('Es fehlen veröffentlichte Aufgabenversionen für: 7');
	});
});
