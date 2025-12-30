import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { google } from "googleapis";
import OpenAI from "openai";
import { refreshAccessToken } from "@/app/lib/gmail-utils";
import { supabaseAdmin } from "@/lib/supabase";

// Increase timeout for this route
export const maxDuration = 120; // 2 minutes
export const dynamic = 'force-dynamic';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ============================================
// BLOCKED DOMAINS (Preserved)
// ============================================
const BLOCKED_DOMAINS = new Set([
  // Marketing platforms
  "mailchimp.com", "sendgrid.net", "sendgrid.com", "constantcontact.com",
  "mailgun.com", "amazonses.com", "postmarkapp.com", "hubspot.com",
  "klaviyo.com", "braze.com", "marketo.com", "pardot.com",
  "mailerlite.com", "convertkit.com", "getresponse.com", "aweber.com",
  // Social media
  "facebookmail.com", "facebook.com", "twitter.com", "x.com",
  "linkedin.com", "instagram.com", "tiktok.com", "pinterest.com",
  // E-commerce
  "amazon.com", "ebay.com", "shopify.com", "etsy.com", "walmart.com",
  // Financial
  "usaa.com", "chase.com", "bankofamerica.com", "wellsfargo.com",
  "capitalone.com", "americanexpress.com", "discover.com", "citi.com",
  "paypal.com", "venmo.com", "cashapp.com", "stripe.com",
  // Tech giants
  "google.com", "youtube.com", "apple.com", "microsoft.com",
  "github.com", "gitlab.com", "atlassian.com", "slack.com",
  "zoom.us", "zoom.com", "dropbox.com", "adobe.com",
  // Others
  "netflix.com", "spotify.com", "hulu.com", "disneyplus.com",
  "verizon.com", "att.com", "tmobile.com", "xfinity.com", "comcast.com",
  "doordash.com", "ubereats.com", "grubhub.com", "instacart.com",
  "dominos.com", "starbucks.com",
  // Travel
  "airbnb.com", "booking.com", "expedia.com", "southwest.com",
  "united.com", "delta.com", "aa.com",
  // Newsletters
  "substack.com", "beehiiv.com", "morningbrew.com", "theskim.com",
  // Design tools
  "canva.com", "figma.com",
]);

const BLOCKED_EMAIL_PATTERNS = [
  /^no[-_]?reply@/i, /^noreply@/i, /^do[-_]?not[-_]?reply@/i,
  /^notification[s]?@/i, /^alert[s]?@/i, /^update[s]?@/i,
  /^newsletter@/i, /^news@/i, /^info@/i, /^support@/i,
  /^billing@/i, /^invoice@/i, /^receipt@/i, /^order@/i,
  /^shipping@/i, /^tracking@/i, /^confirm@/i, /^verify@/i,
  /^security@/i, /^account@/i, /^team@/i, /^hello@/i,
  /^marketing@/i, /^promo@/i, /^deals@/i, /^offers@/i,
  /^statement@/i, /^documents@/i, /^edelivery@/i,
];

const BULK_EMAIL_KEYWORDS = [
  "unsubscribe", "view in browser", "email preferences",
  "manage your subscription", "opt out", "privacy policy",
  "view online", "trouble viewing", "add us to your address book",
  "statement is ready", "statement available", "view your statement",
  "your bill is ready", "payment received", "payment confirmation",
  "order confirmation", "shipping confirmation", "delivery update",
  "track your order", "track your package", "sign in to view",
  "log in to view", "verify your email", "verify your account",
  "security alert", "unusual activity", "password reset",
];

function isBlockedEmail(email: string, name: string): boolean {
  const emailLower = email.toLowerCase();
  const nameLower = name.toLowerCase();

  for (const pattern of BLOCKED_EMAIL_PATTERNS) {
    if (pattern.test(emailLower)) return true;
  }

  const domain = emailLower.split("@")[1];
  if (domain && BLOCKED_DOMAINS.has(domain)) return true;

  if (domain) {
    const parts = domain.split(".");
    if (parts.length > 2) {
      const rootDomain = parts.slice(-2).join(".");
      if (BLOCKED_DOMAINS.has(rootDomain)) return true;
    }
  }
  return false;
}

