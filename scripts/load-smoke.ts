const baseUrl = process.env.LOAD_BASE_URL;
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 25);
const requestsPerWorker = Number(process.env.LOAD_REQUESTS_PER_WORKER ?? 20);
if (!baseUrl) throw new Error('LOAD_BASE_URL is required. Use a staging deployment.');
const paths = ['/', '/login', '/datenschutz', '/ki-bewertung'];
const latencies: number[] = [];
let failures = 0;
await Promise.all(Array.from({ length: concurrency }, async (_, worker) => {
	for (let index = 0; index < requestsPerWorker; index += 1) {
		const started = performance.now();
		const response = await fetch(new URL(paths[(worker + index) % paths.length], baseUrl));
		latencies.push(performance.now() - started);
		if (!response.ok) failures += 1;
		await response.arrayBuffer();
	}
}));
latencies.sort((a, b) => a - b);
const percentile = (p: number) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))];
console.log(JSON.stringify({ requests: latencies.length, failures, p50Ms: Math.round(percentile(0.5)), p95Ms: Math.round(percentile(0.95)), p99Ms: Math.round(percentile(0.99)) }));
if (failures) process.exitCode = 1;
