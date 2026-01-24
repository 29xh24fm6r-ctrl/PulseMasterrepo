import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Runtime Authentication
 *
 * CRITICAL: These tests catch the 401 cascade bug before production
 *
 * Run with: npx playwright test tests/runtime-auth.spec.ts --headed
 */

const PROD_URL = 'https://www.pulselifeos.com';
const TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

test.describe('Runtime Authentication (Production)', () => {
  test.beforeEach(async ({ page }) => {
    // Start from signed-out state
    await page.context().clearCookies();
  });

  test('should redirect apex to www', async ({ page }) => {
    // Visit apex domain
    const response = await page.goto('https://pulselifeos.com/');

    // Verify redirect happened
    expect(page.url()).toBe('https://www.pulselifeos.com/');

    // Verify it was a 308 permanent redirect
    const redirectChain = response?.request().redirectedFrom();
    if (redirectChain) {
      const redirectResponse = await redirectChain.response();
      expect(redirectResponse?.status()).toBe(308);
    }

    // Verify no Clerk errors
    const clerkErrors = await page.evaluate(() => {
      return (window as any).__CLERK_ERRORS__ || [];
    });
    expect(clerkErrors).toHaveLength(0);
  });

  test('should authenticate and access runtime APIs', async ({ page }) => {
    // Skip if no test credentials
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      test.skip();
      return;
    }

    // Sign in
    await page.goto(`${PROD_URL}/sign-in`);
    await page.fill('input[name="identifier"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect to home
    await page.waitForURL(`${PROD_URL}/`, { timeout: 10000 });

    // Test all 5 runtime endpoints
    const results = await page.evaluate(async () => {
      const endpoints = [
        '/api/runtime/home',
        '/api/runtime/state',
        '/api/runtime/observer',
        '/api/runtime/plan',
      ];

      const responses = await Promise.all(
        endpoints.map(async (endpoint) => {
          const res = await fetch(endpoint);
          const data = await res.json();
          return {
            endpoint,
            status: res.status,
            hasError: !!data.error,
            errorMessage: data.error,
          };
        })
      );

      return responses;
    });

    // Verify all endpoints return 200
    results.forEach(({ endpoint, status, hasError, errorMessage }) => {
      expect(status, `${endpoint} should return 200`).toBe(200);
      expect(hasError, `${endpoint} should not have error`).toBe(false);
      expect(errorMessage, `${endpoint} should not have "User identity missing"`).not.toContain('identity');
    });
  });

  test('should use Clerk auth() as primary identity source', async ({ page }) => {
    // Skip if no test credentials
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      test.skip();
      return;
    }

    // Listen to console logs
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('[requireUserId]')) {
        consoleLogs.push(msg.text());
      }
    });

    // Sign in
    await page.goto(`${PROD_URL}/sign-in`);
    await page.fill('input[name="identifier"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL(`${PROD_URL}/`, { timeout: 10000 });

    // Wait for runtime polling
    await page.waitForTimeout(2000);

    // Verify we're using Clerk auth() (not header injection)
    const clerkAuthLogs = consoleLogs.filter(log =>
      log.includes('Resolved from Clerk auth()')
    );
    const headerInjectionLogs = consoleLogs.filter(log =>
      log.includes('Resolved from header injection')
    );

    expect(clerkAuthLogs.length, 'Should use Clerk auth()').toBeGreaterThan(0);
    expect(headerInjectionLogs.length, 'Should NOT rely on header injection').toBe(0);
  });

  test('should not show 401 errors in console', async ({ page }) => {
    // Skip if no test credentials
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      test.skip();
      return;
    }

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Sign in and use app
    await page.goto(`${PROD_URL}/sign-in`);
    await page.fill('input[name="identifier"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL(`${PROD_URL}/`, { timeout: 10000 });

    // Wait for runtime polling cycle
    await page.waitForTimeout(3000);

    // Check for 401 errors
    const has401Errors = consoleErrors.some(err =>
      err.includes('401') || err.includes('identity missing')
    );

    expect(has401Errors, 'Should not have any 401 errors').toBe(false);
  });
});

test.describe('Runtime Authentication (Preview Mode)', () => {
  test('should work on preview deployments without Clerk', async ({ page }) => {
    // This would run against preview URL
    // For now, we skip unless PREVIEW_URL env var is set
    const previewUrl = process.env.PREVIEW_URL;
    if (!previewUrl) {
      test.skip();
      return;
    }

    await page.goto(previewUrl);

    // Verify preview mode banner
    const banner = await page.locator('text=PREVIEW SAFE MODE').first();
    await expect(banner).toBeVisible();

    // Verify runtime endpoints return preview data (no 401)
    const results = await page.evaluate(async () => {
      const res = await fetch('/api/runtime/home');
      const data = await res.json();
      return {
        status: res.status,
        mode: (data as any).mode,
        hasError: !!data.error,
      };
    });

    expect(results.status).toBe(200);
    expect(results.mode).toBe('preview');
    expect(results.hasError).toBe(false);
  });
});
