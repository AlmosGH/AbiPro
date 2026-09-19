import { expect, test } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const expiredAttemptId = process.env.E2E_EXPIRED_ATTEMPT_ID;
const adminDraftId = process.env.E2E_ADMIN_DRAFT_ID;

async function login(page: import('@playwright/test').Page, user = email, secret = password) {
	await page.goto('/login');
	await page.getByLabel('E-Mail-Adresse').fill(user!);
	await page.getByLabel('Passwort').fill(secret!);
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page).toHaveURL(/\/$/);
}

test.describe('learner critical paths', () => {
	test.skip(!email || !password, 'Set dedicated E2E learner credentials.');
	test.beforeEach(async ({ page }) => login(page));

	test('practice can start, autosave, and submit for grading', async ({ page }) => {
		await page.goto('/uben');
		await page.getByRole('button', { name: /Quick Practice starten|Ausgewählte Aufgabe starten/ }).click();
		await expect(page).toHaveURL(/\/uben\/\d+$/);
		const firstRadio = page.getByRole('radio').first();
		if (await firstRadio.count()) await firstRadio.check();
		const firstText = page.getByRole('textbox').first();
		if (await firstText.count()) await firstText.fill('Fixture-Antwort');
		await expect(page.getByText('Alles gespeichert').first()).toBeVisible();
		while (await page.getByRole('button', { name: 'Nächste Frage →' }).count()) {
			await page.getByRole('button', { name: 'Nächste Frage →' }).click();
		}
		await page.getByRole('button', { name: 'Übung auswerten' }).click();
		await expect(page.getByText('Dein Ergebnis')).toBeVisible();
		await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Aufgaben', exact: true }).click();
		await expect(page).toHaveURL(/\/aufgaben$/);
		await expect(page.getByRole('heading', { name: 'Finde deine nächste Aufgabe', level: 1 })).toBeVisible();
	});

	test('an expired server fixture is finalized', async ({ page }) => {
		test.skip(!expiredAttemptId, 'Set E2E_EXPIRED_ATTEMPT_ID to a seeded expired exam owned by the learner.');
		await page.goto(`/prufung/${expiredAttemptId}`);
		await expect(page.getByRole('heading', { name: 'Prüfungsauswertung' })).toBeVisible();
	});
});

test.describe('registration', () => {
	const newEmail = process.env.E2E_NEW_USER_EMAIL;
	const newPassword = process.env.E2E_NEW_USER_PASSWORD;
	test.skip(!newEmail || !newPassword, 'Set one-time registration fixture credentials.');
	test('validates and submits a dedicated fixture account', async ({ page }) => {
		await page.goto('/register');
		await page.getByLabel('E-Mail-Adresse').fill(newEmail!);
		await page.getByLabel('Passwort').fill(newPassword!);
		await page.getByRole('button', { name: /Registrieren|Konto erstellen/ }).click();
		await expect(page.getByText(/Bestätigung|Profil|Konto/).first()).toBeVisible();
	});
});

test.describe('admin publishing', () => {
	const adminEmail = process.env.E2E_ADMIN_EMAIL;
	const adminPassword = process.env.E2E_ADMIN_PASSWORD;
	test.skip(!adminEmail || !adminPassword || !adminDraftId, 'Set admin credentials and a publishable draft fixture ID.');
	test('can publish a validated draft fixture', async ({ page }) => {
		await login(page, adminEmail, adminPassword);
		await page.goto(`/admin/aufgaben/${adminDraftId}`);
		await page.getByRole('button', { name: 'Veröffentlichen' }).click();
		await expect(page.getByText('Versionsstatus: published')).toBeVisible();
	});
});
