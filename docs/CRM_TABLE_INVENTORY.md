# CRM Table Inventory - Ground Truth

## ✅ Tables Currently Used in Codebase

Based on codebase search for `.from("` patterns:

### Core Contact Tables
- `crm_contacts` - Main contacts/people table
- `contact_tags` - User-defined tags
- `contact_tag_links` - Many-to-many contact-tag links
- `contact_relationships` - Relationship graph
- `contact_facts` - Structured facts with provenance
- `contact_dates` - Important dates (birthdays, anniversaries)
- `gift_ideas` - Gift tracking
- `contact_emails` - Multiple emails (optional)
- `contact_phones` - Multiple phones (optional)

### Deal Tables
- `crm_deals` - Deals/opportunities
  - **Link to contacts**: `primary_contact_id` → `crm_contacts(id)`
- `crm_deal_contacts` - Many-to-many deal-contacts (if exists)
- `crm_deal_health` - Deal health scores

### Task Tables
- `quantum_tasks` - Tasks system
  - **Link to contacts**: `relationship_relevance` (text[]) contains contact IDs
- `crm_tasks` - Alternative tasks table (less used)

### Interaction/Note Tables
- `crm_interactions` - Interactions, notes, calls, emails, meetings
  - **Link to contacts**: `contact_id` → `crm_contacts(id)`
  - **Filter for notes**: `type = 'note'`
- `interaction_events` - Unified timeline events
  - **Link to contacts**: `contact_id` (optional)

### Health Tables
- `crm_relationship_health` - Relationship health scores
  - **Link to contacts**: `contact_id` → `crm_contacts(id)`

### Intel Tables
- `crm_contact_identity` - Identity anchors
- `crm_contact_intel_sources` - Intel URLs/pages
- `crm_contact_intel_claims` - Evidence-based facts
- `crm_intel_runs` - Intel run audit

### News Tables
- `contact_news_preferences` - News preferences per contact
- `news_sources`, `news_articles_cache`, `news_recommendations`, `news_email_drafts`

### Merge/Dedup Tables
- `crm_contact_merges` - Merge audit log
- `crm_contact_duplicate_suggestions` - Duplicate suggestions

### Organization Tables
- `crm_organizations` - Organizations/companies

### Other CRM Tables
- `crm_alerts` - CRM alerts

## Query Patterns for PersonDetail

### Deals
```sql
SELECT * FROM crm_deals 
WHERE user_id = $dbUserId 
  AND primary_contact_id = $personId
  AND status != 'merged'  -- if status column exists
ORDER BY updated_at DESC
```

### Tasks
```sql
SELECT * FROM quantum_tasks 
WHERE user_id = $dbUserId 
  AND $personId = ANY(relationship_relevance)
  AND status IN ('pending', 'in_progress')
ORDER BY current_day ASC, priority DESC
```

### Notes (from interactions)
```sql
SELECT * FROM crm_interactions 
WHERE user_id = $dbUserId 
  AND contact_id = $personId
  AND type = 'note'
ORDER BY occurred_at DESC
LIMIT 20
```

### Relationship Health
```sql
SELECT * FROM crm_relationship_health 
WHERE user_id = $dbUserId 
  AND contact_id = $personId
LIMIT 1
```

