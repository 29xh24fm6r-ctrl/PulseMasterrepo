/**
 * Calendar Integration with Organism Layer
 * Wires calendar sync to use unified organism services
 * lib/organism/calendar-integration.ts
 */

import { resolveIdentity, logInteraction } from "./index";

/**
 * Process a calendar event and log it as an interaction
 * Call this after syncing calendar events from Google/Outlook
 */
export async function processCalendarEventAsInteraction(
  userId: string,
  event: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    organizer?: {
      email: string;
      name?: string;
    };
    attendees?: Array<{
      email: string;
      name?: string;
    }>;
    eventId?: string;
    htmlLink?: string;
    status?: string;
  }
): Promise<{
  organizer_contact_id: string | null;
  attendee_contact_ids: string[];
  interaction_id: string;
}> {
  const contactIds: string[] = [];
  let organizerContactId: string | null = null;

  // Step 1: Resolve organizer identity
  if (event.organizer?.email) {
    const orgResolution = await resolveIdentity(userId, {
      email: event.organizer.email,
      name: event.organizer.name,
    });
    organizerContactId = orgResolution.contact_id;
    if (orgResolution.contact_id) {
      contactIds.push(orgResolution.contact_id);
    }
  }

  // Step 2: Resolve attendee identities
  if (event.attendees && event.attendees.length > 0) {
    for (const attendee of event.attendees) {
      if (attendee.email && attendee.email !== event.organizer?.email) {
        const attendeeResolution = await resolveIdentity(userId, {
          email: attendee.email,
          name: attendee.name,
        });
        if (attendeeResolution.contact_id && !contactIds.includes(attendeeResolution.contact_id)) {
          contactIds.push(attendeeResolution.contact_id);
        }
      }
    }
  }

  // Step 3: Create summary
  const summary = [
    event.title,
    event.description,
    event.location ? `Location: ${event.location}` : "",
    event.attendees && event.attendees.length > 0
      ? `Attendees: ${event.attendees.map((a) => a.name || a.email).join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // Step 4: Log interaction (primary contact is organizer, or first attendee)
  const primaryContactId = organizerContactId || contactIds[0] || undefined;

  const interactionResult = await logInteraction(userId, {
    type: "meeting",
    contact_id: primaryContactId,
    occurred_at: event.startTime,
    subject: event.title,
    summary: summary.substring(0, 1000),
    channel: "calendar",
    metadata: {
      eventId: event.eventId,
      htmlLink: event.htmlLink,
      status: event.status,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      organizer: event.organizer,
      attendees: event.attendees,
      attendee_count: event.attendees?.length || 0,
      source_type: "calendar",
      source_id: event.eventId,
    },
  });

  return {
    organizer_contact_id: organizerContactId,
    attendee_contact_ids: contactIds,
    interaction_id: interactionResult.interaction_id,
  };
}

/**
 * Process multiple calendar events in batch
 */
export async function processCalendarEventsAsInteractions(
  userId: string,
  events: Array<{
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    organizer?: { email: string; name?: string };
    attendees?: Array<{ email: string; name?: string }>;
    eventId?: string;
    htmlLink?: string;
    status?: string;
  }>
): Promise<{
  processed: number;
  contacts_created: number;
  interactions_created: number;
  errors: Array<{ event: string; error: string }>;
}> {
  let processed = 0;
  let contactsCreated = 0;
  let interactionsCreated = 0;
  const errors: Array<{ event: string; error: string }> = [];
  const createdContactIds = new Set<string>();

  for (const event of events) {
    try {
      const result = await processCalendarEventAsInteraction(userId, event);
      processed++;
      interactionsCreated++;

      // Track contacts created (don't double count)
      if (result.organizer_contact_id && !createdContactIds.has(result.organizer_contact_id)) {
        contactsCreated++;
        createdContactIds.add(result.organizer_contact_id);
      }
      result.attendee_contact_ids.forEach((id) => {
        if (!createdContactIds.has(id)) {
          contactsCreated++;
          createdContactIds.add(id);
        }
      });
    } catch (error: any) {
      errors.push({
        event: event.title,
        error: error.message || "Unknown error",
      });
    }
  }

  return {
    processed,
    contacts_created: contactsCreated,
    interactions_created: interactionsCreated,
    errors,
  };
}

