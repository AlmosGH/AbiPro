export interface ExamDistributionRule {
	position: number;
	maximumPoints: number;
	label: string;
}

export interface ExamConfiguration {
	taskCount: number;
	timeLimitSeconds: number;
	targetMaximumScore: number;
	eligibility: {
		curriculumCodes: readonly string[];
		minimumYear: number;
		sessions: readonly ('spring' | 'autumn')[];
	};
	distribution: readonly ExamDistributionRule[];
}

/**
 * The mock covers the official short-answer section only. The defaults mirror
 * the Hungarian intermediate history exam format in force from May 2024:
 * 12 chronological task positions, 50 points, with 100 minutes as the
 * recommended share of the 180-minute written examination.
 *
 * Sources checked 2026-09-15:
 * https://www.oktatas.hu/pub_bin/dload/kozoktatas/erettsegi/vizsgakovetelmenyek2024/tortenelem_2024_e.pdf
 * 40/2002. (V. 24.) OM decree and the official 2026 spring K2512 paper/marking guide.
 */
export const MOCK_EXAM_CONFIG: ExamConfiguration = {
	taskCount: 12,
	timeLimitSeconds: 100 * 60,
	targetMaximumScore: 50,
	eligibility: {
		curriculumCodes: ['NAT_2020'],
		minimumYear: 2024,
		sessions: ['spring', 'autumn']
	},
	distribution: [
		{ position: 1, maximumPoints: 4, label: 'Altertum – Weltgeschichte' },
		{ position: 2, maximumPoints: 4, label: 'Mittelalter – Weltgeschichte' },
		{ position: 3, maximumPoints: 4, label: 'Mittelalter – ungarische Geschichte' },
		{ position: 4, maximumPoints: 4, label: 'Frühe Neuzeit – Weltgeschichte' },
		{ position: 5, maximumPoints: 6, label: 'Frühe Neuzeit – ungarische Geschichte' },
		{ position: 6, maximumPoints: 4, label: '19. Jahrhundert – Weltgeschichte' },
		{ position: 7, maximumPoints: 4, label: '19. Jahrhundert – ungarische Geschichte' },
		{ position: 8, maximumPoints: 4, label: '20. Jahrhundert – Weltgeschichte' },
		{ position: 9, maximumPoints: 4, label: '20. Jahrhundert – ungarische Geschichte' },
		{ position: 10, maximumPoints: 4, label: 'Nach 1945 – Weltgeschichte' },
		{ position: 11, maximumPoints: 4, label: 'Nach 1945 – ungarische Geschichte' },
		{ position: 12, maximumPoints: 4, label: 'Gesellschaft und Gegenwart' }
	]
};
