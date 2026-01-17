/**
 * Google Calendar Client v1
 * lib/calendar/googleClient.ts
 */

import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

// ============================================
// TYPES
// ============================================

export interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  status?: "confirmed" | "tentative" | "cancelled";
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
    self?: boolean;
  }>;
  organizer?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
  recurrence?: string[];
  htmlLink?: string;
}

export interface CalendarEvent {
  id: string;
  externalId: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  status: string;
  attendees: any[];
  organizer?: any;
  htmlLink?: string;
}

export interface CalendarAccount {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  calendarId: string;
  syncEnabled: boolean;
  lastSyncedAt?: Date;
}

// ============================================
// CONFIGURATION
// ============================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI || "";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

// ============================================
// OAUTH HELPERS
// ============================================

export function getGoogleAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    ...(state && { state }),
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  idToken?: string;
} | null> {
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[GoogleCalendar] Token exchange failed:", error);
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      idToken: data.id_token,
    };
  } catch (error) {
    console.error("[GoogleCalendar] Token exchange error:", error);
    return null;
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
} | null> {
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[GoogleCalendar] Token refresh failed:", error);
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error("[GoogleCalendar] Token refresh error:", error);
    return null;
  }
}

export function decodeIdToken(idToken: string): { sub: string; email: string } | null {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
    return { sub: payload.sub, email: payload.email };
  } catch (error) {
    console.error("[GoogleCalendar] ID token decode error:", error);
    return null;
  }
}

// ============================================
// ACCOUNT MANAGEMENT
// ============================================

export async function getCalendarAccount(userId: string): Promise<CalendarAccount | null> {
  const { data, error } = await getSupabaseAdminRuntimeClient()
    .from("calendar_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    provider: data.provider,
    providerAccountId: data.provider_account_id,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiresAt: data.token_expires_at ? new Date(data.token_expires_at) : undefined,
    calendarId: data.calendar_id,
    syncEnabled: data.sync_enabled,
    lastSyncedAt: data.last_synced_at ? new Date(data.last_synced_at) : undefined,
  };
}

export async function saveCalendarAccount(
  userId: string,
  data: {
    providerAccountId: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  }
): Promise<boolean> {
  const tokenExpiresAt = new Date(Date.now() + data.expiresIn * 1000);

  const { error } = await getSupabaseAdminRuntimeClient()
    .from("calendar_accounts")
    .upsert(
      {
        user_id: userId,
        provider: "google",
        provider_account_id: data.providerAccountId,
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        calendar_id: "primary",
        sync_enabled: true,
      },
      { onConflict: "user_id,provider" }
    );

  return !error;
}

export async function disconnectCalendar(userId: string): Promise<boolean> {
  await getSupabaseAdminRuntimeClient()
    .from("calendar_events_cache")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "google");

  const { error } = await getSupabaseAdminRuntimeClient()
    .from("calendar_accounts")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "google");

  return !error;
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const account = await getCalendarAccount(userId);
  if (!account) return null;

  const now = new Date();
  const expiresAt = account.tokenExpiresAt;
  
  if (expiresAt && expiresAt.getTime() - 300000 > now.getTime()) {
    return account.accessToken;
  }

  if (!account.refreshToken) {
    console.error("[GoogleCalendar] No refresh token available");
    return null;
  }

  const refreshed = await refreshAccessToken(account.refreshToken);
  if (!refreshed) return null;

  const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
  
  await getSupabaseAdminRuntimeClient()
    .from("calendar_accounts")
    .update({
      access_token: refreshed.accessToken,
      token_expires_at: newExpiresAt.toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "google");

  return refreshed.accessToken;
}

// ============================================
// CALENDAR API
// ============================================

