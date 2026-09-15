import { z } from 'zod';

export const AI_GRADER_SCHEMA_VERSION = 1;
export const AI_GRADER_PROVIDER = 'google-gemini';

export const aiGradeSchema = z.object({
	awardedPoints: z.number().min(0),
	matchedCriteria: z.array(z.string().min(1)),
	feedback: z.string().min(1).max(500),
	confidence: z.number().min(0).max(1),
	needsReview: z.boolean()
}).strict();

export type AiGrade = z.infer<typeof aiGradeSchema>;

export interface AiGradeInput {
	prompt: string;
	learnerAnswer: string;
	criteria: string[];
	maximumPoints: number;
}

export interface AiGraderTransport {
	grade(input: AiGradeInput, signal: AbortSignal): Promise<unknown>;
}

export interface AiGraderOptions {
	transport: AiGraderTransport;
	timeoutMs?: number;
	maxAttempts?: number;
	minimumConfidence?: number;
}

export type AiGraderOutcome =
	| { status: 'graded'; grade: AiGrade; attempts: number; latencyMs: number }
	| { status: 'needs_review'; errorCode: string; errorMessage: string; attempts: number; latencyMs: number };

function sanitizeError(cause: unknown) {
	const raw = cause instanceof Error ? cause.message : 'Unbekannter Fehler';
	return raw
		.replace(/[?&](?:key|api_key)=[^&\s]+/giu, '?key=[REDACTED]')
		.replace(/AIza[\w-]{20,}/gu, '[REDACTED]')
		.replace(/[\r\n\t]+/gu, ' ')
		.slice(0, 300);
}

function errorCode(cause: unknown) {
	if (cause instanceof DOMException && cause.name === 'AbortError') return 'timeout';
	if (cause instanceof z.ZodError || cause instanceof SyntaxError) return 'invalid_response';
	if (cause instanceof Error && /^gemini_http_429\b/u.test(cause.message)) return 'rate_limited';
	if (cause instanceof Error && /^gemini_http_4\d\d\b/u.test(cause.message)) return 'provider_rejected';
	return 'provider_error';
}

export async function gradeShortTextWithAi(input: AiGradeInput, options: AiGraderOptions): Promise<AiGraderOutcome> {
	const startedAt = performance.now();
	const maxAttempts = Math.max(1, Math.min(options.maxAttempts ?? 2, 3));
	const timeoutMs = Math.max(250, options.timeoutMs ?? 8_000);
	const minimumConfidence = options.minimumConfidence ?? 0.7;
	let lastError: unknown;
	let lastCode = 'provider_error';
	let attempts = 0;

	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		attempts = attempt;
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const parsed = aiGradeSchema.parse(await options.transport.grade(input, controller.signal));
			if (parsed.matchedCriteria.some((criterion) => !input.criteria.includes(criterion))) throw new SyntaxError('Result contains an unknown criterion.');
			const bounded = { ...parsed, awardedPoints: Math.min(input.maximumPoints, Math.round(parsed.awardedPoints * 100) / 100) };
			if (bounded.needsReview || bounded.confidence < minimumConfidence) {
				return { status: 'needs_review', errorCode: 'low_confidence', errorMessage: 'Die KI-Bewertung benötigt eine Überprüfung.', attempts: attempt, latencyMs: Math.round(performance.now() - startedAt) };
			}
			return { status: 'graded', grade: bounded, attempts: attempt, latencyMs: Math.round(performance.now() - startedAt) };
		} catch (cause) {
			lastError = cause;
			lastCode = controller.signal.aborted ? 'timeout' : errorCode(cause);
			if (controller.signal.aborted || lastCode === 'provider_rejected') break;
		} finally {
			clearTimeout(timer);
		}
	}

	return {
		status: 'needs_review',
		errorCode: lastCode,
		errorMessage: lastCode === 'timeout' ? 'Zeitüberschreitung beim KI-Anbieter.' : sanitizeError(lastError),
		attempts,
		latencyMs: Math.round(performance.now() - startedAt)
	};
}
