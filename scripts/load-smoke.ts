const baseUrl = process.env.LOAD_BASE_URL;
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 25);
const requestsPerWorker = Number(process.env.LOAD_REQUESTS_PER_WORKER ?? 20);
const cookie = process.env.LOAD_AUTH_COOKIE;
const practiceAttemptId = process.env.LOAD_PRACTICE_ATTEMPT_ID;
const questionId = process.env.LOAD_QUESTION_ID;
if (!baseUrl) throw new Error('LOAD_BASE_URL is required. Use a staging deployment.');
type Scenario = { name: string; path: string; init?: RequestInit };
const scenarios: Scenario[] = [
	{ name: 'login', path: '/login' },
	{ name: 'privacy', path: '/datenschutz' }
];
if (cookie) scenarios.push(
	{ name: 'dashboard', path: '/' },
	{ name: 'task-browser', path: '/aufgaben' },
	{ name: 'profile', path: '/profil' }
);
if (practiceAttemptId && questionId) {
	scenarios.push({ name: 'autosave', path: `/uben/${practiceAttemptId}/answer/${questionId}`, init: { method: 'PUT', headers: { 'content-type': 'application/json' }, body: process.env.LOAD_AUTOSAVE_BODY ?? '{"kind":"short_text","text":"Load test"}' } });
	if (process.env.LOAD_INCLUDE_SUBMISSION === 'true') scenarios.push({ name: 'submission', path: `/uben/${practiceAttemptId}?/submit`, init: { method: 'POST', headers: { 'x-sveltekit-action': 'true' }, body: new FormData() } });
}
const latencies: number[] = [];
const byScenario = new Map<string, number[]>();
let failures = 0;
await Promise.all(Array.from({ length: concurrency }, async (_, worker) => {
	for (let index = 0; index < requestsPerWorker; index += 1) {
		const scenario = scenarios[(worker + index) % scenarios.length];
		const started = performance.now();
		const headers = new Headers(scenario.init?.headers);
		if (cookie) headers.set('cookie', cookie);
		const response = await fetch(new URL(scenario.path, baseUrl), { ...scenario.init, headers, redirect: 'manual' });
		const duration = performance.now() - started;
		latencies.push(duration);
		byScenario.set(scenario.name, [...(byScenario.get(scenario.name) ?? []), duration]);
		if (!response.ok) failures += 1;
		await response.arrayBuffer();
	}
}));
latencies.sort((a, b) => a - b);
const percentile = (p: number) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))];
const scenarioPercentiles = Object.fromEntries([...byScenario].map(([name, values]) => {
	values.sort((a, b) => a - b);
	return [name, { requests: values.length, p95Ms: Math.round(values[Math.min(values.length - 1, Math.floor(values.length * .95))]) }];
}));
console.log(JSON.stringify({ requests: latencies.length, failures, p50Ms: Math.round(percentile(0.5)), p95Ms: Math.round(percentile(0.95)), p99Ms: Math.round(percentile(0.99)), scenarios: scenarioPercentiles }));
if (failures) process.exitCode = 1;
