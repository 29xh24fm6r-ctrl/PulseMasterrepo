# CRM Schema Map

## Existing Tables (REUSE)

### `crm_contacts` ✅ EXISTS
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid) - **PRIMARY COLUMN**
- **Columns:** `full_name`, `first_name`, `last_name`, `nickname`, `primary_email`, `primary_phone`, `company_name`, `title`, `tags` (text[]), `type`, `relationship_importance`
- **Notes:** Main people/contacts table. Has tags as text[] - will add proper tag system.

### `crm_deals` ✅ EXISTS
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid) - **PRIMARY COLUMN**
- **Person Link:** `primary_contact_id` (uuid) → `crm_contacts(id)`
- **Notes:** Deals/opportunities linked to contacts

### `crm_interactions` ✅ EXISTS
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid) - **PRIMARY COLUMN**
- **Person Link:** `contact_id` (uuid) → `crm_contacts(id)`
- **Columns:** `type`, `channel`, `occurred_at`, `subject`, `summary`, `sentiment`, `importance`
- **Notes:** Used for notes (`type='note'`) and other interactions (calls, emails, meetings). Can be used as timeline source.

### `quantum_tasks` ✅ EXISTS
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid) - **PRIMARY COLUMN** (references `users(id)`)
- **Person Link:** `relationship_relevance` (text[]) - array of contact IDs
- **Notes:** Tasks system, can be linked to contacts via array field

### `crm_relationship_health` ✅ EXISTS
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid) - **PRIMARY COLUMN**
- **Person Link:** `contact_id` (uuid) → `crm_contacts(id)`
- **Notes:** Stores relationship health scores

## New Tables to Create

### `contact_tags` ❌ NEW
- **Purpose:** User-defined tags (Friend, Family, Client, etc.)
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid)
- **Columns:** `name`, `category`, `color`
- **Unique:** `(user_id, name)`

### `contact_tag_links` ❌ NEW
- **Purpose:** Many-to-many link between contacts and tags
- **Primary Key:** `(contact_id, tag_id)` composite
- **User Ownership:** `user_id` (uuid)
- **Links:** `contact_id` → `crm_contacts(id)`, `tag_id` → `contact_tags(id)`

### `contact_emails` ❌ NEW (optional)
- **Purpose:** Multiple emails per contact
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid)
- **Links:** `contact_id` → `crm_contacts(id)`

### `contact_phones` ❌ NEW (optional)
- **Purpose:** Multiple phones per contact
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid)
- **Links:** `contact_id` → `crm_contacts(id)`

### `contact_relationships` ❌ NEW
- **Purpose:** Relationship graph (spouse, kids, etc.)
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid)
- **Links:** `from_contact_id` → `crm_contacts(id)`, `to_contact_id` → `crm_contacts(id)`
- **Columns:** `relation` (spouse, child, parent, etc.), `notes`

### `contact_facts` ❌ NEW
- **Purpose:** Structured facts with provenance (birthday, favorite color, etc.)
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid)
- **Links:** `contact_id` → `crm_contacts(id)`
- **Columns:** `key`, `value_text`, `value_json`, `value_date`, `confidence`, `source`, `source_ref`

### `contact_dates` ❌ NEW
- **Purpose:** Important dates (birthdays, anniversaries, etc.)
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid)
- **Links:** `contact_id` → `crm_contacts(id)`
- **Columns:** `type`, `date`, `recurrence`, `notes`

### `gift_ideas` ❌ NEW
- **Purpose:** Gift ideas and history
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid)
- **Links:** `contact_id` → `crm_contacts(id)`
- **Columns:** `occasion`, `idea`, `price_range`, `why`, `status`

### `interaction_events` ❌ NEW
- **Purpose:** Unified timeline for second brain integration
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid)
- **Links:** `contact_id` → `crm_contacts(id)` (optional)
- **Columns:** `type`, `summary`, `occurred_at`, `payload_ref` (jsonb), `extracted_fact_ids` (uuid[])

## Query Strategy

**ALWAYS use `user_id` (UUID) as primary query column.**
- Get UUID from `users` table: `SELECT id FROM users WHERE clerk_id = ?`
- Query all CRM tables with `user_id = <dbUserId>`
- Only fall back to `owner_user_id` if primary query returns no results

## Relationships

```
crm_contacts (user_id)
  ├─ crm_deals.primary_contact_id → contact
  ├─ crm_interactions.contact_id → contact
  ├─ quantum_tasks.relationship_relevance[] → contains contact.id
  ├─ contact_tag_links.contact_id → contact
  ├─ contact_relationships.from_contact_id → contact
  ├─ contact_relationships.to_contact_id → contact
  ├─ contact_facts.contact_id → contact
  ├─ contact_dates.contact_id → contact
  ├─ gift_ideas.contact_id → contact
  └─ interaction_events.contact_id → contact

contact_tags (user_id)
  └─ contact_tag_links.tag_id → tag
```

