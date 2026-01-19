import { test, expect } from '@playwright/test';

test('Dev Bootstrap Smoke Test', async ({ page, request }) => {
    // 1. Verify endpoint health directly (Server-to-Server check)
    const health = await request.get('/api/dev/smoke');
    expect(health.ok()).toBeTruthy();
    const healthJson = await health.json();
    expect(healthJson.ok).toBe(true);

    // 2. Client-side UI Harness
    await page.goto('/bridge?force_smoke=1');

    // Verify panel exists
    const panel = page.getByText('Dev Smoke Harness');
    await expect(panel).toBeVisible();

    // Run the smoke test
    const runBtn = page.getByRole('button', { name: 'Run Smoke Test' });
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // Wait for reload and verification
    // The test harness writes to sessionStorage to auto-continue after reload
    // We expect "ALL SYSTEMS GREEN" state eventually
    await expect(page.getByText('ALL SYSTEMS GREEN')).toBeVisible({ timeout: 15000 });

    // Verify local storage has the key
    const localStorage = await page.evaluate(() => window.localStorage.getItem('pulse_owner_user_id'));
    expect(localStorage).toBeTruthy();
});
