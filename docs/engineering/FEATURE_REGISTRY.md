# Feature Registry + "No Page Left Behind"

## Overview

The Feature Registry is a single source of truth for all user-facing features in Pulse. It prevents features from becoming orphaned and provides a centralized index of what exists, where it lives, and what APIs it depends on.

## Auto-Generation

The Feature Registry is **auto-generated** from the repository structure, with optional manual overrides.

### Files

- **`lib/features/registry.generated.ts`** - Auto-generated from repo scan (DO NOT EDIT)
- **`lib/features/registry.manual.ts`** - Manual overrides (names, descriptions, status, extra links/APIs)
- **`lib/features/registry.ts`** - Merged export (used by Feature Hub + health API)
- **`lib/features/types.ts`** - Shared type definitions

### Generation

**Generate registry:**
```bash
npm run features:gen
```

**Check if registry is up to date:**
```bash
npm run features:check
```

The generator:
- ✅ Scans `app/**/page.tsx` and creates feature links
- ✅ Scans `app/api/**/route.ts` and detects HTTP methods
- ✅ Groups pages + APIs by feature root (first path segment)
- ✅ Creates conservative `ping` defaults (GET + non-dynamic only)
- ✅ Handles Next.js route groups `(pulse)`, `(authenticated)`
- ✅ Skips auth routes, static assets, internal APIs

### Manual Overrides

Edit `lib/features/registry.manual.ts` to:
- Rename features
- Add descriptions
- Adjust status (core/beta/hidden)
- Add extra links or APIs
- Override grouping

Example:
```typescript
{
  id: "home",
  name: "Home Dashboard",
  description: "Daily cockpit across tasks, deals, follow-ups, insights.",
  status: "core",
  group: "Core",
}
```

## Feature Registry Structure

Each feature has:
- **id** - Stable identifier (derived from route)
- **name** - Display name (auto-generated, can override)
- **description** - 1-liner (manual override recommended)
- **status** - `core` | `beta` | `hidden`
- **group** - `Core` | `Work` | `Relationships` | `Voice` | `Settings` | `Ops` | `Labs`
- **links** - Array of page links with labels
- **apis** - Array of backing API endpoints (optional)

## Feature Health API

**Endpoint:** `GET /api/features/health?ping=1`

**Returns:**
- List of all features with their health status
- API endpoint health (if `ping=1` is set)
- Links and API dependencies

**Usage:**
```bash
# Registry check only (fast)
GET /api/features/health

# Full health ping (slower, but checks actual endpoints)
GET /api/features/health?ping=1
```

## Feature Hub UI

**Route:** `/features`

**Features:**
- Lists all registered features
- Shows health status (green/red)
- Search and filter by group
- "Run Health Ping" button for full checks
- Direct links to all feature pages

**Access:**
- Via GlobalNav → "More" → "Features"
- Direct link: `/features`

## Settings Landing

**Route:** `/settings`

**Purpose:**
- Surfaces all settings pages that were previously hidden
- Links to: Billing, Personas, Teaching, Voice Settings

**Access:**
- Via GlobalNav → "More" → "Settings"
- Direct link: `/settings`

## Orphan Routes Check

**Script:** `scripts/orphan-routes-check.mjs`

**Purpose:**
- Scans all `app/` and `components/` files for internal links
- Verifies that linked routes actually exist
- Fails CI if orphan links are found

**Usage:**
```bash
npm run orphan:check
```

**What it checks:**
- `href="/something"` in components
- Verifies `app/something/page.tsx` or `app/something/route.ts` exists
- Skips dynamic routes (e.g., `/foo/[id]`)
- Skips external URLs
- Handles Next.js route groups

## CI Integration

Both checks run in the `sentinel` CI job:

```yaml
- name: Orphan routes check
  run: npm run orphan:check

- name: Feature registry check
  run: npm run features:check
```

**Result:** CI fails if:
- Any nav links point to missing pages (orphan check)
- Generated registry is out of date (features check)

## Best Practices

1. **Run generator after changes** - After adding pages/APIs, run `npm run features:gen`
2. **Commit generated file** - Yes, commit `registry.generated.ts` (it's deterministic)
3. **Use manual overrides sparingly** - Only for names, descriptions, status
4. **Keep descriptions concise** - 1-liner descriptions work best
5. **Check Feature Hub regularly** - Use `/features` to see what's broken

## Workflow

1. **Add new page** → `app/my-feature/page.tsx`
2. **Run generator** → `npm run features:gen`
3. **Review generated** → Check `registry.generated.ts`
4. **Add override if needed** → Edit `registry.manual.ts` for description/status
5. **Commit both** → Generated + manual files

## Status

- ✅ Feature registry auto-generation implemented
- ✅ Manual override system working
- ✅ Feature health API implemented
- ✅ Feature Hub UI created
- ✅ Settings landing page created
- ✅ Orphan routes check implemented
- ✅ CI integration complete

**No page can be left behind.** ✅
