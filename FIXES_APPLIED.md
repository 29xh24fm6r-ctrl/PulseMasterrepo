# Compile-Time Fixes Applied

## ✅ Step 1: Fixed Duplicate Routes

**Removed duplicate top-level routes:**
- ✅ `app/finance/page.tsx` (kept `app/(authenticated)/finance/page.tsx`)
- ✅ `app/life/page.tsx` (kept `app/(authenticated)/life/page.tsx`)
- ✅ `app/strategy/page.tsx` (kept `app/(authenticated)/strategy/page.tsx`)
- ✅ `app/relationships/page.tsx` (kept `app/(authenticated)/relationships/page.tsx`)
- ✅ `app/work/page.tsx` (kept `app/(authenticated)/work/page.tsx`)

**Result:** Each route now resolves to a single page.

## ✅ Step 2: Fixed CoachMessageBubble JSX

**Fixed:**
- ✅ Added missing `import { motion } from "framer-motion"`
- ✅ Changed opening `<div>` to `<motion.div>` to match closing tag
- ✅ Properly nested JSX structure

**File:** `app/components/coaching/CoachMessageBubble.tsx`

## ✅ Step 3: Created Missing UI Components & Utils

**Created:**
- ✅ `lib/utils.ts` - Contains `cn()` helper for Tailwind class merging
- ✅ `components/ui/button.tsx` - Full shadcn-style Button component with variants

**Existing (verified):**
- ✅ `app/components/ui/LoadingState.tsx` - Already exists
- ✅ `app/components/ui/ErrorState.tsx` - Already exists (now has button dependency satisfied)

## ✅ Step 4: Verified useCoachPanelStore

**Status:** File is already correctly structured with:
- ✅ Proper zustand import
- ✅ Correct CoachKey type from `@/lib/coaching/catalog`
- ✅ All required state and actions

**File:** `app/components/coaching/useCoachPanelStore.ts`

## ⚠️ Step 5: Install Missing NPM Packages

**Run this command in PowerShell from the project root:**

```powershell
npm install class-variance-authority zustand clsx tailwind-merge @radix-ui/react-slot
```

**Packages needed:**
- `class-variance-authority` - For button variants
- `zustand` - For state management (useCoachPanelStore)
- `clsx` - For conditional class names (used by cn helper)
- `tailwind-merge` - For merging Tailwind classes (used by cn helper)
- `@radix-ui/react-slot` - For Button asChild prop

## Step 6: Verify Everything Works

After installing packages, run:

```powershell
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Start dev server
npm run dev
```

## Files Modified/Created

### Deleted (duplicate routes):
- `app/finance/page.tsx`
- `app/life/page.tsx`
- `app/strategy/page.tsx`
- `app/relationships/page.tsx`
- `app/work/page.tsx`

### Modified:
- `app/components/coaching/CoachMessageBubble.tsx` - Fixed JSX and imports

### Created:
- `lib/utils.ts` - Utility functions
- `components/ui/button.tsx` - Button component

## Next Steps

1. **Install packages** (see Step 5 above)
2. **Run typecheck** to verify no type errors
3. **Start dev server** to test compilation
4. **Fix any remaining errors** that appear

## Commit Messages (for when ready)

```bash
git add .
git commit -m "fix: resolve duplicate finance/life/strategy/work routes

- Remove duplicate top-level route pages
- Keep authenticated versions under (authenticated) group"

git commit -m "fix: coach message bubble JSX errors

- Add missing framer-motion import
- Fix motion.div opening/closing tag mismatch"

git commit -m "feat: add shared UI components and utils

- Add lib/utils.ts with cn() helper
- Add components/ui/button.tsx with variants
- Satisfy LoadingState and ErrorState dependencies"

git commit -m "chore: install zustand and class-variance-authority

- Add zustand for state management
- Add class-variance-authority for component variants
- Add clsx and tailwind-merge for class utilities
- Add @radix-ui/react-slot for Button component"
```



