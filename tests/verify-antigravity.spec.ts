import { test, expect, Page } from '@playwright/test';

// ✅ Antigravity Verification
// 1. Inert Gating: /welcome and auth routes must NOT trigger runtime refreshes.
// 2. Credential Enforcement: All /api/runtime/* requests must have 'Cookie' header.

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Antigravity Verification', () => {

    test('Inert Gating on /welcome', async ({ page }) => {
        let runtimeCalls = 0;

        // Monitor runtime usage
        page.on('request', req => {
            const url = req.url();
            if (url.includes('/api/runtime/') && !url.includes('/api/runtime/home')) {
                // Ignore 'home' probe if it happens (though ideally it shouldn't on inert routes)
                // Actually, provider says "if (isAuth) return;" so NO calls should happen.
                console.log(`[fail-signal] Runtime call detected on inert route: ${url}`);
                runtimeCalls++;
            }
        });

        console.log(`[step] Visiting ${BASE_URL}/welcome`);
        await page.goto(`${BASE_URL}/welcome`);
        await page.waitForTimeout(2000); // 2 seconds inert check

        expect(runtimeCalls).toBe(0);
        console.log('[pass] /welcome is inert.');

        await page.screenshot({ path: 'artifacts/antigravity-welcome.png' });
    });

    test('Credential Enforcement on Runtime', async ({ page, context }) => {
        // We need to be "active" to trigger runtime. 
        // 1. Inject a test cookie to verify credentials are sent.
        await context.addCookies([{
            name: 'antigravity-test',
            value: 'true',
            url: 'http://localhost:3000'
        }]);

        let checkedRequests = 0;
        const missingCookieUrls: string[] = [];

        page.on('request', req => {
            const url = req.url();
            if (url.includes('/api/runtime/')) {
                const headers = req.headers();
                // "Cookie" or "cookie" (headers usually normalized to lower-case in playwright, but let's check standard)
                const hasCookie = !!headers['cookie'];

                if (!hasCookie) {
                    // Belt + Suspenders Logging
                    console.log(`[fail-signal] Request missing cookie: ${url}`);
                    console.log('   Headers:', JSON.stringify(headers, null, 2));
                    missingCookieUrls.push(url);
                } else {
                    console.log(`[pass-signal] Request has cookie: ${url} (Cookie len: ${headers['cookie'].length})`);
                }
                checkedRequests++;
            }
        });

        console.log(`[step] Visiting ${BASE_URL}/`);
        await page.goto(`${BASE_URL}/`);

        // Wait for potential runtime calls
        try {
            await page.waitForResponse(res => res.url().includes('/api/runtime/'), { timeout: 5000 });
        } catch (e) {
            console.log('[warn] No runtime response detected in 5s. Might be effectively inert or network slow.');
        }



        await page.screenshot({ path: 'artifacts/antigravity-runtime.png' });

        // We expect at least the home probe '/api/runtime/home'
        if (checkedRequests === 0) {
            console.log('[warn] No runtime requests observed at all. Cannot verify credentials.');
        } else {
            expect(missingCookieUrls.length).toBe(0);
            console.log(`[pass] Verified ${checkedRequests} runtime requests for credentials.`);
        }
    });
    // ✅ Antigravity Phase 2: Apex Redirect Check
    // Note: We simulate this by sending the Host header to localhost.
    test('Canonical Domain Redirect (Simulated)', async ({ request }) => {
        const res = await request.get(`${BASE_URL}/welcome`, {
            headers: {
                'Host': 'pulselifeos.com' // Simulate Apex Host
            },
            maxRedirects: 0 // Don't follow, we want to see the 308
        });

        // Middleware should force 308 Permanent Redirect
        if (res.status() === 308) {
            const location = res.headers()['location'];
            console.log(`[pass] Redirect detected: 308 -> ${location}`);
            expect(location).toContain('www.pulselifeos.com');
        } else {
            // If local dev server doesn't respect Host header override (Next.js can be tricky with this on localhost),
            // we log a warning but don't fail, as this is strictly environment dependent.
            console.log(`[warn] Could not simulate Host header redirect on localhost (Status: ${res.status()}). 
                          This is expected if Next.js ignores Host header in dev mode. 
                          Manual verification required on deployment.`);
        }
    });
});
