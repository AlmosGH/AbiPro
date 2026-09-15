import type { AnswerPayload } from './questions';
import type { DeterministicGrade } from '$lib/grading/deterministic';

export interface SavedPracticeAnswer {
	questionId: number;
	response: AnswerPayload;
	lastSavedAt: Date;
}

export interface PracticeQuestionResult extends DeterministicGrade {
	questionId: number;
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
