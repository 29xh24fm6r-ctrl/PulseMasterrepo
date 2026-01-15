# Production Routing Fix – Gemini Verification Spec

## Objective

Verify that the **Command Bridge (`/bridge`) is the canonical default experience** in production, with all legacy routes quarantined and no authentication, navigation, or layout regressions.

This spec validates routing correctness **after deployment**.

---

## Preconditions

* Production Routing Spec implemented
* Legacy routes (`/dashboard`, `/today`) moved to `app/legacy/`
* PrimaryNav enabled as global layout
* Deployment target: Vercel (Production)

---

## Phase 0: Pre-Deployment Validation (Local)

### Required

Run build to catch import/path issues introduced by legacy folder moves.

```bash
npm run build
```

### Pass Criteria

* Build completes successfully
* No missing imports or route resolution errors
* No TypeScript or bundling failures

---

## Phase 1: Canonical Routing Validation (Production)

### 1.1 Root Route (`/`)

**Action**

* Visit: `https://<prod-domain>/`

**Expected**

* Hard redirect to `/bridge`
* Browser URL ends at `/bridge`
* No legacy UI flash

**Pass Criteria**

* `/` never renders legacy content
* Redirect occurs deterministically

---

### 1.2 Legacy Entry Points

Test explicitly:

* `/dashboard`
* `/today`

**Expected (choose one and enforce consistently):**

* Either:
  * Redirect to `/bridge`
* Or:
  * 404 / Not Found

**Fail Conditions**

* Legacy UI renders
* Legacy route becomes default
* Inconsistent behavior between routes

---

## Phase 2: Authentication & Redirect Integrity

### 2.1 Logged-Out User → `/bridge`

**Action**

* Open incognito
* Navigate to `/bridge`

**Expected**

* User is routed through auth/identity flow
* Post-auth landing page is `/bridge`

**Pass Criteria**

* No redirect to `/dashboard` or `/today`
* No redirect loop

---

### 2.2 Identity Flow Completion

**Action**

* Navigate to `/identity/quiz`
* Complete flow

**Expected**

* Final redirect → `/bridge`

**Fail Conditions**

* Redirects to legacy routes
* Dead-end page after completion

---

### 2.3 Deep Link Handling

**Action**

* Attempt direct navigation to:
  * `/chat`
  * `/brain`

**Expected**

* If unauthenticated:
  * Auth → return to target OR `/bridge` (product decision)
* If authenticated:
  * Page loads normally

**Pass Criteria**

* No unexpected legacy redirects
* Deterministic behavior

---

## Phase 3: Navigation & Layout Validation

### 3.1 PrimaryNav Presence

**Routes to test**

* `/bridge`
* `/brain`
* `/chat`
* `/identity`

**Expected**

* PrimaryNav visible
* Layout consistent across routes

---

### 3.2 Navigation Links

Click all PrimaryNav items:

* Bridge
* Brain
* Chat
* Identity

**Pass Criteria**

* No 404s
* No blank screens
* No console errors

---

### 3.3 Layout Regression Check

**Verify**

* Content scrolls correctly
* Sidebar does not overlap content
* No hydration mismatch warnings in console

---

## Phase 4: Bridge Page Functional Integrity

### 4.1 Orientation Actions

**Verify**

* OrientationHeader buttons trigger actions in `lib/orientation/actions.ts`
* Loading and success states behave correctly

---

### 4.2 Dead UI Confirmation

**Verify**

* No “Add Task” buttons present
* No legacy CTAs accessible via UI or keyboard
* No hidden navigation paths to legacy pages

---

## Phase 5: Quarantine Validation

### 5.1 Accidental Route Discovery

**Verify**

* No internal links point to `/dashboard` or `/today`
* Command palette / shortcuts do not surface legacy routes
* Bookmarked legacy routes do not bypass redirect logic

---

### 5.2 Analytics (If Available)

**Verify**

* No sustained traffic to legacy routes post-deploy
* Redirects behave as expected

---

## Phase 6: Redirect Loop Safeguard

### Test Matrix

Test each case explicitly:

| Route     | Auth State | Expected             |
| --------- | ---------- | -------------------- |
| `/`       | Logged out | Redirect → `/bridge` |
| `/`       | Logged in  | Redirect → `/bridge` |
| `/bridge` | Logged out | Auth → `/bridge`     |
| `/bridge` | Logged in  | Loads normally       |

**Fail Conditions**

* “Too many redirects”
* Network panel shows repeating requests
* Browser error state

---

## Phase 7: Vercel Production Verification

### Verify

* Correct environment variables present
* Middleware running as expected
* No build warnings related to routing
* Final verification done on **production domain**, not preview

---

## Acceptance Criteria (Final)

Routing fix is considered **successful** if:

* `/bridge` is the sole default experience
* No legacy route can become default
* Auth always resolves to `/bridge`
* PrimaryNav works across all supported routes
* No redirect loops or layout regressions exist
