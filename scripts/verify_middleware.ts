
import { fileURLToPath } from 'url';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function verify() {
    console.log(`🔍 Verifying Middleware Logic on ${BASE_URL}...\n`);

    const checks = [
        {
            path: '/manifest.json',
            expectedStatus: 200,
            expectedHeader: 'allow_public_asset',
            desc: 'Public Asset (Manifest)'
        },
        {
            path: '/favicon.ico',
            expectedStatus: 200,
            expectedHeader: 'allow_public_asset',
            desc: 'Public Asset (Favicon)'
        },
        {
            path: '/bridge',
            expectedStatus: 200,
            expectedHeader: ['allow_dev_bypass', 'allow_auth'],
            desc: 'Bridge Route (Dev Bypass)'
        }
    ];

    let allPass = true;

    for (const check of checks) {
        try {
            console.log(`👉 Checking ${check.desc} [GET ${check.path}]`);
            const res = await fetch(`${BASE_URL}${check.path}`, {
                redirect: 'manual',
                headers: {
                    // Simulate a browser-like request if needed, but simple GET should suffice
                }
            });

            const mwHeader = res.headers.get('x-pulse-mw');
            const location = res.headers.get('location');
            const status = res.status;

            console.log(`   Status: ${status} ${status === check.expectedStatus ? '✅' : '❌'}`);
            console.log(`   X-Pulse-MW: ${mwHeader || '(missing)'}`);
            if (location) console.log(`   Location: ${location}`);

            let headerMatch = false;
            if (Array.isArray(check.expectedHeader)) {
                headerMatch = check.expectedHeader.some(expected =>
                    (mwHeader || '').startsWith(expected) || (mwHeader || '') === expected
                );
            } else {
                headerMatch = (mwHeader || '') === check.expectedHeader;
            }

            if (!headerMatch) {
                console.log(`   ❌ Header Mismatch! Expected: ${JSON.stringify(check.expectedHeader)}`);
                allPass = false;
            }

            if (status !== check.expectedStatus) {
                console.log(`   ❌ Status Mismatch! Expected: ${check.expectedStatus}`);
                allPass = false;
            }

            console.log('');

        } catch (error: any) {
            console.log(`   ❌ Connection Failed: ${error.message}`);
            console.log(`   Ensure the dev server is running (npm run dev).\n`);
            allPass = false;
        }
    }

    if (allPass) {
        console.log('✅✅✅ VERIFICATION SUCCESS: Middleware is behaving correctly.');
        process.exit(0);
    } else {
        console.log('❌❌❌ VERIFICATION FAILED: See logs above.');
        process.exit(1);
    }
}

verify();
