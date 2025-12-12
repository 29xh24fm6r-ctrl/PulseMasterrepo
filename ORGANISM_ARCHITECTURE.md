# 🧬 Pulse Unified Organism Architecture

## Overview

The Unified Organism consolidates CRM, Contacts, Intelligence, and Second Brain into a **single living system** with zero duplication. All modules operate on the same canonical entities, linked via `tb_node_id`.

## Core Principles

1. **Single Source of Truth**: CRM tables (`crm_contacts`, `crm_organizations`, `crm_deals`) are the only writable identity stores
2. **Second Brain as Enrichment Layer**: All meaning, evidence, and intelligence is stored in `tb_*` tables
3. **Intelligence Writes to Brain Only**: Brave search results go to Second Brain, with derived summaries updating CRM
4. **Universal Linking**: All entities are linked via `tb_node_id` to connect CRM ↔ Second Brain
5. **No Duplicates**: Identity resolution prevents duplicate contacts/orgs

## Data Model

### Canonical Entities (Writable by UI)

```
crm_contacts (Person)
  ├── owner_user_id
  ├── tb_node_id (links to tb_nodes)
  ├── primary_email, primary_phone
  └── intel_summary (derived, not manually edited)

crm_organizations (Organization)
  ├── owner_user_id
  ├── tb_node_id (links to tb_nodes)
  ├── domain (for deduplication)
  └── intel_summary (derived)

crm_deals (Opportunity)
  ├── owner_user_id
  ├── tb_node_id (links to tb_nodes)
  └── linked to contacts/orgs

crm_interactions (Universal Timeline)
  ├── owner_user_id
  ├── type: email/call/sms/meeting/note
  └── linked to contact/org/deal

crm_tasks (Follow-ups)
  ├── owner_user_id
  └── linked to contact/org/deal
```

### Second Brain (Enrichment Layer)

```
tb_nodes (Concepts/Entities)
  ├── owner_user_id
  ├── node_type: person/org/deal/source
  └── metadata (flexible JSON)

tb_edges (Relationships)
  ├── owner_user_id
  ├── from_node_id → to_node_id
  └── edge_type: has_evidence/has_source

tb_memory_fragments (Evidence)
  ├── owner_user_id
  ├── entity_tb_node_id (links to person/org)
  ├── source_type: interaction/intelligence
  └── provenance (where it came from)
```

### Derived-Only Tables (Written by Jobs, Not UI)

- `crm_relationship_health`
- `crm_deal_health`
- `*_insights`, `*_predictions`, `*_scores`, `*_alerts`

**Rule**: UI can display these, but must never manually edit them.

## Service Layer

### `lib/organism/identity.ts`

**`resolveIdentity(userId, input)`**
- Resolves or creates contact/org based on email/phone/domain
- Prevents duplicates by matching existing records
- Returns: `{ contact_id, org_id, tb_node_id, confidence, did_create, matched_by }`

**`ensureTBNodeForEntity(userId, type, entityId)`**
- Creates `tb_nodes` record for CRM entity if missing
- Links CRM → Second Brain via `tb_node_id`
- Returns: `{ tb_node_id, did_create }`

### `lib/organism/interactions.ts`

**`logInteraction(userId, input)`**
- Creates one `crm_interactions` record
- Creates `tb_memory_fragments` for semantic recall
- Creates `tb_edges` linking entity → evidence
- Returns: `{ interaction_id, memory_fragment_id }`

### `lib/organism/tasks.ts`

**`createTask(userId, input)`**
- Creates task linked to contact/org/deal
- Uses canonical entity IDs

### `lib/intelligence/index.ts`

**`runIntelForEntity(userId, entityType, entityId, queries?)`**
- Searches Brave for entity intelligence
- Stores findings in `tb_memory_fragments` only
- Updates derived `intel_summary` on CRM entity
- Returns: `{ findings, memory_fragments_created, summary }`

**Key Rule**: Intelligence **never** writes contacts/orgs. It writes enrichment to Second Brain.

## API Surface

### Unified Organism Routes

```
GET/POST /api/organism/contacts
GET/POST /api/organism/organizations
GET/POST /api/organism/interactions
GET/POST /api/organism/tasks
```

All routes:
- Require Clerk auth (`requireClerkUserId()`)
- Use service-role Supabase (`supabaseServer()`)
- Enforce `.eq('owner_user_id', userId)`
- Use identity resolution to prevent duplicates

### Intelligence Routes

```
POST /api/intel/run
  Body: { entity_type, entity_id, queries? }
  Returns: { findings_count, memory_fragments_created, summary }

GET /api/intel/results?entity_tb_node_id=... OR ?entity_type=...&entity_id=...
  Returns: { memory_fragments, sources, total_findings }
```

