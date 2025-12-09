import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Client } from "@notionhq/client";
import OpenAI from "openai";
import { refreshAccessToken } from "@/app/lib/gmail-utils";

// Increase timeout for this route
export const maxDuration = 120; // 2 minutes
export const dynamic = 'force-dynamic';

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const SECOND_BRAIN_DB = process.env.NOTION_DATABASE_SECOND_BRAIN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!NOTION_API_KEY) {
  throw new Error("Missing NOTION_API_KEY");
}

const notion = new Client({ auth: NOTION_API_KEY });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

function normalizeDatabaseId(id: string): string {
  return id.replace(/-/g, "");
}

// ============================================
// BLOCKED DOMAINS
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
  // Financial - automated
  "usaa.com", "chase.com", "bankofamerica.com", "wellsfargo.com",
  "capitalone.com", "americanexpress.com", "discover.com", "citi.com",
  "paypal.com", "venmo.com", "cashapp.com", "stripe.com",
  "rocketmortgage.com", "quickenloans.com", "sofi.com", "nerdwallet.com",
  "creditkarma.com", "mint.com",
  // Insurance
  "geico.com", "progressive.com", "statefarm.com", "allstate.com",
  "libertymutual.com", "nationwide.com",
  // Tech giants
  "google.com", "youtube.com", "apple.com", "microsoft.com",
  "github.com", "gitlab.com", "atlassian.com", "slack.com",
  "zoom.us", "zoom.com", "dropbox.com", "adobe.com",
  // Utilities & Streaming
  "netflix.com", "spotify.com", "hulu.com", "disneyplus.com",
  "verizon.com", "att.com", "tmobile.com", "xfinity.com", "comcast.com",
  // Delivery & Food
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
    if (
      domain.startsWith("mail.") || domain.startsWith("email.") ||
      domain.startsWith("e.") || domain.startsWith("m.") ||
      domain.startsWith("p.") || domain.startsWith("t.") ||
      domain.startsWith("go.") || domain.startsWith("click.") ||
      domain.startsWith("engage.") || domain.startsWith("mailcenter.") ||
      domain.startsWith("messages.") || domain.startsWith("notifications.")
    ) return true;
  }

  if (
    nameLower.includes("no reply") || nameLower.includes("noreply") ||
    nameLower.includes("do not reply") || nameLower.includes("notification") ||
    nameLower.includes("automated") || nameLower.includes("customer service")
  ) return true;

  return false;
}

function isBulkEmailByContent(subject: string, body: string): boolean {
  const combined = (subject + " " + body).toLowerCase();
  let matches = 0;
  for (const keyword of BULK_EMAIL_KEYWORDS) {
    if (combined.includes(keyword.toLowerCase())) matches++;
  }
  if (matches >= 2) return true;
  if (
    combined.includes("your statement") || combined.includes("your bill") ||
    combined.includes("your order") || combined.includes("your receipt") ||
    (combined.includes("your account") && combined.includes("view")) ||
    (combined.includes("log in to") && combined.includes("view")) ||
    (combined.includes("sign in to") && combined.includes("view"))
  ) return true;
  return false;
}

// ============================================
// Email Parsing
// ============================================

function parseFromField(from: string): { name: string; email: string } {
  const match = from.match(/^(?:"?([^"]*)"?\s*)?<?([^>]+@[^>]+)>?$/);
  if (match) {
    const [, name, email] = match;
    if (name && name.trim()) {
      return { name: name.trim(), email: email.toLowerCase() };
    }
    const localPart = email.split("@")[0];
    const parsedName = localPart
      .replace(/[._]/g, " ")
      .split(" ")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(" ");
    return { name: parsedName, email: email.toLowerCase() };
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

  const matrix: number[][] = [];
  for (let i = 0; i <= s1.length; i++) matrix[i] = [i];
  for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return 1 - matrix[s1.length][s2.length] / Math.max(s1.length, s2.length);
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

    // Check within scan
    for (const other of newContacts) {
      if (other.email === newContact.email) continue;
      const otherName = normalizeName(other.name);
      const nameSim = stringSimilarity(newName, otherName);
      if (nameSim > 0.8) {
        matches.push({
          name: other.name,
          email: other.email,
          confidence: nameSim,
          reason: "Similar name in scan",
        });
      }
    }

    if (matches.length > 0) {
      duplicates.set(newContact.email, { matches });
    }
  }

  return duplicates;
}

