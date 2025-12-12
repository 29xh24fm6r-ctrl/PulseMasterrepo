# Integration Guide: Email & Calendar with Organism Layer

## Overview

The organism layer provides integration functions to wire existing email/calendar sync code to use the unified organism services. This ensures all data flows through the canonical entity model with zero duplication.

## Email Integration

### Using the Email Integration Helper

```typescript
import { processEmailAsInteraction, processEmailsAsInteractions } from "@/lib/organism/email-integration";

// Single email
const result = await processEmailAsInteraction(userId, {
  from: "john@example.com",
  fromName: "John Doe",
  fromEmail: "john@example.com",
  subject: "Meeting follow-up",
  body: "Let's schedule a call...",
  date: "2024-01-01T12:00:00Z",
  threadId: "thread-123",
  messageId: "msg-456",
  isIncoming: true,
});

// Batch processing
const results = await processEmailsAsInteractions(userId, emails);
```

### Updating Email Sync Code

In `lib/email/sync.ts`, after syncing messages, call the organism layer:

```typescript
import { processEmailAsInteraction } from "@/lib/organism/email-integration";

// After syncing email thread
for (const message of messages) {
  await processEmailAsInteraction(userId, {
    from: message.from_address,
    fromName: extractName(message.from_address),
    fromEmail: extractEmail(message.from_address),
    subject: message.subject,
    body: message.body || message.snippet,
    date: message.sent_at,
    threadId: message.thread_id,
    messageId: message.id,
    isIncoming: message.is_incoming,
  });
}
```

## Calendar Integration

### Using the Calendar Integration Helper

```typescript
import { processCalendarEventAsInteraction, processCalendarEventsAsInteractions } from "@/lib/organism/calendar-integration";

// Single event
const result = await processCalendarEventAsInteraction(userId, {
  title: "Team Meeting",
  description: "Weekly standup",
  startTime: "2024-01-01T10:00:00Z",
  endTime: "2024-01-01T11:00:00Z",
  location: "Conference Room A",
  organizer: {
    email: "alice@example.com",
    name: "Alice Smith",
  },
  attendees: [
    { email: "bob@example.com", name: "Bob Jones" },
  ],
  eventId: "event-123",
  htmlLink: "https://calendar.google.com/event?eid=...",
  status: "confirmed",
});

// Batch processing
const results = await processCalendarEventsAsInteractions(userId, events);
```

### Updating Calendar Sync Code

In `lib/calendar/googleClient.ts`, update `syncCalendarEvents`:

```typescript
import { processCalendarEventAsInteraction } from "@/lib/organism/calendar-integration";

export async function syncCalendarEvents(userId: string, options?: {...}) {
  const events = await fetchGoogleEvents(userId, options);
  
  // Process through organism layer
  for (const event of events) {
    const normalized = normalizeGoogleEvent(event);
    
    await processCalendarEventAsInteraction(userId, {
      title: normalized.title,
      description: normalized.description,
      startTime: normalized.startTime.toISOString(),
      endTime: normalized.endTime.toISOString(),
      location: normalized.location,
      organizer: normalized.organizer,
      attendees: normalized.attendees,
      eventId: normalized.externalId,
      htmlLink: normalized.htmlLink,
      status: normalized.status,
    });
  }
  
  // Still update cache table for quick access
  // ... existing cache logic ...
}
```

## Benefits

1. **Zero Duplication**: All contacts created through email/calendar sync are deduplicated
2. **Unified Timeline**: All interactions appear in `crm_interactions`
3. **Second Brain Indexing**: Interactions automatically create memory fragments
4. **Entity Linking**: All entities linked via `tb_node_id` to Second Brain

## Migration Steps

1. **Update Email Sync**:
   - Find where emails are synced to `email_messages` table
   - Add call to `processEmailAsInteraction()` after each message sync
   - Keep existing cache tables for backward compatibility

2. **Update Calendar Sync**:
   - Find where events are synced to `calendar_events_cache` table
   - Add call to `processCalendarEventAsInteraction()` after each event sync
   - Keep existing cache tables for quick access

3. **Test**:
   - Sync emails/calendar events
   - Verify contacts created in `crm_contacts` (not duplicated)
   - Verify interactions in `crm_interactions`
   - Verify memory fragments in `tb_memory_fragments`

## Example: Complete Email Sync Integration

```typescript
// lib/email/sync.ts (updated)

import { processEmailAsInteraction } from "@/lib/organism/email-integration";

export async function syncEmailThreads(userId: string, options?: {...}) {
  // ... existing Gmail fetch logic ...

  for (const thread of threads) {
    // ... existing thread processing ...

    // NEW: Process through organism layer
    const lastMessage = messages[messages.length - 1];
    
    await processEmailAsInteraction(userId, {
      from: from,
      fromName: extractName(from),
      fromEmail: extractEmail(from),
      subject: subject,
      body: body || snippet,
      date: dateStr || new Date().toISOString(),
      threadId: thread.id,
      messageId: lastMessage.id,
      isIncoming: !labels.includes("SENT"),
    });

    // Keep existing cache upsert for backward compatibility
    // ... existing cache logic ...
  }
}
```

## Notes

- The integration functions handle identity resolution automatically
- Duplicate contacts are prevented by email/phone matching
- All interactions are logged with proper metadata
- Second Brain fragments are created automatically
- Existing cache tables can remain for performance (read-only)

