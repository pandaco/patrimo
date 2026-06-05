import { test, expect } from '@playwright/test';

test.describe('Patrimo E2E Tests', () => {

  test('should redirect unauthenticated users to the login page', async ({ page }) => {
    // Navigate to root (which requires auth)
    await page.goto('/');

    // Wait for redirect to /login
    await page.waitForURL(url => url.pathname.endsWith('/login'));
    
    // Check that we see the login card and brand mark
    await expect(page.locator('.brand-mark')).toContainText('P');
    await expect(page.locator('.page-title')).toContainText('Patrimo');
    await expect(page.locator('button.btn.primary')).toContainText('Continuer avec Google');
  });

  test('should authenticate via dev-login backdoor and show the dashboard', async ({ page }) => {
    // Navigate to NestJS dev-login endpoint (which sets the httpOnly session cookie and redirects to Angular callback)
    // Note: NestJS runs on port 3333 in development
    await page.goto('http://localhost:3333/api/auth/dev-login');

    // Wait for the redirects to complete and land on /dashboard
    await page.waitForURL('**/dashboard');

    // Verify page content shows the seeded user first name "Antoine"
    await expect(page.locator('h1.page-title')).toContainText('Bonjour Antoine.');

    // Verify some parts of the dashboard are loaded
    await expect(page.locator('.hero-money .value')).toBeVisible();
    await expect(page.locator('app-perf-chart')).toBeVisible();
  });

  test('should allow creating a transaction and reflect it in transactions list', async ({ page }) => {
    // Authenticate
    await page.goto('http://localhost:3333/api/auth/dev-login');
    await page.waitForURL('**/dashboard');

    // Navigate to transactions view using sidebar navigation link
    await page.click('a[href="/transactions"]');
    await page.waitForURL('**/transactions');

    // Get initial transaction count
    const initialTxCount = await page.locator('.tbl tbody tr').count();

    // Open transaction dialog (raccourci clavier 'T' ou clic bouton '+ Transaction')
    await page.click('button:has-text("+ Nouvelle transaction"), button:has-text("+ Ordre"), button:has-text("+ Opération")');

    // Wait for dialog overlay to open
    await expect(page.locator('.tx-dialog-panel')).toBeVisible();

    // Select type "DEPOSIT"
    await page.click('.type-picker button:has-text("Dépôt")');

    // Fill in amount
    await page.fill('#tx-amount', '1250');

    // Click "Enregistrer"
    await page.click('button.btn.primary:has-text("Enregistrer"), button.btn.primary:has-text("Sauvegarder")');

    // Dialog should close
    await expect(page.locator('.tx-dialog-panel')).toBeHidden();

    // Verify new transaction appears in the list (row count increases by 1)
    await expect(async () => {
      const currentTxCount = await page.locator('.tbl tbody tr').count();
      expect(currentTxCount).toBe(initialTxCount + 1);
    }).toPass();
  });
});