// ============================================
// Safe JSON Parse Helper
// ============================================

function safeParseJSON(text: string): any {
  if (!text || text.trim() === "") {
    console.warn("Empty response from AI, returning default");
    return { emails: [] };
  }

  // Remove markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  if (!cleaned) {
    console.warn("Empty after cleaning, returning default");
    return { emails: [] };
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("JSON parse error:", err);
    console.error("Raw text was:", text.substring(0, 500));
    return { emails: [] };
  }
}

// ============================================
// AI Classification & Action Detection
// ============================================

async function classifyAndExtractActions(
  emails: Array<{ id: string; from: string; fromName: string; fromEmail: string; subject: string; body: string; date: string }>
): Promise<{
  contacts: Array<{ name: string; email: string; company: string; subject: string; classification: string; confidence: number; reason: string }>;
  actions: Array<{ type: string; priority: string; description: string; dueDate: string | null; context: string; fromName: string; fromEmail: string; subject: string; messageId: string; confidence: number }>;
}> {
  if (emails.length === 0) return { contacts: [], actions: [] };

  const allContacts: any[] = [];
  const allActions: any[] = [];
  const batchSize = 10; // Increased from 5 for faster processing

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    console.log(`🤖 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(emails.length/batchSize)}...`);

    const prompt = `You are an expert email analyst. For each email, determine:
1. Is the SENDER a real person I should add to my contacts?
2. Are there any ACTION ITEMS I need to track?

ANALYZE THESE EMAILS:
${batch.map((e, idx) => `
--- EMAIL ${idx + 1} ---
From: ${e.from}
Subject: ${e.subject}
Date: ${e.date}
Body:
${e.body.substring(0, 600)}
--- END ---`).join("\n")}

FOR EACH EMAIL, RESPOND WITH:

1. **CONTACT CLASSIFICATION** - Is the sender a real person?
   - "real_person" = Yes, add to contacts (colleague, client, prospect, friend)
   - "marketing" = No, marketing/promotional
   - "automated" = No, automated/system email
   - "uncertain" = Can't tell

2. **ACTION ITEMS** - Extract any of these:
   - "task" = Something I need to do ("Can you send me...")
   - "follow_up" = Conversation to continue ("Let's circle back...")
   - "commitment" = Promise I made ("I'll send you...")
   - "waiting_on" = Something they promised ("I'll have it to you...")

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
          "dueDate": "2024-01-15" or null,
          "context": "Brief context",
          "confidence": 0.0-1.0
        }
      ]
    }
  ]
}

RULES:
- Skip automated/bulk emails for contacts
- Only extract REAL actions from person-to-person emails
- Be specific about action descriptions
- If no actions, return empty array for that email

Respond ONLY with valid JSON. No other text.`;

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

        // Add contact
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

        // Add actions
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
      // Continue with next batch instead of failing entirely
    }
  }

  return { contacts: allContacts, actions: allActions };
}

// ============================================
// Get Existing Tasks/Follow-Ups (for duplicate detection)
// ============================================