export async function fetchGoogleEvents(
  userId: string,
  options?: {
    timeMin?: Date;
    timeMax?: Date;
    maxResults?: number;
    calendarId?: string;
  }
): Promise<GoogleEvent[]> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return [];

  const calendarId = options?.calendarId || "primary";
  const timeMin = options?.timeMin || new Date();
  const timeMax = options?.timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const maxResults = options?.maxResults || 50;

  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults: maxResults.toString(),
    singleEvents: "true",
    orderBy: "startTime",
  });

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      console.error("[GoogleCalendar] Fetch events failed:", await response.text());
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("[GoogleCalendar] Fetch events error:", error);
    return [];
  }
}

export function normalizeGoogleEvent(event: GoogleEvent): CalendarEvent {
  const startTime = event.start.dateTime
    ? new Date(event.start.dateTime)
    : new Date(event.start.date + "T00:00:00");
  
  const endTime = event.end.dateTime
    ? new Date(event.end.dateTime)
    : new Date(event.end.date + "T23:59:59");

  return {
    id: event.id,
    externalId: event.id,
    title: event.summary || "(No title)",
    description: event.description,
    location: event.location,
    startTime,
    endTime,
    allDay: !event.start.dateTime,
    status: event.status || "confirmed",
    attendees: event.attendees || [],
    organizer: event.organizer,
    htmlLink: event.htmlLink,
  };
}

// ============================================
// SYNC & CACHE
// ============================================

export async function syncCalendarEvents(
  userId: string,
  options?: { timeMin?: Date; timeMax?: Date }
): Promise<{ synced: number; errors: number }> {
  const events = await fetchGoogleEvents(userId, options);
  
  let synced = 0;
  let errors = 0;

  for (const event of events) {
    const normalized = normalizeGoogleEvent(event);

    const { error } = await getSupabaseAdminRuntimeClient()
      .from("calendar_events_cache")
      .upsert(
        {
          user_id: userId,
          provider: "google",
          external_id: normalized.externalId,
          calendar_id: "primary",
          title: normalized.title,
          description: normalized.description,
          location: normalized.location,
          start_time: normalized.startTime.toISOString(),
          end_time: normalized.endTime.toISOString(),
          all_day: normalized.allDay,
          status: normalized.status,
          attendees: normalized.attendees,
          organizer: normalized.organizer,
          html_link: normalized.htmlLink,
        },
        { onConflict: "user_id,provider,external_id" }
      );

    if (error) errors++;
    else synced++;
  }

  await getSupabaseAdminRuntimeClient()
    .from("calendar_accounts")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", "google");

  return { synced, errors };
}

export async function getCachedEvents(
  userId: string,
  options?: { startDate?: Date; endDate?: Date; limit?: number }
): Promise<CalendarEvent[]> {
  const startDate = options?.startDate || new Date();
  const endDate = options?.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const limit = options?.limit || 50;

  const { data, error } = await getSupabaseAdminRuntimeClient()
    .from("calendar_events_cache")
    .select("*")
    .eq("user_id", userId)
    .gte("start_time", startDate.toISOString())
    .lte("start_time", endDate.toISOString())
    .neq("status", "cancelled")
    .order("start_time", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    externalId: row.external_id,
    title: row.title || "(No title)",
    description: row.description,
    location: row.location,
    startTime: new Date(row.start_time),
    endTime: new Date(row.end_time),
    allDay: row.all_day,
    status: row.status,
    attendees: row.attendees || [],
    organizer: row.organizer,
    htmlLink: row.html_link,
  }));
}

export async function getTodaysEvents(userId: string): Promise<CalendarEvent[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  return getCachedEvents(userId, { startDate: startOfDay, endDate: endOfDay });
}

export async function hasCalendarConnected(userId: string): Promise<boolean> {
  const account = await getCalendarAccount(userId);
  return account !== null && account.syncEnabled;
}

export async function getBusyTimes(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ start: Date; end: Date; title: string }>> {
  const events = await getCachedEvents(userId, { startDate, endDate });
  return events
    .filter((e) => !e.allDay && e.status === "confirmed")
    .map((e) => ({ start: e.startTime, end: e.endTime, title: e.title }));
}
