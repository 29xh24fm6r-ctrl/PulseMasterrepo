# Contact Migration Scripts

## Migrate Notion Contacts to Supabase

This script migrates contacts from your Notion Second Brain database to Supabase (`crm_contacts` table).

### Prerequisites

1. **Environment Variables** (set in `.env.local` or export before running):
   ```bash
   NOTION_API_KEY=secret_...
   NOTION_DATABASE_SECOND_BRAIN=your-database-id
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   CLERK_USER_ID=user_...  # The Clerk user ID whose contacts to migrate
   ```

2. **Install dependencies** (if not already):
   ```bash
   npm install @notionhq/client @supabase/supabase-js tsx
   ```

### Usage

```bash
# Run the migration script
npx tsx scripts/migrate-notion-contacts-to-supabase.ts
```

### What It Does

1. **Fetches all contacts** from your Notion Second Brain database
2. **Resolves Pulse UUID** from Clerk user ID
3. **Migrates each contact** to `crm_contacts` table:
   - Maps Notion properties to Supabase columns
   - Handles name splitting (first/last)
   - Normalizes email/phone
   - Preserves tags, notes, company, title
4. **Skips duplicates** (foundation-mode trigger prevents duplicates)
5. **Reports summary** of successful/duplicate/error counts

### Mapping

| Notion Property | Supabase Column |
|----------------|----------------|
| Name | first_name, last_name, full_name, display_name |
| Email | primary_email, normalized_email |
| Phone | primary_phone, normalized_phone |
| Company | company_name |
| Title / Role | job_title, title |
| Notes | notes |
| Tags (multi-select) | tags (array) |

### Notes

- **Duplicates are automatically skipped** (foundation-mode trigger blocks them)
- **One-time migration** - run manually when needed
- **Safe to re-run** - duplicates won't be created
- **Preserves data** - all available fields are migrated

### Troubleshooting

**Error: "No profile found for clerk_user_id"**
- Ensure `CLERK_USER_ID` is correct
- Check that `profiles` table has a row with matching `clerk_user_id`

**Error: "NOTION_DATABASE_SECOND_BRAIN not set"**
- Set the environment variable with your Notion database ID
- Database ID can be found in the Notion database URL

**Error: "Duplicate contact blocked"**
- This is expected for contacts that already exist
- The script will skip them and continue

---

**Last Updated**: 2024-12-16

