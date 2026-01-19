import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: process.env.CI
        ? undefined
        : {
            command: 'npm run start -- -p 3000 -H 0.0.0.0',
            url: 'http://127.0.0.1:3000/api/healthz',
            reuseExistingServer: true,
            stdout: 'ignore',
            stderr: 'pipe',
            timeout: 120_000,
        },
});
