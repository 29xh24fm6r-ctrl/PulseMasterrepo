/**
 * Speaker Resolution to CRM Contacts
 * lib/pulse-live/speaker-resolution.ts
 */

import { supabaseServer } from "@/lib/supabase/server";
import { resolveIdentity } from "@/lib/organism";

export interface SpeakerResolution {
  speaker_key: string;
  contact_id?: string;
  confidence: number;
  method: "calendar" | "email" | "domain" | "name" | "unknown";
}

/**
 * Resolve speakers to CRM contacts
 */
export async function resolveSpeakers(
  userId: string,
  speakerMap: Record<string, { name?: string; email?: string }>,
  participantEmails: string[] = [],
  calendarEventId?: string
): Promise<Record<string, SpeakerResolution>> {
  const supabase = supabaseServer();
  const resolutions: Record<string, SpeakerResolution> = {};

  // Method 1: Calendar attendees
  if (calendarEventId) {
    const { data: event } = await supabase
      .from("calendar_events_cache")
      .select("attendees")
      .eq("owner_user_id", userId)
      .eq("id", calendarEventId)
      .single();

    if (event?.attendees) {
      const attendees = Array.isArray(event.attendees) ? event.attendees : [];
      for (const [speakerKey, speakerData] of Object.entries(speakerMap)) {
        for (const attendee of attendees) {
          const attendeeEmail = typeof attendee === "string" ? attendee : attendee.email;
          if (attendeeEmail && speakerData.email === attendeeEmail) {
            const contact = await resolveIdentity(userId, {
              email: attendeeEmail,
            });
            if (contact.contact_id) {
              resolutions[speakerKey] = {
                speaker_key: speakerKey,
                contact_id: contact.contact_id,
                confidence: 0.9,
                method: "calendar",
              };
              break;
            }
          }
        }
      }
    }
  }

  // Method 2: Direct email match
  for (const [speakerKey, speakerData] of Object.entries(speakerMap)) {
    if (resolutions[speakerKey]) continue; // Already resolved

    if (speakerData.email) {
      const contact = await resolveIdentity(userId, {
        email: speakerData.email,
      });
      if (contact.contact_id) {
        resolutions[speakerKey] = {
          speaker_key: speakerKey,
          contact_id: contact.contact_id,
          confidence: 0.85,
          method: "email",
        };
        continue;
      }
    }

    // Method 3: Domain + name similarity
    if (speakerData.email && speakerData.name) {
      const domain = speakerData.email.split("@")[1];
      const { data: org } = await supabase
        .from("crm_organizations")
        .select("id")
        .eq("owner_user_id", userId)
        .eq("domain", domain)
        .maybeSingle();

      if (org) {
        const { data: contacts } = await supabase
          .from("crm_contacts")
          .select("id, full_name")
          .eq("owner_user_id", userId)
          .eq("organization_id", org.id)
          .ilike("full_name", `%${speakerData.name.split(" ")[0]}%`)
          .limit(1);

        if (contacts && contacts.length > 0) {
          resolutions[speakerKey] = {
            speaker_key: speakerKey,
            contact_id: contacts[0].id,
            confidence: 0.7,
            method: "domain",
          };
        }
      }
    }

    // Method 4: Name-only match (lower confidence)
    if (speakerData.name && !resolutions[speakerKey]) {
      const { data: contacts } = await supabase
        .from("crm_contacts")
        .select("id, full_name")
        .eq("owner_user_id", userId)
        .ilike("full_name", `%${speakerData.name}%`)
        .limit(1);

      if (contacts && contacts.length > 0) {
        resolutions[speakerKey] = {
          speaker_key: speakerKey,
          contact_id: contacts[0].id,
          confidence: 0.5,
          method: "name",
        };
      }
    }

    // Default: unknown
    if (!resolutions[speakerKey]) {
      resolutions[speakerKey] = {
        speaker_key: speakerKey,
        confidence: 0,
        method: "unknown",
      };
    }
  }

  return resolutions;
}

