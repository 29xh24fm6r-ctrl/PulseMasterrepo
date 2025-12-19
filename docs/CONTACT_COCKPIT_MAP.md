# Contact Cockpit Schema Mapping

## Current State (Existing Tables)

### Core Contact Table
- **`crm_contacts`** ✅ EXISTS
  - Primary Key: `id` (uuid)
  - User Ownership: `user_id` (uuid) - references `users(id)`
  - Columns: `full_name`, `first_name`, `last_name`, `nickname`, `primary_email`, `primary_phone`, `company_name`, `title`, `tags` (text[]), `type`, `status`, `relationship_importance`, `created_at`, `updated_at`
  - **Usage**: Main contact/people table - REUSE AS-IS

### Notes/Interactions
- **`crm_interactions`** ✅ EXISTS
  - Primary Key: `id` (uuid)
  - User Ownership: `user_id` (uuid)
  - Contact Link: `contact_id` → `crm_contacts(id)`
  - Columns: `type`, `channel`, `occurred_at`, `subject`, `summary`, `sentiment`, `importance`
  - **Usage**: Notes (`type='note'`) and other interactions - REUSE FOR NOTES
  - **Note**: Will also create events in `crm_contact_events` for unified timeline

### Tasks
- **`crm_tasks`** ✅ EXISTS
  - Primary Key: `id` (uuid)
  - User Ownership: `owner_user_id` (uuid) - **NOTE: Uses Clerk ID string, not db user_id**
  - Contact Link: `contact_id` → `crm_contacts(id)`
  - Columns: `title`, `description`, `status`, `priority`, `due_at`, `created_at`, `updated_at`
  - **Usage**: Contact-scoped tasks - REUSE AS-IS
  - **Note**: Will also create events in `crm_contact_events` for unified timeline

### Relationship Health
- **`crm_relationship_health`** ✅ EXISTS
  - Primary Key: `id` (uuid)
  - User Ownership: `user_id` (uuid)
  - Contact Link: `contact_id` → `crm_contacts(id)`
  - Columns: `score`, `momentum`, `last_interaction_at`, `next_suggested_checkin_at`
  - **Usage**: Legacy health scores - MAY BE SUPERSEDED by `crm_contact_intel` but keep for compatibility

### Deals
- **`crm_deals`** ✅ EXISTS
  - Primary Key: `id` (uuid)
  - User Ownership: `user_id` (uuid)
  - Contact Link: `primary_contact_id` → `crm_contacts(id)`
  - **Usage**: Business deals - REUSE AS-IS

### Emails/Comms
- **Email threads** - Check `lib/email/person.ts` for `getEmailThreadsForContact`
  - Likely uses `email_threads` or similar table
  - **Usage**: Email communications - REUSE EXISTING PATTERN

## New Tables (To Create)

### 1. `crm_contact_events` ❌ NEW
- **Purpose**: Unified timeline backbone - all contact interactions in one place
- **Primary Key**: `id` (uuid)
- **User Ownership**: `owner_user_id` (uuid) - **NOTE: Uses Clerk ID string for consistency with crm_tasks**
- **Contact Link**: `contact_id` → `crm_contacts(id)`
- **Columns**: 
  - `event_type` (email_in, email_out, call, meeting, note, task_created, task_done, followup_sent, etc.)
  - `occurred_at`, `title`, `body`, `source`, `source_id`, `metadata` (jsonb)
- **Indexes**: `(owner_user_id, contact_id, occurred_at desc)`, `(owner_user_id, occurred_at desc)`
- **RLS**: `owner_user_id = auth.uid()` (if using Supabase auth, else app-level)

### 2. `crm_contact_intel` ❌ NEW
- **Purpose**: Cached intelligence snapshot for fast page loads
- **Primary Key**: `contact_id` (uuid) - one row per contact
- **User Ownership**: `owner_user_id` (uuid) - Clerk ID string
- **Columns**:
  - `relationship_score` (0-100), `relationship_trend_30d` (int: -20 to +20)
  - `last_touch_at`, `last_touch_type`, `next_touch_due_at`
  - `open_loops_count`, `risk_flags` (jsonb), `top_topics` (jsonb)
  - `key_facts` (jsonb), `ai_summary` (text), `suggested_next_actions` (jsonb)
  - `updated_at`
- **Indexes**: `(owner_user_id, updated_at desc)`
- **RLS**: `owner_user_id = auth.uid()`

### 3. `crm_contact_facts` ❌ NEW
- **Purpose**: Human + AI facts about the contact (preferences, family, business context)
- **Primary Key**: `id` (uuid)
- **User Ownership**: `owner_user_id` (uuid) - Clerk ID string
- **Contact Link**: `contact_id` → `crm_contacts(id)`
- **Event Link**: `source_event_id` → `crm_contact_events(id)` (nullable)
- **Columns**: `fact` (text), `category` (preference/family/business/objection/goal/value/boundary), `confidence` (0-1), `pinned` (boolean)
- **Indexes**: `(owner_user_id, contact_id)`, `(owner_user_id, contact_id, pinned desc, created_at desc)`
- **RLS**: `owner_user_id = auth.uid()`

## Data Flow

### Creating a Note
1. Insert into `crm_interactions` (type='note')
2. Insert into `crm_contact_events` (event_type='note', source_id = interaction.id)
3. Trigger refresh of `crm_contact_intel` (async)

### Creating a Task
1. Insert into `crm_tasks`
2. Insert into `crm_contact_events` (event_type='task_created', source_id = task.id)
3. Trigger refresh of `crm_contact_intel` (async)

### Creating a Fact
1. Insert into `crm_contact_facts`
2. Optionally insert into `crm_contact_events` (event_type='fact_added')
3. Update `crm_contact_intel.key_facts` (async)

### Loading Cockpit Page
1. Fetch `crm_contacts` (profile)
2. Fetch `crm_contact_intel` (cached snapshot - fast)
3. Fetch `crm_contact_events` (last 50 for timeline)
4. Fetch `crm_tasks`, `crm_interactions`, emails in parallel
5. If intel missing/stale, trigger refresh (async)

## Key Design Decisions

1. **Dual User ID Pattern**: 
   - `crm_contacts`, `crm_interactions`, `crm_deals` use `user_id` (db UUID)
   - `crm_tasks` uses `owner_user_id` (Clerk ID string)
   - **Decision**: New tables (`crm_contact_events`, `crm_contact_intel`, `crm_contact_facts`) use `owner_user_id` (Clerk ID) for consistency with `crm_tasks`

2. **Unified Timeline**:
   - `crm_contact_events` is the source of truth for timeline
   - All interactions (notes, tasks, emails, calls) should create events
   - Events are append-only (immutable)

3. **Cached Intel**:
   - `crm_contact_intel` is computed/refreshed periodically
   - Page loads show cached intel immediately
   - Refresh happens async after page load

4. **Backward Compatibility**:
   - Keep using `crm_interactions` for notes (don't break existing code)
   - Keep using `crm_tasks` for tasks
   - New `crm_contact_events` table augments, doesn't replace

## Migration Strategy

1. Create new tables (`crm_contact_events`, `crm_contact_intel`, `crm_contact_facts`)
2. Backfill `crm_contact_events` from existing `crm_interactions` and `crm_tasks` (optional, can be done gradually)
3. Create refresh function for `crm_contact_intel`
4. Update write endpoints to create events
5. Update cockpit endpoint to use new tables

