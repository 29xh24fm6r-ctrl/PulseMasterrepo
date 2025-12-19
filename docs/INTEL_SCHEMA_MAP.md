# Intel Schema Map

## Existing Tables (REUSE)

### `crm_contacts` ✅ EXISTS
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid) - **PRIMARY COLUMN**
- **Columns:** `full_name`, `first_name`, `last_name`, `primary_email`, `primary_phone`, `company_name`, `title`, `tags` (text[]), `type`
- **Notes:** Canonical contacts table. Will add `intel_scope` and `action_scope` columns.

### `tb_nodes` ✅ EXISTS (Third Brain Graph)
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid)
- **Purpose:** Universal graph nodes for second brain
- **Columns:** `type`, `props` (jsonb), `source_table`, `source_id`, `started_at`, `ended_at`
- **Notes:** Can store intel as nodes with `type='intel'` or `type='evidence'`, `source_table='crm_contact_intel_sources'`

### `tb_edges` ✅ EXISTS (Third Brain Graph)
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid)
- **Purpose:** Relationships between nodes
- **Links:** `from_node_id` → `tb_nodes(id)`, `to_node_id` → `tb_nodes(id)`
- **Notes:** Can link contact nodes to intel nodes

### `crm_interactions` ✅ EXISTS
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid)
- **Person Link:** `contact_id` (uuid) → `crm_contacts(id)`
- **Notes:** Can store timeline entries for intel additions (`type='note'`, summary includes "User added intel: ...")

## New Tables to Create

### `crm_contact_identity` ❌ NEW
- **Purpose:** Identity card (anchors for entity resolution)
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid)
- **Links:** `contact_id` (uuid) → `crm_contacts(id)`
- **Columns:** `company_domain`, `location`, `known_social_urls` (jsonb), `known_handles` (jsonb)
- **Unique:** `(user_id, contact_id)`

### `crm_contact_intel_sources` ❌ NEW
- **Purpose:** Intel sources (URLs / pages / mentions)
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid)
- **Links:** `contact_id` (uuid) → `crm_contacts(id)`
- **Columns:** `source_type`, `url`, `title`, `publisher`, `author`, `published_at`, `snippet`, `extracted_text`, `retrieved_at`, `match_confidence` (int), `match_status`, `match_evidence` (jsonb)
- **Unique:** `(user_id, contact_id, url)`
- **Indexes:** `(user_id, contact_id)`, `(match_status, match_confidence desc)`

### `crm_contact_intel_claims` ❌ NEW
- **Purpose:** Facts-with-citations (claims)
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid)
- **Links:** `contact_id` (uuid) → `crm_contacts(id)`
- **Columns:** `category`, `claim` (text), `source_url`, `confidence` (int), `status`
- **Indexes:** `(user_id, contact_id)`

### `crm_intel_runs` ❌ NEW
- **Purpose:** Audit + throttling for intel collection runs
- **Primary Key:** `id` (uuid)
- **User Ownership:** `user_id` (uuid)
- **Links:** `contact_id` (uuid) → `crm_contacts(id)`
- **Columns:** `run_type`, `queries` (jsonb), `results_count`, `errors` (jsonb), `started_at`, `finished_at`
- **Indexes:** `(user_id, contact_id)`

## Columns to Add to Existing Tables

### `crm_contacts` - New Columns
- `intel_scope` (text, default 'full') - 'full'|'limited'|'paused'
- `action_scope` (text, default 'none') - 'none'|'suggest'|'automate'
- `industry` (text)
- `keywords` (jsonb, default '[]')

Note: `company_name` and `job_title` already exist in `crm_contacts`.

## Query Strategy

**ALWAYS use `user_id` (UUID) as primary query column.**
- Get UUID from `users` table: `SELECT id FROM users WHERE clerk_id = ?`
- Query all intel tables with `user_id = <dbUserId>`
- Only fall back to `owner_user_id` if primary query returns no results

## Relationships

```
crm_contacts (user_id)
  ├─ crm_contact_identity.contact_id → contact (1:1)
  ├─ crm_contact_intel_sources.contact_id → contact (1:many)
  ├─ crm_contact_intel_claims.contact_id → contact (1:many)
  └─ crm_intel_runs.contact_id → contact (1:many)

tb_nodes (user_id)
  ├─ Can reference intel: source_table='crm_contact_intel_sources', source_id=<source_id>
  └─ Can link to contact: props.contact_id=<contact_id>

crm_interactions (user_id)
  └─ contact_id → contact (for timeline entries)
```

## Second Brain Integration

When saving user-added intel to Second Brain:
1. Create `tb_nodes` entry:
   - `type='evidence'` or `type='intel'`
   - `source_table='crm_contact_intel_sources'`
   - `source_id=<source_id>`
   - `props={ contact_id, url, text, category, user_added: true }`
2. Optionally create `tb_edges`:
   - `from_node_id` = contact node (if exists)
   - `to_node_id` = intel node
   - `kind='has_evidence'` or `kind='has_intel'`

