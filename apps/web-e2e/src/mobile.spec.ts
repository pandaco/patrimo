import { test, expect, type Page } from '@playwright/test';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3333';
const DEV_LOGIN_URL = `${API_URL}/api/auth/dev-login`;

/** Horizontal overflow of the page itself (scrolling wrappers don't count). */
async function pageOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

async function login(page: Page): Promise<void> {
  await page.goto(DEV_LOGIN_URL);
  await page.waitForURL(/\/dashboard(\?|#|$)/);
}

test.describe('Mobile shell & responsive smoke', () => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(({ isMobile }) => !isMobile, 'mobile viewport only');

  test.beforeEach(async ({ page }) => {
    // The Google Fonts stylesheet is render-blocking: abort it so navigations
    // stay fast even without direct internet access or in headless browsers.
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
  });

  test('bottom nav is visible and navigates', async ({ page }) => {
    await login(page);

    const bottomNav = page.locator('.bottom-nav');
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.locator('a')).toHaveCount(5);

    await bottomNav.locator('a[href="/portfolio"]').click();
    await page.waitForURL(/\/portfolio(\?|#|$)/);
    await expect(bottomNav.locator('a[href="/portfolio"]')).toHaveClass(/active/);
  });

  test('burger opens the drawer; Escape, backdrop and navigation close it', async ({ page }) => {
    await login(page);

    const sidebar = page.locator('.sidebar');
    const backdrop = page.locator('.drawer-backdrop');
    const burger = page.locator('.burger');

    await expect(burger).toBeVisible();
    await expect(sidebar).toBeHidden();

    // Open: full sidebar (labels visible, not the icon rail) + backdrop.
    await burger.click();
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('.nav-label').first()).toBeVisible();
    await expect(backdrop).toBeVisible();

    // Escape closes.
    await page.keyboard.press('Escape');
    await expect(sidebar).toBeHidden();
    await expect(backdrop).toBeHidden();

    // Backdrop click closes.
    await burger.click();
    await expect(sidebar).toBeVisible();
    await backdrop.click({ position: { x: 300, y: 100 } });
    await expect(sidebar).toBeHidden();

    // Navigating from a drawer link closes it too.
    await burger.click();
    await sidebar.locator('a[href="/allocation"]').click();
    await page.waitForURL(/\/allocation(\?|#|$)/);
    await expect(sidebar).toBeHidden();
  });

  test('key pages never overflow the viewport horizontally', async ({ page }) => {
    await login(page);

    for (const route of ['/dashboard', '/portfolio', '/transactions', '/allocation', '/tools/indicators']) {
      await page.goto(route);
      // Let the async resources render their widest content.
      await expect(page.locator('h1.page-title')).toBeVisible();
      expect(await pageOverflow(page), `horizontal overflow on ${route}`).toBeLessThanOrEqual(1);
    }
  });

  test('the positions table scrolls inside its wrapper instead of the page', async ({ page }) => {
    // Deterministic wide table via the same stubs as the desktop spec.
    const catalog = [
      {
        isin: 'IE00B4L5Y983', ticker: 'IWDA', name: 'iShares Core MSCI World',
        issuer: 'iShares', index: 'MSCI World', ter: 0.2, currency: 'USD',
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

    await login(page);
    await page.goto('/portfolio');

    const wrapper = page.locator('.table-scroll.wide');
    await expect(wrapper.locator('[data-testid="positions-table"] tbody tr').first()).toBeVisible();
    const scrolls = await wrapper.evaluate(el => el.scrollWidth > el.clientWidth);
    expect(scrolls, 'wide positions table should overflow into its scroll wrapper').toBe(true);
    expect(await pageOverflow(page)).toBeLessThanOrEqual(1);
  });

  test('the transaction dialog fits the viewport', async ({ page }) => {
    await login(page);
    await page.goto('/transactions');

    await page.click('[data-testid="open-transaction-dialog"]');
    const modal = page.locator('.transaction-dialog-panel .modal');
    await expect(modal).toBeVisible();

    const viewport = page.viewportSize() as { width: number; height: number };
    const box = (await modal.boundingBox()) as { width: number; height: number };
    expect(box.width).toBeLessThanOrEqual(viewport.width);
    // The type picker wraps instead of cramming 3 fixed columns.
    await expect(page.locator('.type-picker button').first()).toBeVisible();
  });
});
