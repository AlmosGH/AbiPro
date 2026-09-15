import type { QuestionConfig } from './questions';

export interface LearnerQuestion {
	id: number;
	position: number;
	kind: QuestionConfig['kind'];
	prompt: string;
	config: QuestionConfig;
	maxPoints: number;
}

export interface LearnerTaskSource {
	id: number;
	position: number;
	kind: 'text' | 'image' | 'table' | 'map';
	title: string | null;
	content: Record<string, unknown> | null;
	assetUrl: string | null;
	assetAltText: string | null;
}
