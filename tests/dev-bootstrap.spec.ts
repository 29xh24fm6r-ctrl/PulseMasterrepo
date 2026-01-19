import { test, expect } from '@playwright/test';

test('Dev Bootstrap Smoke Test', async ({ page, request }) => {
    // 1. Verify endpoint health directly (Server-to-Server check)
    const health = await request.get('/api/dev/smoke');
    expect(health.ok()).toBeTruthy();
    const healthJson = await health.json();
    expect(healthJson.ok).toBe(true);

    // 2. Client-side Invariant Check (Canon-Safe)
    // We assert the app loads and renders a main shell, rather than
    // relying on a dev-only harness that may be hidden/removed in Phase 16+.
    await page.goto('/bridge');

    // App shell invariant
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
});
