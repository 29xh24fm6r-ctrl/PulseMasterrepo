# E2E Test Setup Guide

## Quick Start - Run Tests in Chrome

### 1. Install Playwright
```bash
npm install -D @playwright/test
npx playwright install chromium
```

### 2. Set up test credentials (optional, for authenticated tests)
Create `.env.test.local`:
```
E2E_TEST_EMAIL=your-test-account@example.com
E2E_TEST_PASSWORD=your-test-password
```

### 3. Run tests

**Headless (CI mode):**
```bash
npm run test:e2e
```

**Headed (see Chrome browser):**
```bash
npm run test:e2e:headed
```

**Debug mode (step through tests):**
```bash
npm run test:e2e:debug
```

**UI mode (interactive):**
```bash
npm run test:e2e:ui
```

---

## What Gets Tested

### 🔐 Authentication & Runtime API Tests

1. **Apex → WWW Redirect**
   - Verifies `pulselifeos.com` → `www.pulselifeos.com`
   - Checks for 308 permanent redirect
   - Ensures no Clerk errors

2. **Runtime API Access (Authenticated)**
   - Tests all 5 runtime endpoints
   - Verifies 200 status (no 401 errors)
   - Confirms no "User identity missing" errors

3. **Identity Source Verification**
   - Confirms `requireUserId` uses Clerk `auth()` as primary
   - Ensures middleware header injection is fallback only

4. **Console Error Detection**
   - Monitors console for 401 errors
   - Checks for authentication failures

5. **Preview Mode (Vercel)**
   - Tests preview deployments work without Clerk
   - Verifies preview banner appears
   - Confirms no 401 errors on preview URLs

---

## Test Environments

### Local Development
```bash
BASE_URL=http://localhost:3000 npm run test:e2e:headed
```

### Vercel Preview
```bash
PREVIEW_URL=https://your-preview-url.vercel.app npm run test:e2e
```

### Production
```bash
BASE_URL=https://www.pulselifeos.com npm run test:e2e
```

---

## CI/CD Integration

Add to `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run test:e2e
        env:
          E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
          E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Debugging Failed Tests

### View Screenshots
Failed tests automatically capture screenshots:
```
test-results/runtime-auth-*.png
```

### View Trace
Open trace viewer for detailed debugging:
```bash
npx playwright show-trace test-results/traces/*.zip
```

### Run Specific Test
```bash
npx playwright test -g "should redirect apex to www" --headed
```

---

## Manual Testing (Browser Console)

If you prefer manual testing, open Chrome DevTools and run:

```javascript
// Test all runtime endpoints
Promise.all([
  fetch('/api/runtime/home').then(r => r.json()),
  fetch('/api/runtime/state').then(r => r.json()),
  fetch('/api/runtime/observer').then(r => r.json()),
  fetch('/api/runtime/plan').then(r => r.json())
]).then(results => {
  console.log('Results:', results);
  const has401 = results.some(r => r.error?.includes('identity'));
  if (has401) console.error('❌ FAIL: 401 detected');
  else console.log('✅ PASS');
});
```

---

## Troubleshooting

### Tests fail with "Target closed"
- Increase timeout in playwright.config.ts
- Check if app is crashing (check console logs)

### Tests can't find elements
- Run with `--headed` to see what's happening
- Check if selectors have changed
- Verify app is loaded (check network tab)

### Authentication fails
- Verify E2E_TEST_EMAIL and E2E_TEST_PASSWORD are set
- Check test user exists in Clerk
- Ensure test user has proper permissions

---

## Adding New Tests

Create a new spec file in `tests/`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('My New Feature', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    // ... test code
  });
});
```

Run it:
```bash
npx playwright test tests/my-new-feature.spec.ts --headed
```

---

## Pre-Deployment Checklist

Before deploying to production:

1. ✅ Run `npm run test:e2e` - all tests pass
2. ✅ Run manual smoke test (see RUNTIME_AUTH_TEST_PLAN.md)
3. ✅ Check preview deployment works
4. ✅ Review runtime health check output in console
5. ✅ Verify no 401 errors in production

---

## Questions?

See also:
- [RUNTIME_AUTH_TEST_PLAN.md](RUNTIME_AUTH_TEST_PLAN.md) - Manual testing checklist
- [Playwright Docs](https://playwright.dev/docs/intro)
