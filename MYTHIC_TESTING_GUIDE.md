# Mythic Story Sessions - Testing Guide

## Manual End-to-End Testing

Since automated testing requires authentication tokens, use this manual testing guide.

### Prerequisites

1. ✅ Database migration applied (`supabase/migrations/008_mythic_arc_tables.sql`)
2. ✅ Dev server running (`npm run dev`)
3. ✅ User logged in via Clerk
4. ✅ Supabase connection working

---

## Test Flow

### Step 1: Verify Dashboard Loads

1. Navigate to `/home` or your dashboard page
2. **Expected:** Mythic Arc Card appears
3. **Check:** Card shows "The Current Chapter" or existing arc title
4. **Check:** "Continue" and "Refresh" buttons are visible

✅ **Pass Criteria:** Card renders without errors

---

### Step 2: Test GET `/api/mythic/state`

**Option A: Via Browser DevTools**

1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to `/home`
4. Find request to `/api/mythic/state`
5. Check response:

```json
{
  "activeArc": null,  // or arc object
  "actLabel": null,
  "dominantTrial": null,
  "shadowLine": null,
  "activeQuestCount": 0,
  "latestSession": null
}
```

**Option B: Via Browser Console**

```javascript
fetch('/api/mythic/state')
  .then(r => r.json())
  .then(console.log);
```

✅ **Pass Criteria:** Response is valid JSON with expected fields

---

### Step 3: Test Session Creation

1. Click "Continue" on Mythic Arc Card
2. **Expected:** Modal opens
3. Enter test transcript:
   ```
   I'm testing the Mythic Story Sessions feature. 
   This is a test session to verify the end-to-end flow works correctly.
   ```
4. Click "Canonize Session"
5. **Expected:** 
   - Loading state shows "Extracting & Saving…"
   - Modal closes after success
   - No error messages

✅ **Pass Criteria:** Session saves successfully, modal closes

---

### Step 4: Verify Database State

**In Supabase SQL Editor, run:**

```sql
-- Replace YOUR_CLERK_USER_ID with your actual Clerk user ID
-- First, find your database user ID:
SELECT id, clerk_id FROM users WHERE clerk_id = 'YOUR_CLERK_USER_ID';

-- Then use that UUID for the following queries:
-- (Replace YOUR_DB_USER_UUID with the id from above)

-- Check for active arc
SELECT * FROM mythic_arcs 
WHERE user_id = 'YOUR_DB_USER_UUID' 
  AND status = 'active';

-- Check for sessions
SELECT id, session_type, created_at 
FROM mythic_sessions 
WHERE user_id = 'YOUR_DB_USER_UUID' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check for canon entries
SELECT id, title, created_at 
FROM life_canon_entries 
WHERE user_id = 'YOUR_DB_USER_UUID' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check for quests (if extraction worked)
SELECT id, title, status 
FROM mythic_quests 
WHERE user_id = 'YOUR_DB_USER_UUID' 
ORDER BY created_at DESC;
```

✅ **Pass Criteria:** 
- At least one `mythic_arcs` row (active)
- At least one `mythic_sessions` row
- At least one `life_canon_entries` row
- Quest rows if LLM extraction worked

---

### Step 5: Test Arc Update

1. Refresh the dashboard page
2. **Expected:** Mythic Arc Card updates
3. **Check:** Card shows arc title, act label, trial if present
4. Click "Refresh" button
5. **Expected:** Card refetches and updates

✅ **Pass Criteria:** Card updates correctly after session creation

---

### Step 6: Test Multiple Sessions

1. Create 2-3 more sessions with different transcripts
2. **Check:** Each session saves successfully
3. **Check:** Arc updates if extraction extracts new act/shadow/etc.
4. Verify in database that all sessions exist

✅ **Pass Criteria:** Multiple sessions work correctly

---

### Step 7: Test Error Handling

**Test Empty Transcript:**
1. Open modal
2. Leave transcript empty
3. Try to save
4. **Expected:** Save button disabled OR error shown

**Test Without OPENAI_API_KEY:**
1. Remove `OPENAI_API_KEY` from environment
2. Create a session
3. **Expected:** Session still saves (extraction just returns null)

✅ **Pass Criteria:** Errors handled gracefully, no crashes

---

## Automated Test Script

A test script is provided at `scripts/test-mythic-end-to-end.ts`, but it requires:

1. Clerk authentication tokens (complex to set up)
2. Test environment configuration

**To use it (advanced):**

```bash
# Install tsx if not already installed
npm install -g tsx

# Set test environment variables
export TEST_CLERK_USER_ID="your_clerk_user_id"
export API_BASE_URL="http://localhost:3000"

# Run test script
npm run test:mythic
```

**Note:** The script is mostly a structure - full automation requires Clerk token management.

---

## Test Checklist

- [ ] Dashboard loads with Mythic Arc Card
- [ ] GET `/api/mythic/state` returns valid response
- [ ] Modal opens when clicking "Continue"
- [ ] Session saves successfully
- [ ] Database has arc, session, and canon entry rows
- [ ] Card updates after session creation
- [ ] Multiple sessions work correctly
- [ ] Error handling works (empty transcript, etc.)
- [ ] LLM extraction works (if API key provided)
- [ ] Sessions save even if LLM extraction fails

---

## Troubleshooting

**Issue: Card doesn't appear**
- Check browser console for errors
- Verify API endpoint is accessible
- Check network tab for failed requests

**Issue: Session doesn't save**
- Check browser console for errors
- Verify Supabase connection
- Check database migration is applied
- Verify `user_id` column exists

**Issue: Database queries return no rows**
- Verify migration was applied
- Check that `user_id` matches your database UUID (not Clerk ID)
- Verify RLS policies allow your user to see their own data

**Issue: LLM extraction not working**
- Check `OPENAI_API_KEY` is set
- Check API key is valid
- Note: Sessions should still save without extraction

---

## Success Criteria

All tests pass when:

✅ UI renders correctly  
✅ API endpoints respond correctly  
✅ Sessions save to database  
✅ Data is retrievable  
✅ Error handling works  
✅ Multiple sessions work  
✅ Graceful degradation works (no LLM extraction)

---

**Last Updated:** 2025-01-XX