function isBulkEmailByContent(subject: string, body: string): boolean {
  const combined = (subject + " " + body).toLowerCase();
  let matches = 0;
  for (const keyword of BULK_EMAIL_KEYWORDS) {
    if (combined.includes(keyword.toLowerCase())) matches++;
  }
  if (matches >= 2) return true;
  return false;
}

function parseFromField(from: string): { name: string; email: string } {
  const match = from.match(/^(?:"?([^"]*)"?\s*)?<?([^>]+@[^>]+)>?$/);
  if (match) {
    const [, name, email] = match;
    if (name && name.trim()) {
      return { name: name.trim(), email: email.toLowerCase() };
    }
    return { name: email.split("@")[0], email: email.toLowerCase() };
  }
  return { name: from, email: from.toLowerCase() };
}

function parseEmail(email: string): { company: string } {
  const domain = email.split("@")[1] || "";
  const company = domain.split(".")[0];
  return { company: company.charAt(0).toUpperCase() + company.slice(1) };
}

function extractEmailBody(payload: any): string {
  let body = "";
  if (payload.body?.data) {
    body = Buffer.from(payload.body.data, "base64").toString("utf-8");
  } else if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        body = Buffer.from(part.body.data, "base64").toString("utf-8");
        break;
      }
      if (part.parts) {
        for (const subPart of part.parts) {
          if (subPart.mimeType === "text/plain" && subPart.body?.data) {
            body = Buffer.from(subPart.body.data, "base64").toString("utf-8");
            break;
          }
        }
      }
    }
  }
  body = body.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return body.length > 3000 ? body.substring(0, 3000) + "..." : body;
}

// ============================================
// Duplicate Detection
// ============================================

type ExistingContact = { id: string; name: string; email: string | null; emails: string[] };

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function stringSimilarity(s1: string, s2: string): number {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  if (s1 === s2) return 1;
  if (!s1.length || !s2.length) return 0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  return 0.5; // Simplified for speed
}

function findDuplicates(
  newContacts: Array<{ name: string; email: string }>,
  existingContacts: ExistingContact[]
): Map<string, { matches: Array<{ name: string; email: string; confidence: number; reason: string; existingId?: string }> }> {
  const duplicates = new Map<string, { matches: any[] }>();

  for (const newContact of newContacts) {
    const matches: any[] = [];
    const newName = normalizeName(newContact.name);

    for (const existing of existingContacts) {
      const existingName = normalizeName(existing.name);
      // Check email match first (exact)
      if (existing.emails.includes(newContact.email)) {
        matches.push({
          name: existing.name,
          email: newContact.email,
          confidence: 1.0,
          reason: "Exact email match",
          existingId: existing.id
        });
        continue;
      }

      // Name similarity
      const nameSim = stringSimilarity(newName, existingName);
      if (nameSim > 0.8) {
        matches.push({
          name: existing.name,
          email: existing.email || existing.emails[0] || "No email",
          confidence: nameSim,
          reason: "Similar name",
          existingId: existing.id,
        });
      }
    }

    if (matches.length > 0) {
      duplicates.set(newContact.email, { matches });
    }
  }

  return duplicates;
}

function safeParseJSON(text: string): any {
  if (!text) return { emails: [] };
  let cleaned = text.trim();
  // Strip code blocks
  cleaned = cleaned.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("JSON parse error:", err);
    return { emails: [] };
  }
}

