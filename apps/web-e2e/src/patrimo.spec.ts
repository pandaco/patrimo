import { test, expect, type Page } from '@playwright/test';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3333';
const DEV_LOGIN_URL = `${API_URL}/api/auth/dev-login`;

/**
 * Reads the total transaction count from the journal eyebrow text.
 * Waits for the text to render so callers don't race the async signal hydration.
 */
async function readTotalTxCount(page: Page): Promise<number> {
  const eyebrow = page.locator('.page-eyebrow');
  await expect(eyebrow).toContainText(/Journal — \d+ mouvement/);
  const text = (await eyebrow.textContent()) ?? '';
  const match = /Journal — (\d+)/.exec(text);
  return match ? Number(match[1]) : 0;
}

test.describe('Patrimo E2E Tests', () => {

  test('should redirect unauthenticated users to the login page', async ({ page }) => {
    // Navigate to root (which requires auth)
    await page.goto('/');

    // Wait for redirect to /login (strict path equality to avoid matching `/admin/login` etc.)
    await page.waitForURL(url => url.pathname === '/login');

    // Check that we see the login card and brand mark
    await expect(page.locator('.brand-mark')).toContainText('P');
    await expect(page.locator('.page-title')).toContainText('Patrimo');
    await expect(page.locator('button.btn.primary')).toContainText('Continuer avec Google');
  });

  test('should authenticate via dev-login backdoor and show the dashboard', async ({ page }) => {
    // Navigate to NestJS dev-login endpoint (which sets the httpOnly session cookie and redirects to Angular callback)
    await page.goto(DEV_LOGIN_URL);

    // Wait for the redirects to complete and land on /dashboard
    await page.waitForURL(/\/dashboard(\?|#|$)/);

    // Verify page content shows the seeded user first name "Antoine"
    await expect(page.locator('h1.page-title')).toContainText('Bonjour Antoine.');

    // Verify some parts of the dashboard are loaded
    await expect(page.locator('.hero-money .value')).toBeVisible();
    await expect(page.locator('app-perf-chart')).toBeVisible();
  });

  test('should allow creating a transaction and reflect it in transactions list', async ({ page }) => {
    // Authenticate
    await page.goto(DEV_LOGIN_URL);
    await page.waitForURL(/\/dashboard(\?|#|$)/);

    // Navigate to transactions view using sidebar navigation link
    await page.click('a[href="/transactions"]');
    await page.waitForURL(/\/transactions(\?|#|$)/);

    // Wait for the journal header to render (signals data hydrated from API).
    // The eyebrow text `Journal — N mouvements` is the single source of truth
    // for total transaction count, independent of pagination.
    const initialCount = await readTotalTxCount(page);

    // Open transaction dialog via stable test-id (not relying on French button label).
    await page.click('[data-testid="open-tx-dialog"]');

    // Wait for dialog overlay to open
    await expect(page.locator('.tx-dialog-panel')).toBeVisible();

    // Select type "DEPOSIT"
    await page.click('.type-picker button:has-text("Dépôt")');

    // Fill in amount
    await page.fill('#tx-amount', '1250');

    // Click save via stable test-id (not relying on French label which carries a `→` suffix).
    await page.click('[data-testid="tx-save"]');

    // Dialog should close
    await expect(page.locator('.tx-dialog-panel')).toBeHidden();

    // Eyebrow count must increment by exactly one
    await expect(page.locator('.page-eyebrow')).toContainText(`Journal — ${initialCount + 1} mouvement`);
  });
});