async function getRecentActions(): Promise<Set<string>> {
  const recentActions = new Set<string>();
  const TASKS_DB = process.env.NOTION_DATABASE_TASKS;
  const FOLLOW_UPS_DB = process.env.NOTION_DATABASE_FOLLOW_UPS;

  const databases = [TASKS_DB, FOLLOW_UPS_DB].filter(Boolean) as string[];

  for (const dbId of databases) {
    try {
      const response = await notion.databases.query({
        database_id: normalizeDatabaseId(dbId),
        filter: {
          property: "Name",
          title: { is_not_empty: true },
        },
        page_size: 100,
      });

      for (const page of response.results) {
        const props = (page as any).properties || {};
        const name = props.Name?.title?.[0]?.plain_text || "";
        if (name) {
          const normalized = name.replace(/^[📋📅📤⏳]\s*/, "").toLowerCase().trim();
          recentActions.add(normalized);
        }
      }
    } catch (err) {
      console.error(`Error fetching from ${dbId}:`, err);
    }
  }

  return recentActions;
}

// ============================================
// Get Existing Contacts
// ============================================

async function getAllExistingContacts(): Promise<ExistingContact[]> {
  if (!SECOND_BRAIN_DB) return [];
  const contacts: ExistingContact[] = [];

  try {
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      const response: any = await notion.databases.query({
        database_id: normalizeDatabaseId(SECOND_BRAIN_DB),
        start_cursor: startCursor,
        page_size: 100,
      });

      for (const page of response.results) {
        const props = (page as any).properties || {};
        const name = props.Name?.title?.[0]?.plain_text || "";
        const email = props.Email?.email || null;
        contacts.push({ id: page.id, name, email, emails: email ? [email.toLowerCase()] : [] });
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }
  } catch (err) {
    console.error("Error fetching contacts:", err);
  }

  return contacts;
}

