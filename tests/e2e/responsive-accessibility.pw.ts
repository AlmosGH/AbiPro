import { expect, test } from '@playwright/test';

const viewports = [
	{ name: 'mobile-320', width: 320, height: 800 },
	{ name: 'mobile-375', width: 375, height: 812 },
	{ name: 'mobile-430', width: 430, height: 932 },
	{ name: 'desktop-1280', width: 1280, height: 800 },
	{ name: 'desktop-1440', width: 1440, height: 900 }
];

for (const viewport of viewports) {
	test(`${viewport.name}: public shell has no horizontal overflow`, async ({ page }) => {
		await page.setViewportSize(viewport);
		await page.goto('/login');
		await expect(page.getByRole('heading', { name: /Willkommen/ })).toBeVisible();
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
		expect(overflow).toBeLessThanOrEqual(1);
		await expect(page).toHaveScreenshot(`${viewport.name}-login.png`, { fullPage: true, animations: 'disabled' });
	});
}

test('login is operable with a keyboard and exposes status semantics', async ({ page }) => {
	await page.goto('/login');
	await page.keyboard.press('Tab');
	await expect(page.locator(':focus')).toBeVisible();
	await page.keyboard.press('Tab');
	await expect(page.locator(':focus')).toBeVisible();
	await expect(page.locator('[aria-live="polite"]').first()).toBeAttached();
});
