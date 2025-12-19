# Database Migration Safety

## Overview

The migration safety check ensures database changes are properly managed and risky operations are explicitly acknowledged.

## Safety Checks

### 1. Timestamped Filenames

All migration files must be timestamped:

✅ **Valid:**
- `20251218_my_migration.sql`
- `20251218123000_my_migration.sql`

❌ **Invalid:**
- `my_migration.sql`
- `migration_1.sql`

### 2. Schema Changes Require Migrations

If you change schema-related code, you must add a migration:

**Schema-related areas:**
- `app/api/**` - API routes that interact with DB
- `lib/**` - Library code that touches DB
- `supabase/**` - Supabase config/schema
- Files containing `schema`, `db`, `migrations`

**Example:**
```bash
# Changed app/api/contacts/route.ts
# Must add: supabase/migrations/20251220_add_contact_field.sql
```

### 3. Risky Operations Require Annotation

Risky SQL operations must include an explicit comment:

**Risky patterns:**
- `DROP TABLE`
- `DROP COLUMN`
- `ALTER TABLE ... DROP`
- `TRUNCATE TABLE`

**Required annotation:**
```sql
-- ALLOW_RISKY_MIGRATION
DROP TABLE old_table;
```

## Migration Directory

Migrations are stored in:
- `supabase/migrations/` (primary)

The check auto-detects migration directories.

## Running the Check

```bash
npm run migrations:check
```

This runs automatically in CI as part of the sentinel job.

## CI Enforcement

The check runs:
- ✅ On every PR
- ✅ On every push to main
- ✅ Before deployment

**Failure modes:**
- Missing migration for schema changes
- Non-timestamped migration files
- Risky operations without annotation

## Best Practices

1. **Always timestamp migrations** - Use format: `YYYYMMDD_description.sql`
2. **One migration per change** - Don't bundle unrelated changes
3. **Test migrations locally** - Run `supabase db reset` to test
4. **Review risky operations** - Get team approval before dropping tables/columns
5. **Document complex migrations** - Add comments explaining the change

## Example Migration

```sql
-- Migration: Add index to contacts table for faster lookups
-- Date: 2025-01-20
-- Author: team

CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- If this was a risky operation, you'd need:
-- -- ALLOW_RISKY_MIGRATION
-- DROP INDEX idx_contacts_old;
```

## Troubleshooting

### "Schema-related files changed but no new migration SQL added"

**Fix:** Add a migration file in `supabase/migrations/` with a timestamped name.

### "Migration not timestamped"

**Fix:** Rename the file to start with `YYYYMMDD_` or `YYYYMMDDHHMMSS_`.

### "Risky migration detected without override comment"

**Fix:** Add `-- ALLOW_RISKY_MIGRATION` comment above the risky SQL statement.

## Status

- ✅ Migration safety check implemented
- ✅ CI enforcement active
- ✅ Timestamp validation working
- ✅ Risky operation detection working

