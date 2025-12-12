# Apply Database Migration - Step by Step

## Option A: Supabase Dashboard (Recommended)

### Step 1: Open Supabase Dashboard
1. Go to: **https://supabase.com/dashboard**
2. Sign in to your account
3. Select your project

### Step 2: Open SQL Editor
1. In the left sidebar, click **SQL Editor**
2. Click **New Query** button (or the "+" icon)

### Step 3: Copy Migration SQL
1. Open the file: **`MIGRATION_READY.sql`** (or `supabase/migrations/008_mythic_arc_tables.sql`)
2. Select **ALL** text (Ctrl+A)
3. Copy (Ctrl+C)

### Step 4: Paste and Run
1. Paste into the SQL Editor (Ctrl+V)
2. Click the **Run** button (or press **F5**)
3. Wait for execution to complete

### Step 5: Verify Success
You should see:
- ✅ **"Success. No rows returned"** message
- ✅ No error messages

### Step 6: Verify Tables Created
Run this verification query in SQL Editor:

```sql
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name AND column_name = 'user_id') as has_user_id
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('mythic_arcs', 'mythic_quests', 'mythic_rituals', 'life_canon_entries')
ORDER BY table_name;
```

**Expected Result:**
- Should return 4 rows
- Each row should show `has_user_id = 1`

---

## Option B: Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

---

## ✅ Migration Complete When:

- [x] Migration ran without errors
- [x] Verification query returns 4 tables
- [x] All tables have `user_id` column
- [x] No error messages in SQL Editor

---

## 🆘 Troubleshooting

**Error: "relation already exists"**
- ✅ This is OK - `CREATE TABLE IF NOT EXISTS` handles this
- Tables already exist, which is fine

**Error: "permission denied"**
- Check you have admin access to the Supabase project
- Ensure you're using the correct project

**Error: "syntax error"**
- Make sure you copied the entire SQL file
- Check for any partial copy/paste

**Tables don't appear:**
- Refresh the Supabase Dashboard
- Check the correct project is selected
- Run verification query again

---

**Next Step:** After migration is applied, proceed to Step 2: Verify Environment Variables

