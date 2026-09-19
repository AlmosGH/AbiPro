export async function timeQuery<T>(operation: string, run: () => Promise<T>, context: Record<string, string | number | undefined> = {}): Promise<T> {
	const started = performance.now();
	try {
		return await run();
	} finally {
		console.info(JSON.stringify({ level: 'info', type: 'query_timing', operation, durationMs: Math.round((performance.now() - started) * 10) / 10, ...context }));
	}
}
