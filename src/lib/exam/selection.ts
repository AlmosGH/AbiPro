import type { ExamConfiguration } from './config';

export interface ExamCandidate {
	taskVersionId: number;
	taskId: number;
	examPosition: number;
	maxPoints: number;
}

export interface ExamReadiness {
	ready: boolean;
	eligibleCount: number;
	missingRules: { position: number; label: string; maximumPoints: number }[];
}

export function inspectExamPool(candidates: readonly ExamCandidate[], config: ExamConfiguration): ExamReadiness {
	const missingRules = config.distribution
		.filter((rule) => !candidates.some((candidate) => candidate.examPosition === rule.position && candidate.maxPoints === rule.maximumPoints))
		.map(({ position, label, maximumPoints }) => ({ position, label, maximumPoints }));
	return { ready: missingRules.length === 0, eligibleCount: candidates.length, missingRules };
}

export function selectExamTasks(
	candidates: readonly ExamCandidate[],
	config: ExamConfiguration,
	random: () => number = Math.random
): ExamCandidate[] {
	const readiness = inspectExamPool(candidates, config);
	if (!readiness.ready) {
		const missing = readiness.missingRules.map((rule) => `${rule.position} (${rule.label}, ${rule.maximumPoints} P.)`).join(', ');
		throw new Error(`Der Prüfungsmodus ist noch nicht bereit. Es fehlen veröffentlichte Aufgabenversionen für: ${missing}.`);
	}
	const selected: ExamCandidate[] = [];
	const usedTasks = new Set<number>();
	for (const rule of config.distribution) {
		const pool = candidates.filter((candidate) => candidate.examPosition === rule.position && candidate.maxPoints === rule.maximumPoints && !usedTasks.has(candidate.taskId));
		if (!pool.length) throw new Error(`Der Prüfungsmodus kann keine ${config.taskCount} unterschiedlichen Aufgaben zusammenstellen.`);
		const candidate = pool[Math.floor(random() * pool.length)];
		selected.push(candidate);
		usedTasks.add(candidate.taskId);
	}
	const score = selected.reduce((total, candidate) => total + candidate.maxPoints, 0);
	if (selected.length !== config.taskCount || score !== config.targetMaximumScore) {
		throw new Error('Der verfügbare Aufgabenpool erfüllt die konfigurierte Prüfungszusammensetzung nicht.');
	}
	return selected;
}
