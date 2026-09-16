import { expect, test } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
test.skip(!email || !password, 'Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run authenticated smoke tests.');

test('an authenticated learner can open the task browser', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('E-Mail-Adresse').fill(email!);
	await page.getByLabel('Passwort').fill(password!);
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page).toHaveURL(/\/$/);

	await page.getByRole('link', { name: 'Aufgaben', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Aufgaben', level: 1 })).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
});
