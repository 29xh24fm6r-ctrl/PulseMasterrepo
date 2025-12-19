# Duplicate Prevention + Merge Schema Map

## Tables That Reference Contacts

### Direct Foreign Key References

#### `crm_interactions`
- **Column:** `contact_id` (uuid)
- **Type:** Direct FK → `crm_contacts(id)`
- **Merge Action:** UPDATE `contact_id` from loser to winner
- **Notes:** Interactions/notes/meetings linked to contact

#### `crm_deals`
- **Column:** `primary_contact_id` (uuid)
- **Type:** Direct FK → `crm_contacts(id)` (nullable)
- **Merge Action:** UPDATE `primary_contact_id` from loser to winner (where not null)
- **Notes:** Primary contact on deals

#### `crm_deal_contacts` (if exists)
- **Column:** `contact_id` (uuid)
- **Type:** Direct FK → `crm_contacts(id)`
- **Merge Action:** UPDATE `contact_id` from loser to winner
- **Notes:** Secondary contacts on deals

#### `crm_relationship_health`
- **Column:** `contact_id` (uuid)
- **Type:** Direct FK → `crm_contacts(id)`
- **Merge Action:** UPDATE `contact_id` from loser to winner (if unique constraint allows), otherwise DELETE loser row if winner exists
- **Notes:** Health scores per contact (should be 1:1)

#### `contact_tag_links`
- **Column:** `contact_id` (uuid)
- **Type:** Direct FK → `crm_contacts(id)`
- **Merge Action:** UPDATE `contact_id` from loser to winner, then dedupe tag links
- **Notes:** Many-to-many tag relationships

#### `contact_relationships`
- **Column:** `from_contact_id` (uuid), `to_contact_id` (uuid)
- **Type:** Direct FK → `crm_contacts(id)` (both)
- **Merge Action:** UPDATE both columns from loser to winner (handle self-loops by deleting if both become same)
- **Notes:** Relationship graph edges

#### `contact_facts` (if exists from human_crm_foundation)
- **Column:** `contact_id` (uuid)
- **Type:** Direct FK → `crm_contacts(id)`
- **Merge Action:** UPDATE `contact_id` from loser to winner
- **Notes:** Structured facts

#### `contact_dates` (if exists)
- **Column:** `contact_id` (uuid)
- **Type:** Direct FK → `crm_contacts(id)`
- **Merge Action:** UPDATE `contact_id` from loser to winner
- **Notes:** Important dates (birthdays, etc.)

#### `gift_ideas` (if exists)
- **Column:** `contact_id` (uuid)
- **Type:** Direct FK → `crm_contacts(id)`
- **Merge Action:** UPDATE `contact_id` from loser to winner
- **Notes:** Gift ideas per contact

#### `interaction_events` (if exists)
- **Column:** `contact_id` (uuid)
- **Type:** Direct FK → `crm_contacts(id)` (nullable)
- **Merge Action:** UPDATE `contact_id` from loser to winner
- **Notes:** Timeline events

### Intel Tables (from universal_contact_intel migration)

#### `crm_contact_identity`
- **Column:** `contact_id` (uuid)
- **Type:** Direct FK → `crm_contacts(id)`, UNIQUE(user_id, contact_id)
- **Merge Action:** If both winner and loser have identity records, merge JSONB fields (known_social_urls, known_handles), then DELETE loser record. If only loser has one, UPDATE contact_id to winner.
- **Notes:** 1:1 relationship, must merge data

#### `crm_contact_intel_sources`
- **Column:** `contact_id` (uuid)
- **Type:** Direct FK → `crm_contacts(id)`
- **Merge Action:** UPDATE `contact_id` from loser to winner, handle URL uniqueness per contact
- **Notes:** Intel sources (may need dedupe by URL)

#### `crm_contact_intel_claims`
- **Column:** `contact_id` (uuid)
- **Type:** Direct FK → `crm_contacts(id)`
- **Merge Action:** UPDATE `contact_id` from loser to winner
- **Notes:** Intel claims

#### `crm_intel_runs`
- **Column:** `contact_id` (uuid)
- **Type:** Direct FK → `crm_contacts(id)`
- **Merge Action:** UPDATE `contact_id` from loser to winner
- **Notes:** Audit trail for intel runs

### Array/JSON References

#### `quantum_tasks`
- **Column:** `relationship_relevance` (text[] or uuid[])
- **Type:** Array containing contact IDs as strings or UUIDs
- **Merge Action:** For each task where array contains loser ID, replace loser with winner (dedupe array)
- **Notes:** Tasks can reference multiple contacts

### News/Drip Tables (if exists)

#### `contact_news_preferences` (if exists from news_drip)
- **Column:** `contact_id` (uuid)
- **Type:** Direct FK → `crm_contacts(id)`
- **Merge Action:** UPDATE `contact_id` from loser to winner
- **Notes:** News preferences per contact

#### `news_recommendations` (if exists)
- **Column:** `contact_id` (uuid)
- **Type:** Direct FK → `crm_contacts(id)`
- **Merge Action:** UPDATE `contact_id` from loser to winner
- **Notes:** News recommendations

#### `news_email_drafts` (if exists)
- **Column:** `contact_id` (uuid)
- **Type:** Direct FK → `crm_contacts(id)`
- **Merge Action:** UPDATE `contact_id` from loser to winner
- **Notes:** Email drafts

### Third Brain Graph References

#### `tb_nodes`
- **Column:** `props.contact_id` (in JSONB)
- **Type:** Logical reference via `source_table='crm_contacts'`, `source_id=contactId`
- **Merge Action:** UPDATE `props.contact_id` from loser to winner, UPDATE `source_id` where `source_table='crm_contacts'`
- **Notes:** Graph nodes may reference contacts

#### `tb_edges`
- **Column:** May reference contact nodes indirectly
- **Type:** Via node references
- **Merge Action:** Handle via node updates above
- **Notes:** Edges between nodes

## Merge Strategy Summary

### Direct FK Updates (Simple)
- `crm_interactions`
- `crm_deals.primary_contact_id`
- `crm_contact_intel_sources`
- `crm_contact_intel_claims`
- `crm_intel_runs`
- `contact_tag_links` (with dedupe)
- `contact_facts`, `contact_dates`, `gift_ideas` (if exist)

### Special Handling (1:1 or Data Merge)
- `crm_contact_identity` - Merge JSONB fields, keep single record
- `crm_relationship_health` - Check uniqueness, merge or delete

### Array Updates
- `quantum_tasks.relationship_relevance[]` - Replace loser ID with winner, dedupe

### Self-Referential
- `contact_relationships` - Update both `from_contact_id` and `to_contact_id`, delete self-loops

### Graph Updates
- `tb_nodes` - Update `source_id` and `props.contact_id` where applicable

## Query Strategy

**ALWAYS scope by `user_id` (UUID)**
- Never merge contacts across different users
- All FK updates must maintain `user_id` consistency