// ============================================
// Main API Handler
// ============================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Reduced default to 50 for faster processing
    let { accessToken, refreshToken, maxResults = 50, daysBack = 7 } = body;

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Missing access token" }, { status: 401 });
    }

    let newAccessToken: string | null = null;

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    let gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - daysBack);
    const afterTimestamp = Math.floor(afterDate.getTime() / 1000);

    console.log(`📧 Scanning last ${daysBack} days...`);

    let messages: any[] = [];

    try {
      const res = await gmail.users.messages.list({
        userId: "me",
        maxResults,
        q: `in:inbox after:${afterTimestamp}`,
      });
      messages = res.data.messages || [];
    } catch (err: any) {
      if (err.status === 401 && refreshToken) {
        const refreshed = await refreshAccessToken(refreshToken);
        if (refreshed) {
          newAccessToken = refreshed.accessToken;
          oauth2Client.setCredentials({ access_token: newAccessToken });
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

    console.log(`📬 Found ${messages.length} messages`);

    // Get existing contacts
    const existingContacts = await getAllExistingContacts();
    const existingEmails = new Set(existingContacts.flatMap((c) => c.emails));

    // Fetch and filter emails
    const emails: Array<{ id: string; from: string; fromName: string; fromEmail: string; subject: string; body: string; date: string }> = [];
    let blockedCount = 0;

    for (const message of messages) {
      if (!message.id) continue;

      try {
        const msgDetail = await gmail.users.messages.get({
          userId: "me",
          id: message.id,
          format: "full",
        });

        const headers = msgDetail.data.payload?.headers || [];
        const from = headers.find((h) => h.name === "From")?.value || "";
        const subject = headers.find((h) => h.name === "Subject")?.value || "(No Subject)";
        const date = headers.find((h) => h.name === "Date")?.value || "";

        const { name, email } = parseFromField(from);

        // Block obvious junk
        if (isBlockedEmail(email, name)) {
          blockedCount++;
          continue;
        }

        const body = extractEmailBody(msgDetail.data.payload);
        if (body.length < 20) continue;

        if (isBulkEmailByContent(subject, body)) {
          blockedCount++;
          continue;
        }

        emails.push({ id: message.id, from, fromName: name, fromEmail: email, subject, body, date });
      } catch (err) {
        console.error(`Error fetching message:`, err);
      }
    }

    console.log(`🚫 Blocked ${blockedCount} junk emails`);
    console.log(`📝 Analyzing ${emails.length} emails...`);

    // Get existing actions for duplicate detection
    const existingActions = await getRecentActions();
    console.log(`📋 Found ${existingActions.size} existing actions to check against`);

    // AI Analysis
    const { contacts, actions } = await classifyAndExtractActions(emails);

    // Filter out duplicate actions
    const newActions = actions.filter((action) => {
      const normalized = action.description.toLowerCase().trim();
      for (const existing of existingActions) {
        if (normalized === existing || 
            normalized.includes(existing) || 
            existing.includes(normalized) ||
            stringSimilarity(normalized, existing) > 0.85) {
          console.log(`⏭️ Skipping duplicate action: ${action.description}`);
          return false;
        }
      }
      return true;
    });

    const duplicateActionsCount = actions.length - newActions.length;
    console.log(`⏭️ Filtered ${duplicateActionsCount} duplicate actions`);

    // Process contacts - dedupe and filter
    const uniqueContacts = new Map<string, any>();
    for (const contact of contacts) {
      if (!uniqueContacts.has(contact.email)) {
        uniqueContacts.set(contact.email, contact);
      }
    }

    const contactList = Array.from(uniqueContacts.values());

    // Filter out existing contacts
    const newContacts = contactList.filter((c) => !existingEmails.has(c.email.toLowerCase()));

    // Find duplicates
    const duplicates = findDuplicates(
      newContacts.map((c) => ({ name: c.name, email: c.email })),
      existingContacts
    );

    // Categorize contacts
    const realPeople = newContacts.filter((c) => c.classification === "real_person" && !duplicates.has(c.email));
    const marketing = newContacts.filter((c) => c.classification === "marketing");
    const automated = newContacts.filter((c) => c.classification === "automated");
    const uncertain = newContacts.filter((c) => c.classification === "uncertain" && !duplicates.has(c.email));
    const possibleDuplicates = newContacts.filter((c) => duplicates.has(c.email)).map((c) => ({
      ...c,
      duplicateMatches: duplicates.get(c.email)?.matches || [],
    }));

    // Categorize actions (use filtered newActions)
    const tasks = newActions.filter((a) => a.type === "task");
    const followUps = newActions.filter((a) => a.type === "follow_up");
    const commitments = newActions.filter((a) => a.type === "commitment");
    const waitingOn = newActions.filter((a) => a.type === "waiting_on");

    // Enrich actions with Second Brain info
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

    console.log(`✅ Found ${realPeople.length} real contacts, ${newActions.length} actions`);

    return NextResponse.json({
      ok: true,
      totalScanned: messages.length,
      emailsAnalyzed: emails.length,
      blockedCount,
      existingContactsCount: existingContacts.length,
      duplicateActionsFiltered: duplicateActionsCount,

      // Raw emails for display
      emails: emails.map(e => ({
        id: e.id,
        fromName: e.fromName,
        fromEmail: e.fromEmail,
        subject: e.subject,
        snippet: e.body.substring(0, 200) + (e.body.length > 200 ? '...' : ''),
        date: e.date,
        hasAction: newActions.some(a => a.messageId === e.id || a.fromEmail === e.fromEmail),
      })),

      // Contacts
      contacts: {
        realPeople,
        marketing,
        automated,
        uncertain,
        possibleDuplicates,
      },
      contactSummary: {
        realPeople: realPeople.length,
        marketing: marketing.length,
        automated: automated.length,
        uncertain: uncertain.length,
        possibleDuplicates: possibleDuplicates.length,
      },

      // Actions (filtered for duplicates)
      actions: {
        tasks,
        followUps,
        commitments,
        waitingOn,
      },
      actionSummary: {
        tasks: tasks.length,
        followUps: followUps.length,
        commitments: commitments.length,
        waitingOn: waitingOn.length,
        total: newActions.length,
        duplicatesFiltered: duplicateActionsCount,
      },

      ...(newAccessToken && { newAccessToken }),
    });
  } catch (err: any) {
    console.error("❌ Scan error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Scan failed" }, { status: 500 });
  }
}