# Supabase-Only Architecture

## Database Policy

**Supabase is the ONLY live datastore for all user data.**

### Core Rules

1. **All user data must be stored in Supabase** (contacts, tasks, deals, habits, journal)
2. **Notion is NOT used for data persistence**
3. **Notion may ONLY be used for**:
   - Import/export tooling (`/scripts/`, `/lib/importers/notion/`)
   - One-time migration scripts
   - Read-only reference data (if explicitly needed)

4. **No API route under `app/api/**` may import `@notionhq/client`**
5. **No UI component may write to Notion**

---

## Canonical Tables & Endpoints

### Contacts
- **Table**: `public.crm_contacts`
- **Endpoints**: `GET/POST /api/contacts`, `POST /api/people/create`
- **User Mapping**: `user_id` (uuid) → Pulse UUID, `owner_user_id` (text) → Clerk ID

### Tasks
- **Table**: `public.tasks`
- **Endpoints**: `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/[id]`
- **Fields**: `title`, `notes`, `status`, `priority`, `due_date`

### Deals
- **Table**: `public.deals`
- **Endpoints**: `GET/POST /api/deals`, `PATCH/DELETE /api/deals/[id]`
- **Fields**: `name`, `company`, `amount`, `stage`, `close_date`, `notes`

### Habits
- **Tables**: `public.habits`, `public.habit_logs`
- **Endpoints**: `GET/POST /api/habits`, `PATCH/DELETE /api/habits/[id]`, `POST /api/habits/[id]/log`
- **Fields**: `name`, `frequency`, `target`, `notes`, `is_active`

### Journal
- **Table**: `public.journal_entries`
- **Endpoints**: `GET/POST /api/journal`, `PATCH/DELETE /api/journal/[id]`
- **Fields**: `entry_date`, `title`, `content`, `mood`, `tags`

---

## Deprecated Endpoints

All of the following return **410 Gone**:

- `POST /api/second-brain/create` → Use `POST /api/contacts`
- `POST /api/second-brain/create-from-email` → Use `POST /api/contacts`
- `GET/POST /api/notion/contacts` → Use `GET/POST /api/contacts`
- `GET/POST /api/notion/tasks` → Use `GET/POST /api/tasks`
- `GET/POST /api/notion/deals` → Use `GET/POST /api/deals`
- `GET/POST /api/notion/habits` → Use `GET/POST /api/habits`
- `GET/POST /api/notion/journal` → Use `GET/POST /api/journal`

---

## HTTP Helpers (Required)

All UI network calls must use shared helpers:

- `lib/http/getJson.ts` - GET requests
- `lib/http/postJson.ts` - POST requests
- `lib/http/patchJson.ts` - PATCH requests

**No raw `fetch()` calls in pages for mutations.**

This prevents silent failures and keeps error handling consistent.

---

## API Response Standards

### List Response
```json
{
  "items": [
    { "id": "...", "title": "...", ... }
  ]
}
```

### Single Item Response
```json
{
  "item": {
    "id": "...",
    "title": "...",
    ...
  }
}
```

### Error Response
```json
{
  "error": "Error message"
}
```

---

## Why This Policy?

1. **Single source of truth** - No duplicate data across systems
2. **Consistent schema** - All domains follow the same structure
3. **Better performance** - Direct database queries, no API overhead
4. **Simpler maintenance** - One code path per domain
5. **Better deduplication** - Foundation-mode triggers prevent duplicates
6. **Easier testing** - Single database to test against

---

## Migration Notes

If you find code writing to Notion:

1. **Identify the domain** (tasks, deals, habits, journal, contacts)
2. **Update to use canonical endpoint** (`/api/<domain>`)
3. **Remove Notion database references**
4. **Test that data appears in Supabase**
5. **Verify no Notion traffic in network tab**

---

## New Feature Development

**When building new features:**

1. **Start with a Supabase table** - Create migration first
2. **Create canonical API route** - Follow existing patterns
3. **Use HTTP helpers** - `getJson`, `postJson`, `patchJson`
4. **Never use Notion** - Notion is import/export only

---

## Enforcement

- **CI Guard** (Sprint 3): Build-time check to prevent `@notionhq/client` imports in `app/api/**`
- **Code Review**: All PRs must verify no Notion writes
- **Testing**: Manual verification that no Notion traffic occurs

---

**Last Updated**: 2024-12-16  
**Status**: Active Policy  
**Sprint 1**: ✅ Complete (Contacts)  
**Sprint 2**: ✅ Complete (Tasks, Deals, Habits, Journal)