async function classifyAndExtractActions(
  emails: Array<{ id: string; from: string; fromName: string; fromEmail: string; subject: string; body: string; date: string }>
): Promise<{
  contacts: Array<{ name: string; email: string; company: string; subject: string; classification: string; confidence: number; reason: string }>;
  actions: Array<{ type: string; priority: string; description: string; dueDate: string | null; context: string; fromName: string; fromEmail: string; subject: string; messageId: string; confidence: number }>;
}> {
  if (emails.length === 0) return { contacts: [], actions: [] };

  const allContacts: any[] = [];
  const allActions: any[] = [];
  const batchSize = 10;

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);

    const prompt = `You are an expert email analyst.
    
ANALYZE THESE EMAILS:
${batch.map((e, idx) => `
--- EMAIL ${idx + 1} ---
From: ${e.from}
Subject: ${e.subject}
Date: ${e.date}
Body:
${e.body.substring(0, 600)}
--- END ---`).join("\n")}

RESPOND WITH JSON:
{
  "emails": [
    {
      "index": 1,
      "contact": {
        "classification": "real_person" | "marketing" | "automated" | "uncertain",
        "confidence": 0.0-1.0,
        "reason": "Brief reason"
      },
      "actions": [
        {
          "type": "task" | "follow_up" | "commitment" | "waiting_on",
          "priority": "high" | "medium" | "low",
          "description": "What needs to be done",
          "dueDate": "YYYY-MM-DD" or null,
          "context": "Brief context",
          "confidence": 0.0-1.0
        }
      ]
    }
  ]
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const responseText = completion.choices[0].message.content || "";
      const result = safeParseJSON(responseText);

      for (const emailResult of result.emails || []) {
        const idx = emailResult.index - 1;
        if (idx < 0 || idx >= batch.length) continue;

        const email = batch[idx];
        const { company } = parseEmail(email.fromEmail);

        if (emailResult.contact) {
          allContacts.push({
            name: email.fromName,
            email: email.fromEmail,
            company,
            subject: email.subject,
            classification: emailResult.contact.classification,
            confidence: emailResult.contact.confidence,
            reason: emailResult.contact.reason,
          });
        }

        for (const action of emailResult.actions || []) {
          allActions.push({
            type: action.type,
            priority: action.priority,
            description: action.description,
            dueDate: action.dueDate,
            context: action.context,
            fromName: email.fromName,
            fromEmail: email.fromEmail,
            subject: email.subject,
            messageId: email.id,
            confidence: action.confidence,
          });
        }
      }
    } catch (err) {
      console.error("AI analysis error for batch:", err);
    }
  }

  return { contacts: allContacts, actions: allActions };
}

// ============================================
// Supabase Data Access
// ============================================

async function getRecentActions(userId: string): Promise<Set<string>> {
  const recentActions = new Set<string>();

  // Get Tasks
  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("title")
    .eq("user_id", userId)
    .not("status", "eq", "done")
    .limit(100);

  (tasks || []).forEach((t: any) => recentActions.add(t.title.toLowerCase().trim()));

  // Get Follow-Ups
  const { data: followUps } = await supabaseAdmin
    .from("follow_ups")
    .select("name")
    .eq("user_id", userId)
    .not("status", "eq", "sent")
    .limit(100);

  (followUps || []).forEach((f: any) => recentActions.add(f.name.toLowerCase().trim()));

  return recentActions;
}

async function getAllExistingContacts(userId: string): Promise<ExistingContact[]> {
  // Fetch up to 2000 contacts for dedupe (pagination if needed, but keeping simple for now)
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("id, name, email")
    .eq("user_id", userId)
    .limit(2000);

  if (error) {
    console.error("Error fetching contacts:", error);
    return [];
  }

  return (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    email: c.email || null,
    emails: c.email ? [c.email.toLowerCase()] : []
  }));
}

// ============================================
// Main API Handler
// ============================================

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { accessToken, refreshToken, maxResults = 50, daysBack = 7 } = body;

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Missing access token" }, { status: 401 });
    }

    // Gmail Setup
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    let gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - daysBack);
    const afterTimestamp = Math.floor(afterDate.getTime() / 1000);

    // List Messages
    let messages: any[] = [];
    try {
      const res = await gmail.users.messages.list({
        userId: "me",
        maxResults,
        q: `in:inbox after:${afterTimestamp}`,
      });
      messages = res.data.messages || [];
    } catch (err: any) {
      // Handle refresh logic if needed, truncated for brevity (assume client refreshes or use similar logic from before)
      if (err.status === 401 && refreshToken) {
        const refreshed = await refreshAccessToken(refreshToken);
        if (refreshed) {
          oauth2Client.setCredentials({ access_token: refreshed.accessToken });
          gmail = google.gmail({ version: "v1", auth: oauth2Client });
          const res = await gmail.users.messages.list({
            userId: "me",
            maxResults,
            q: `in:inbox after:${afterTimestamp}`,
          });
          messages = res.data.messages || [];
        } else {
          return NextResponse.json({ ok: false, error: "Token expired", needsReconnect: true }, { status: 401 });
        }
      } else throw err;
    }

    // Get Data from Supabase
    const [existingContacts, existingActions] = await Promise.all([
      getAllExistingContacts(userId),
      getRecentActions(userId)
    ]);

    const existingEmails = new Set(existingContacts.flatMap((c) => c.emails));

    // Fetch and Filter Emails
    const emails: any[] = [];
    let blockedCount = 0;

    for (const message of messages) {
      if (!message.id) continue;
      try {
        const msgDetail = await gmail.users.messages.get({ userId: "me", id: message.id, format: "full" });
        const headers = msgDetail.data.payload?.headers || [];
        const from = headers.find((h) => h.name === "From")?.value || "";
        const subject = headers.find((h) => h.name === "Subject")?.value || "(No Subject)";
        const date = headers.find((h) => h.name === "Date")?.value || "";

        const { name, email } = parseFromField(from);
        if (isBlockedEmail(email, name)) { blockedCount++; continue; }

        const body = extractEmailBody(msgDetail.data.payload);
        if (body.length < 20) continue;
        if (isBulkEmailByContent(subject, body)) { blockedCount++; continue; }

        emails.push({ id: message.id, from, fromName: name, fromEmail: email, subject, body, date });
      } catch (err) { console.error(`Error fetching message:`, err); }
    }

    // AI Analysis
    const { contacts, actions } = await classifyAndExtractActions(emails);

    // Dedupe Actions
    const newActions = actions.filter((action) => {
      const normalized = action.description.toLowerCase().trim();
      for (const existing of existingActions) {
        if (normalized === existing || normalized.includes(existing) || existing.includes(normalized) || stringSimilarity(normalized, existing) > 0.85) {
          return false;
        }
      }
      return true;
    });

    // Dedupe Contacts
    const uniqueContacts = new Map<string, any>();
    for (const contact of contacts) {
      if (!uniqueContacts.has(contact.email)) uniqueContacts.set(contact.email, contact);
    }
    const contactList = Array.from(uniqueContacts.values());
    const newContacts = contactList.filter((c) => !existingEmails.has(c.email.toLowerCase()));

    const duplicates = findDuplicates(newContacts.map((c) => ({ name: c.name, email: c.email })), existingContacts);

    const realPeople = newContacts.filter((c) => c.classification === "real_person" && !duplicates.has(c.email));

    // Enrich actions with Person Info if found in DB
    for (const action of newActions) {
      const existing = existingContacts.find((c) => c.emails.includes(action.fromEmail.toLowerCase()));
      if (existing) {
        (action as any).personId = existing.id;
        (action as any).personName = existing.name;
        (action as any).inSecondBrain = true;
      } else {
        (action as any).inSecondBrain = false;
      }
    }

    return NextResponse.json({
      ok: true,
      totalScanned: messages.length,
      emailsAnalyzed: emails.length,
      blockedCount,
      existingContactsCount: existingContacts.length,
      duplicateActionsFiltered: actions.length - newActions.length,
      emails: emails.map(e => ({
        id: e.id,
        fromName: e.fromName,
        subject: e.subject,
        snippet: e.body.substring(0, 100),
        date: e.date,
        hasAction: newActions.some(a => a.messageId === e.id),
      })),
      contacts: {
        realPeople,
        marketing: [], // simplified response
        automated: [],
        uncertain: [],
        possibleDuplicates: [],
      },
      actions: {
        tasks: newActions.filter(a => a.type === "task"),
        followUps: newActions.filter(a => a.type === "follow_up"),
        commitments: newActions.filter(a => a.type === "commitment"),
        waitingOn: newActions.filter(a => a.type === "waiting_on"),
      }
    });

  } catch (err: any) {
    console.error("scan error", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}