## Workflow Examples

### Creating a Contact

```typescript
// UI calls
POST /api/organism/contacts
{
  email: "john@example.com",
  name: "John Doe",
  company: "Acme Corp"
}

// Backend:
1. resolveIdentity() checks for existing contact by email
2. If found, returns existing contact_id
3. If not, creates new contact with owner_user_id
4. ensureTBNodeForEntity() creates tb_nodes record
5. Links crm_contacts.tb_node_id = tb_node.id
6. Returns contact + resolution metadata
```

### Logging an Email Interaction

```typescript
POST /api/organism/interactions
{
  type: "email",
  contact_id: "...",
  occurred_at: "2024-01-01T12:00:00Z",
  subject: "Meeting follow-up",
  summary: "Discussed project timeline...",
  metadata: { threadId: "...", messageId: "..." }
}

// Backend:
1. logInteraction() creates crm_interactions record
2. ensureTBNodeForEntity() ensures contact has tb_node
3. Creates tb_memory_fragments with email content
4. Creates tb_edges: contact_node → memory_fragment
5. Returns interaction_id + memory_fragment_id
```

### Running Intelligence

```typescript
POST /api/intel/run
{
  entity_type: "person",
  entity_id: "contact-123"
}

// Backend:
1. Resolve contact and ensure tb_node exists
2. Generate search queries: ["John Doe", "John Doe Acme Corp"]
3. Call Brave API for each query
4. Process results into IntelFinding format
5. Store each finding as tb_memory_fragments
6. Create tb_edges: contact_node → source_nodes → fragments
7. Generate summary from findings
8. Update crm_contacts.intel_summary (derived field)
9. Return findings count + summary
```

## Migration Guide

### Step 1: Run Database Migration

```sql
-- Run supabase/migrations/001_add_tb_node_links.sql
-- Adds:
-- - tb_node_id columns to crm_contacts, crm_organizations, crm_deals
-- - intel_summary fields
-- - domain field for org deduplication
-- - Indexes for performance
```

### Step 2: Update Existing Code

**Replace direct CRM writes** with organism layer:

```typescript
// Before:
await supabase.from("crm_contacts").insert({...});

// After:
import { resolveIdentity } from "@/lib/organism";
const resolution = await resolveIdentity(userId, { email, name });
```

**Replace interaction logging**:

```typescript
// Before:
await supabase.from("interactions").insert({...});

// After:
import { logInteraction } from "@/lib/organism";
await logInteraction(userId, { type: "email", ... });
```

### Step 3: Wire Email/Calendar Ingestion

Update email sync to use `logInteraction()`:

```typescript
// Email sync handler
const resolution = await resolveIdentity(userId, {
  email: message.from.email,
  name: message.from.name,
});

await logInteraction(userId, {
  type: "email",
  contact_id: resolution.contact_id,
  occurred_at: message.date,
  subject: message.subject,
  summary: message.body,
  metadata: { threadId: message.threadId, messageId: message.id },
});
```

### Step 4: Stop Writing to Parallel Tables

- Find all code writing to `contacts` table
- Replace with `/api/organism/contacts` calls
- Optionally create view: `contacts_view AS SELECT * FROM crm_contacts`

## Deduplication Strategy

### Current Implementation

- Email matching (highest confidence)
- Phone matching
- Name matching (lower confidence)
- Domain matching for orgs

### Future Enhancements

After migration stabilizes, add unique constraints:

```sql
-- After running dedupe script
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_contacts_email_unique
ON crm_contacts(owner_user_id, LOWER(primary_email))
WHERE primary_email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_organizations_domain_unique
ON crm_organizations(owner_user_id, domain)
WHERE domain IS NOT NULL;
```

## Environment Variables

```bash
# Required
BRAVE_API_KEY=your_brave_api_key_here

# Already configured
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Success Criteria

✅ Creating a contact anywhere results in **one contact record** (crm_contacts)  
✅ Email/calendar ingestion **never creates duplicates**  
✅ Intelligence enriches the same person/org via `tb_node_id` links  
✅ Second Brain search returns intel + interactions for the same entity  
✅ No module writes to parallel "contacts" tables  
✅ All writes include `owner_user_id` for tenant isolation  

## Next Steps

1. ✅ Core organism service layer
2. ✅ Unified API routes
3. ✅ Intelligence layer
4. ⏳ Database migration
5. ⏳ Deduplication constraints
6. ⏳ Wire email/calendar ingestion
7. ⏳ Create unified profile page
8. ⏳ Update existing UI to use organism routes

