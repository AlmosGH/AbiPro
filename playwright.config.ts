import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173';

export default defineConfig({
	testDir: './tests/e2e',
	testMatch: '**/*.pw.ts',
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL,
		trace: 'on-first-retry'
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }
	],
	webServer: process.env.E2E_BASE_URL ? undefined : {
		command: 'npm run build && npm run preview -- --host 127.0.0.1',
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
