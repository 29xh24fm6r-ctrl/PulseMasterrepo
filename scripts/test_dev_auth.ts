/**
 * 🛡️ ANTIGRAVITY GUARDRAIL: Dev Auth
 * 
 * Verifies the integrity of the /api/dev/bootstrap interaction
 * to prevent regressions in security/caching behavior.
 * 
 * Usage: npx tsx scripts/test_dev_auth.ts
 */

const BASE_URL = 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/api/dev/bootstrap`;

async function runGuardrail() {
    console.log('🛡️  Running Antigravity Guardrail: Dev Auth');
    console.log(`   Target: ${ENDPOINT}`);

    try {
        const res = await fetch(ENDPOINT, { method: 'POST' });

        // 1. Assert Status 200
        if (res.status !== 200) {
            throw new Error(`FAIL: Expected status 200, got ${res.status}`);
        }
        console.log('✅ Status is 200');

        // 2. Assert Cache-Control is strict (no-store)
        const cacheControl = res.headers.get('cache-control');
        if (!cacheControl || !cacheControl.includes('no-store')) {
            throw new Error(`FAIL: Cache-Control must include "no-store". Got: "${cacheControl}"`);
        }
        console.log('✅ Cache-Control is strict (no-store)');

        // 3. Assert Cookie (HttpOnly)
        // Note: Node fetch might not show Set-Cookie well depending on version, but we check raw header
        const setCookie = res.headers.get('set-cookie');
        if (!setCookie) {
            throw new Error('FAIL: Missing Set-Cookie header');
        }
        if (!setCookie.includes('x-pulse-dev-user-id=')) {
            throw new Error('FAIL: Missing x-pulse-dev-user-id cookie');
        }
        if (!setCookie.toLowerCase().includes('httponly')) {
            throw new Error('FAIL: Cookie must be HttpOnly');
        }
        console.log('✅ Cookie is present and HttpOnly');

        // 4. Assert Body Shape
        const data = await res.json();
        if (data.ok !== true) {
            throw new Error(`FAIL: Body ok !== true. Got: ${JSON.stringify(data)}`);
        }
        if (typeof data.userId !== 'string' || data.userId.length === 0) {
            throw new Error(`FAIL: Invalid userId. Got: ${JSON.stringify(data)}`);
        }
        console.log(`✅ Body valid (userId: ${data.userId})`);

        console.log('\n✨ GUARDRAIL PASSED: Dev Auth is secure and canonical. ✨');
        process.exit(0);

    } catch (err: any) {
        console.error('\n❌ GUARDRAIL FAILED');
        console.error(err.message);
        process.exit(1);
    }
}

runGuardrail();
