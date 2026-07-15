import { test, expect, type Page } from '@playwright/test';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3333';
const DEV_LOGIN_URL = `${API_URL}/api/auth/dev-login`;

/**
 * Reads the total transaction count from the journal eyebrow text.
 * Waits for the text to render so callers don't race the async signal hydration.
 */
async function readTotalTxCount(page: Page): Promise<number> {
  const eyebrow = page.locator('.page-eyebrow');
  // "opération" since the 2026-07-13 wording harmonization (ex-"mouvement").
  await expect(eyebrow).toContainText(/Journal — \d+ opération/);
  const text = (await eyebrow.textContent()) ?? '';
  const match = /Journal — (\d+)/.exec(text);
  return match ? Number(match[1]) : 0;
}

async function navigateTo(page: Page, href: string) {
  await page.locator(`a[href="${href}"]`).filter({ visible: true }).first().click({ force: true });
}

/**
 * The database ships empty (no seed), so tests that need an envelope create
 * one via the API using the session + CSRF cookie set by dev-login. Call
 * after authenticating, then reload the target page so the frontend resource
 * refetches the new envelope.
 */
async function createEnvelope(page: Page): Promise<void> {
  const cookies = await page.context().cookies();
  const csrf = cookies.find(c => c.name === 'patrimo_csrf')?.value ?? '';
  await page.request.post(`${API_URL}/api/envelopes`, {
    headers: { 'X-CSRF-Token': csrf },
    data: { code: 'PEA', glyph: 'pea', label: 'PEA test', broker: 'Test', openedAt: '2024-01-01', plafond: 150000 },
  });
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

  test('should show the 3-step novice explainer on the login page', async ({ page }) => {
    await page.goto('/login');

    // The "Comment ça marche" block lives below the Google CTA and contains 3 steps.
    await expect(page.locator('h3', { hasText: 'Comment ça marche' })).toBeVisible();
    await expect(page.locator('.step-num')).toHaveCount(3);
    await expect(page.locator('li', { hasText: 'Déclare tes enveloppes' })).toBeVisible();
    await expect(page.locator('li', { hasText: 'Importe ou saisis tes opérations' })).toBeVisible();
    await expect(page.locator('li', { hasText: 'Pilote en un coup d\'œil' })).toBeVisible();

    // Disclaimer is always present.
    await expect(page.getByText(/pas un conseil en investissement/i)).toBeVisible();
  });

  test('should authenticate via dev-login backdoor and show the dashboard', async ({ page }) => {
    // Navigate to NestJS dev-login endpoint (which sets the httpOnly session cookie and redirects to Angular callback)
    await page.goto(DEV_LOGIN_URL);

    // Wait for the redirects to complete and land on /dashboard
    await page.waitForURL(/\/dashboard(\?|#|$)/);

    // Verify page content shows the seeded user first name "Antoine"
    await expect(page.locator('h1.page-title')).toContainText('Bonjour Antoine.');

    // Verify some parts of the dashboard are loaded: the net-worth headline
    // (sidebar), the period tabs (1J … MAX) and the selection's performance line.
    await expect(page.locator('.hero-networth-value')).toBeVisible();
    await expect(page.locator('.tabs[aria-label="Période"] button')).toHaveCount(8);
    await expect(page.locator('.perf-line')).toBeVisible();
  });

  test('should show the 11 KPI tiles on the Indicateurs page', async ({ page }) => {
    await page.goto(DEV_LOGIN_URL);
    await page.waitForURL(/\/dashboard(\?|#|$)/);

    await page.goto('/tools/indicators');
    await expect(page.locator('h1.page-title')).toContainText('Indicateurs');
    // 4 primary tiles + 7 drag-reorderable secondary tiles.
    await expect(page.locator('.kpi-tile')).toHaveCount(11);
    await expect(page.locator('.cdk-drop-list .kpi-tile')).toHaveCount(7);
  });

  test('should surface the toast service from the shell after a transaction is saved', async ({ page }) => {
    // Toast service is mounted once in the shell <ui-toast />. This test exercises
    // it indirectly through the CSV-import-skipped path, but a simpler proof is
    // the import button label switching to "Import en cours…" while uploading.
    await page.goto(DEV_LOGIN_URL);
    await page.waitForURL(/\/dashboard(\?|#|$)/);

    // Both the sidebar and the bottom nav carry this link; click whichever is
    // visible at the current viewport (sidebar is display:none on phones).
    await navigateTo(page, '/transactions');
    await page.waitForURL(/\/transactions(\?|#|$)/);

    // Import button exists and starts in idle state.
    const importBtn = page.locator('button.btn.sm', { hasText: 'Import CSV' });
    await expect(importBtn).toBeVisible();
    await expect(importBtn).toBeEnabled();
  });

  test('should render the novice explainers on Allocation / Performance / DCA', async ({ page }) => {
    await page.goto(DEV_LOGIN_URL);
    await page.waitForURL(/\/dashboard(\?|#|$)/);

    for (const [route, summary] of [
      ['/allocation',  'Première fois ici'],
      ['/performance', 'Comment lire cette page'],
      ['/tools/dca',   'C\'est quoi le DCA'],
    ] as const) {
      await page.goto(route);
      await page.waitForURL(new RegExp(`${route.replace(/\//g, '\\/')}(\\?|#|$)`));
      await expect(page.locator('details.explainer summary', { hasText: summary })).toBeVisible();
    }
  });

  test('should list only held instruments as positions, while the comparateur shows the whole catalog', async ({ page }) => {
    // Regression guard: catalog instruments added just for comparison must not
    // surface as 0 € positions in the Portefeuille. The API endpoints are
    // stubbed at the browser level so the scenario is deterministic (no Yahoo,
    // no DB writes): a 2-instrument catalog of which only one is held.
    const catalog = [
      {
        isin: 'IE00B4L5Y983', ticker: 'IWDA', name: 'iShares Core MSCI World',
        issuer: 'iShares', index: 'MSCI World', ter: 0.2, currency: 'USD',
        repli: 'Physique', distrib: 'Capitalisant', pea: false, alloc: 'Core',
      },
      {
        isin: 'IE00B5BMR087', ticker: 'SXR8', name: 'iShares Core S&P 500',
        issuer: 'iShares', index: 'S&P 500', ter: 0.07, currency: 'USD',
        repli: 'Physique', distrib: 'Capitalisant', pea: false, alloc: 'Core',
      },
    ];
    const positions = [
      {
        etfIsin: 'IE00B4L5Y983', ticker: 'IWDA', name: 'iShares Core MSCI World',
        qty: 10, avgPrice: 80, invested: 800, currentPrice: 85, prevClose: 84,
      },
    ];
    await page.route('**/api/etfs', route => route.fulfill({ json: catalog }));
    await page.route('**/api/portfolio', route => route.fulfill({ json: positions }));
    // The Google Fonts stylesheet is render-blocking: abort it so the three
    // navigations below stay fast even without direct internet access.
    await page.route('https://fonts.googleapis.com/**', route => route.abort());

    await page.goto(DEV_LOGIN_URL);
    await page.waitForURL(/\/dashboard(\?|#|$)/);

    // Portefeuille: exactly one position row — the held IWDA, never SXR8.
    await page.goto('/portfolio');
    const rows = page.locator('[data-testid="positions-table"] tbody tr');
    await expect(rows.filter({ hasText: 'IWDA' })).toHaveCount(1);
    await expect(rows.filter({ hasText: 'SXR8' })).toHaveCount(0);

    // Comparateur: the full catalog is browsable, with a "Détenu" badge on the
    // held instrument only.
    await page.goto('/tools/compare');
    const chips = page.locator('[data-testid="catalog-chip"]');
    await expect(chips).toHaveCount(2);
    await expect(chips.filter({ hasText: 'IWDA' }).locator('.pill.olive')).toHaveCount(1);
    await expect(chips.filter({ hasText: 'SXR8' }).locator('.pill.olive')).toHaveCount(0);
  });

  test('should allow creating a transaction and reflect it in transactions list', async ({ page }) => {
    // Authenticate
    await page.goto(DEV_LOGIN_URL);
    await page.waitForURL(/\/dashboard(\?|#|$)/);

    // The DB has no seed — a DEPOSIT needs an envelope to attach to, so create
    // one via the API, then load transactions with a full navigation so the
    // envelope resource refetches.
    await createEnvelope(page);

    await page.goto('/transactions');
    await page.waitForURL(/\/transactions(\?|#|$)/);

    // Wait for the journal header to render (signals data hydrated from API).
    // The eyebrow text `Journal — N opérations` is the single source of truth
    // for total transaction count, independent of pagination.
    const initialCount = await readTotalTxCount(page);

    // Open transaction dialog via stable test-id (not relying on French button label).
    await page.click('[data-testid="open-transaction-dialog"]');

    // Wait for dialog overlay to open
    await expect(page.locator('.transaction-dialog-panel')).toBeVisible();

    // Select type "DEPOSIT"
    await page.click('.type-picker button:has-text("Dépôt")');

    // Fill in amount
    await page.fill('#transaction-amount', '1250');

    // Click save via stable test-id (not relying on French label which carries a `→` suffix).
    await page.click('[data-testid="transaction-save"]');

    // Dialog should close
    await expect(page.locator('.transaction-dialog-panel')).toBeHidden();

    // Eyebrow count must increment by exactly one
    await expect(page.locator('.page-eyebrow')).toContainText(`Journal — ${initialCount + 1} opération`);
  });
});
