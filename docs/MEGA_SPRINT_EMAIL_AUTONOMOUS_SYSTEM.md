# 🔥 MEGA SPRINT: Email Autonomous System

## Overview

This sprint transforms Pulse into a **self-healing email operator** with three integrated phases:

1. **Failed Email Auto-Fix + Re-Draft**
2. **Inbound Email Triage AI**
3. **SLA Escalation Engine**

---

## Phase 1: Failed Email Auto-Fix

### Files Created

- `supabase/migrations/20251221_email_outbox_auto_fix.sql` - Adds failure tracking columns
- `lib/email/failureClassifier.ts` - Classifies send failures
- `lib/email/autoFix.ts` - Suggests email address fixes
- `app/api/email/outbox/resend-fixed/route.ts` - Resend with fixed address API

### Files Modified

- `lib/email/outboxWorker.ts` - Integrates failure classification and auto-fix
- `app/api/email/outbox/stats/route.ts` - Includes auto-fix data in stats
- `app/email/inbox/_components/OutboxHealthCard.tsx` - Shows "Resend Fixed" button

### How It Works

1. When an email fails to send, the outbox worker classifies the failure
2. If fixable (invalid domain/address), suggests corrected email
3. Stores fix suggestion in `auto_fix_payload`
4. UI shows "Resend with [fixed address]" button
5. Clicking resends with corrected address and new checksum

---

## Phase 2: Inbound Email Triage AI

### Files Created

- `supabase/migrations/20251221_email_events_triage.sql` - Canonical email events table
- `lib/email/triageAI.ts` - Triage engine (deterministic + extensible)
- `app/api/email/triage/inbound/route.ts` - Inbound email triage webhook

### How It Works

1. Inbound email triggers `/api/email/triage/inbound`
2. Triage engine classifies: `needs_reply`, `request`, `task`, `waiting_on_them`, `fyi`
3. Stores event in `email_events` with triage result
4. Auto-actions:
   - `draft_reply` → Creates draft via Smart Follow-Up
   - `create_task` → Creates task (if tasks table exists)
   - `needs_reply` → Creates reminder

### Triage Logic

- **Questions** (`?`) → `needs_reply` (85% confidence)
- **Requests** (`please`, `can you`) → `request` (80% confidence)
- **Action verbs** → `task` (70% confidence)
- **Waiting indicators** → `waiting_on_them` (75% confidence)
- **Default** → `fyi` (60% confidence)

---

## Phase 3: SLA Escalation Engine

### Files Created

- `supabase/migrations/20251221_email_sla_rules.sql` - SLA rules table
- `app/api/email/sla/tick/route.ts` - SLA tick worker

### How It Works

1. SLA rules define escalation thresholds (warn_after, urgent_after)
2. Tick worker runs periodically (via cron or manual trigger)
3. Finds events past thresholds with no reply
4. Creates reminders:
   - **Warn** → Normal priority reminder
   - **Urgent** → Urgent priority reminder + optional auto follow-up
5. Auto follow-up uses Smart Follow-Up generator

### Default SLA Rule

- **Label**: "Reply SLA"
- **Applies to**: `needs_reply`
- **Warn after**: 4 hours
- **Urgent after**: 24 hours
- **Auto follow-up**: Enabled

---

## Integration Points

### Event Flow

```
Send Email
  ↓
Fails → Classify → Suggest Fix → Store in outbox
  ↓
User clicks "Resend Fixed" → Clone with fixed address

Inbound Email
  ↓
Triage → Classify → Store event
  ↓
Auto-action (draft/task/reminder)
  ↓
SLA Tick (periodic)
  ↓
Check thresholds → Escalate → Auto follow-up
```

### Shared Primitives

- `email_outbox` = Source of truth for outbound
- `email_events` = Source of truth for inbound + lifecycle
- `reminder_subscriptions` = Escalation + surfacing (if exists)
- `buildSmartFollowUp()` = Reused for auto-drafts
- Safe Mode checksums = All actions are checksummed

---

## API Routes

### `/api/email/outbox/resend-fixed` (POST)
- Resends failed email with auto-fixed address
- Requires: `outbox_id`
- Returns: New outbox row ID

### `/api/email/triage/inbound` (POST)
- Triage incoming email
- Requires: `message_id`, `from_email`, `to_email`, `subject`, `snippet`
- Returns: Triage result + auto-actions taken

### `/api/email/sla/tick` (POST)
- Run SLA escalation check
- Requires: `x-sla-tick-secret` header (if `EMAIL_SLA_TICK_SECRET` set)
- Returns: Processed events + actions taken

---

## Database Schema

### `email_outbox` (new columns)
- `failure_code` - Classification code
- `auto_fix_suggested` - Boolean flag
- `auto_fix_payload` - JSONB with fix suggestion

### `email_events` (new table)
- Canonical event log for all email activity
- Tracks triage labels, confidence, payloads
- Indexed for SLA queries

### `email_sla_rules` (new table)
- Defines escalation thresholds
- Applies to specific triage labels
- Configurable auto follow-up

---

## Next Steps

1. **Run migrations** in order:
   - `20251221_email_outbox_auto_fix.sql`
   - `20251221_email_events_triage.sql`
   - `20251221_email_sla_rules.sql`

2. **Set environment variable** (optional):
   - `EMAIL_SLA_TICK_SECRET` - For protecting SLA tick route

3. **Wire up inbound webhook**:
   - Point your email provider webhook to `/api/email/triage/inbound`
   - Or call it from your email sync/poll logic

4. **Schedule SLA tick**:
   - Add to Vercel cron: `*/15 * * * *` (every 15 minutes)
   - Or call manually for testing

5. **Test flow**:
   - Send email with typo → Should suggest fix
   - Receive email → Should triage and create draft/task
   - Wait past SLA → Should escalate and auto follow-up

---

## Safety & Compliance

- ✅ All auto-drafts use Safe Mode checksums
- ✅ All actions are idempotent
- ✅ All failures are classified and tracked
- ✅ No silent drops - everything escalates
- ✅ Deterministic fallbacks (no AI required)

---

**Status**: ✅ Complete and ready for deployment

