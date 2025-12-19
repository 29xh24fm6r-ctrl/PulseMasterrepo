# Pulse Shell Guardrails & Definition of Done

## Single Owner Principle

The Pulse shell (`app/(pulse)/layout.tsx`) is the **single owner** of:
- **Sidebar** (left navigation)
- **Topbar** (header with command bar)
- **FABs** (Floating Action Buttons - Mic + Plus)

No other component or page should render these elements.

---

## Component Architecture

### Canonical Components

- **`components/shell/FloatingActions.tsx`**: Single source of truth for FABs
- **`app/(pulse)/layout.tsx`**: Shell layout that renders sidebar, topbar, and FABs

### Deprecated Components (Hard-Disabled)

**⚠️ Migration Period (1-2 sprints):**

These components are currently hard-disabled (return `null`) and log warnings in development:

- **`app/components/ui/QuickActions.tsx`**: Deprecated - use `FloatingActions` instead
- **`app/components/global-voice-button.tsx`**: Deprecated - use `FloatingActions` instead

**🔄 Migration Path:**

If you need FAB functionality:
1. **In Pulse shell routes**: FABs are automatically provided by `(pulse)/layout.tsx`
2. **Custom shells**: Import and use `components/shell/FloatingActions.tsx`
3. **Page-specific actions**: Use inline buttons or modals instead of fixed FABs

**🗑️ Cleanup Plan:**

After 1-2 sprints (once all code has migrated), these files will be deleted:
- `app/components/ui/QuickActions.tsx`
- `app/components/global-voice-button.tsx`

If you see these warnings, migrate your code to use `FloatingActions` or remove the import.

---

## Route Organization

### Routes That Use Pulse Shell

All routes that need the sidebar/topbar/FABs must live under `app/(pulse)/`:

- ✅ `/home` → `app/(pulse)/home/`
- ✅ `/workspace` → `app/(pulse)/workspace/`
- ✅ `/people` → `app/(pulse)/people/`
- ✅ `/time` → `app/(pulse)/time/`
- ✅ `/brain` → `app/(pulse)/brain/`
- ✅ `/decisions` → `app/(pulse)/decisions/`
- ✅ `/loops` → `app/(pulse)/loops/`
- ✅ `/coaches` → `app/(pulse)/coaches/`
- ✅ `/crm` → `app/(pulse)/crm/`
- ✅ `/productivity` → `app/(pulse)/productivity/`

### Routes That Don't Use Pulse Shell

These routes should remain at the top level (outside `app/(pulse)/`):

- `/sign-in`, `/sign-up` (auth pages)
- `/api/*` (API routes)
- `/onboarding` (standalone flow)
- Special purpose pages that need custom layouts

---

## Styling Standards

### Topbar

- **Position**: `sticky top-0 z-40`
- **Background**: `bg-slate-950/90 backdrop-blur-xl`
- **Border**: `border-b border-white/10`
- **Readability**: Always opaque enough to be readable over gradient backgrounds

### FABs

- **Position**: `fixed bottom-6 right-20 md:right-24 z-[60]`
- **Stacking**: Vertical stack with `gap-3`
- **Colors**: Purple (Add) and Fuchsia (Voice)
- **Size**: `h-12 w-12` with `w-5 h-5` icons
- **Avoidance**: Positioned to avoid Intercom/help widgets on right edge

### Sidebar

- **Width**: `w-64` (expanded) / `w-16` (collapsed)
- **Transition**: `transition-all duration-300`
- **Background**: `bg-slate-800/50 backdrop-blur-xl`

---

## Definition of Done Checklist

Before merging any PR that touches shell/layout:

- ✅ Only `(pulse)/layout.tsx` (or future `AppShell` component) renders: sidebar, topbar, FABs
- ✅ No page renders fixed-position FABs (`fixed bottom-* right-*`)
- ✅ Any route needing sidebar lives under `app/(pulse)`
- ✅ Header has `sticky top-0 z-40` and opaque-ish background (`bg-slate-950/90`)
- ✅ FAB container avoids Intercom by design (`right-20 md:right-24`)
- ✅ `FloatingActions` component is used (not inline FAB JSX)
- ✅ Legacy FAB components (`QuickActions`, `GlobalVoiceButton`) are hard-disabled
- ✅ No duplicate navigation elements across pages
- ✅ Shell transitions smoothly when sidebar collapses/expands

---

## Migration Guide

### Moving a Route into Pulse Shell

1. Move route from `app/route/page.tsx` → `app/(pulse)/route/page.tsx`
2. Remove any full-screen backgrounds (`min-h-screen`, `bg-*`) from the page component
3. Verify sidebar appears
4. Verify topbar is readable
5. Verify FABs don't overlap with page content

### Adding New FAB Action

1. Edit `components/shell/FloatingActions.tsx`
2. Add new button or modify existing button `onClick` handler
3. Test on all Pulse routes

### Creating Alternative Shell (Future)

If you need a mobile or alternative shell:

1. Create new `components/shell/MobileShell.tsx` or similar
2. Create new route group: `app/(mobile)/layout.tsx`
3. Do NOT reuse components between shells (prevents coupling)
4. Document which routes use which shell

---

## Debugging

### FABs Not Showing

- Check that route is under `app/(pulse)/`
- Check that `FloatingActions` is imported and rendered in layout
- Check console for deprecation warnings from legacy components

### Sidebar Not Appearing

- Verify route is under `app/(pulse)/`
- Check that `(pulse)/layout.tsx` is the active layout
- Verify no conflicting layouts exist

### Duplicate FABs

- Search for `fixed bottom` in page components
- Verify `QuickActions` and `GlobalVoiceButton` are not imported in root layout
- Check that deprecated components return `null`

---

## Maintenance

### Automated Checks

**Shell Ownership Check** (Recommended for CI/CD):

```bash
npm run check:shell
```

This script automatically validates that no FABs (fixed bottom-right positioning) exist outside the allowlist:
- ✅ `components/shell/FloatingActions.tsx`
- ✅ `app/(pulse)/layout.tsx`

The check excludes legitimate UI components like:
- Deprecated components (QuickActions, GlobalVoiceButton - already hard-disabled)
- Toast notifications
- Butler/companion/voice overlays
- Proactive widgets
- Attention/focus rescue widgets
- Modal/dialog overlays

**Note**: If the script flags a file that you believe is a legitimate specialized UI component (not a FAB), you can add it to the `EXCLUDE_PATTERNS` array in `scripts/check-shell-ownership.mjs`.

**Manual Checks** (PowerShell):

```powershell
# Check for duplicate FABs
Select-String -Path "app\**\*.tsx","components\**\*.tsx" -Pattern "fixed.*bottom|bottom.*right.*z-50"

# Check for stray routes that should be in Pulse shell
Get-ChildItem -Directory .\app | Where-Object { $_.Name -notmatch '^\(|^api|^components' }

# Check for imports of deprecated components
Select-String -Path "app\**\*.tsx" -Pattern "QuickActions|GlobalVoiceButton"
```

---

## Future Improvements

- [ ] Delete deprecated components (`QuickActions`, `GlobalVoiceButton`) after migration period
- [ ] Create `AppShell` component to make `(pulse)/layout.tsx` thinner
- [ ] Add visual regression tests for shell layout
- [ ] Create mobile-specific shell if needed
- [ ] Add analytics for FAB click rates
- [ ] Consider collapsible topbar on mobile
- [ ] Add `npm run check:shell` to CI/CD pipeline

