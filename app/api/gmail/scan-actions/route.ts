import { canMakeAICall, trackAIUsage } from "@/services/usage";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@clerk/nextjs/server";
import { getOpenAI } from "@/services/ai/openai";
import { refreshAccessToken } from "@/app/lib/gmail-utils";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { getContactByEmail } from "@/lib/data/journal";

// Top-level openai removed

// ============================================
// BLOCKED DOMAINS - Skip entirely
// ============================================
const BLOCKED_DOMAINS = new Set([
  // Marketing platforms
  "mailchimp.com", "sendgrid.net", "sendgrid.com", "constantcontact.com",
  "mailgun.com", "amazonses.com", "postmarkapp.com", "hubspot.com",
  "klaviyo.com", "braze.com", "marketo.com", "pardot.com",
  // Social media
  "facebookmail.com", "twitter.com", "linkedin.com", "instagram.com",
  // E-commerce
  "amazon.com", "ebay.com", "shopify.com", "etsy.com",
  // Financial - automated
  "usaa.com", "chase.com", "bankofamerica.com", "wellsfargo.com",
  "capitalone.com", "americanexpress.com", "discover.com", "citi.com",
  "paypal.com", "venmo.com", "cashapp.com", "stripe.com",
  "rocketmortgage.com", "quickenloans.com", "sofi.com", "nerdwallet.com",
  // Insurance - automated
  "geico.com", "progressive.com", "statefarm.com", "allstate.com",
  "libertymutual.com", "nationwide.com",
  // Utilities & Services
  "netflix.com", "spotify.com", "hulu.com", "apple.com", "google.com",
  "microsoft.com", "adobe.com", "dropbox.com", "zoom.us",
  // Delivery & Food
  "doordash.com", "ubereats.com", "grubhub.com", "instacart.com",
  // Travel
  "airbnb.com", "booking.com", "expedia.com", "southwest.com", "united.com",
  // Newsletters
  "substack.com", "beehiiv.com", "morningbrew.com",
]);

// ============================================
// BLOCKED PATTERNS - Skip based on email/name
// ============================================
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

// Keywords that indicate transactional/bulk emails
const BULK_EMAIL_KEYWORDS = [
  "unsubscribe", "view in browser", "email preferences",
  "manage your subscription", "opt out", "privacy policy",
  "terms of service", "view online", "trouble viewing",
  "add us to your address book", "this email was sent to",
  "update your preferences", "email settings",
  "statement is ready", "statement available", "view your statement",
  "your bill is ready", "payment received", "payment confirmation",
  "order confirmation", "shipping confirmation", "delivery update",
  "track your order", "track your package",
  "sign in to view", "log in to view", "login to view",
  "verify your email", "confirm your email", "verify your account",
  "security alert", "unusual activity", "new device sign-in",
  "password reset", "reset your password",
];

function isBlockedEmail(email: string, name: string): boolean {
  const emailLower = email.toLowerCase();
  const nameLower = name.toLowerCase();

  // Check blocked patterns
  for (const pattern of BLOCKED_EMAIL_PATTERNS) {
    if (pattern.test(emailLower)) return true;
  }

  // Check blocked domains
  const domain = emailLower.split("@")[1];
  if (domain && BLOCKED_DOMAINS.has(domain)) return true;

  // Check subdomains of blocked domains
  if (domain) {
    const parts = domain.split(".");
    if (parts.length > 2) {
      const rootDomain = parts.slice(-2).join(".");
      if (BLOCKED_DOMAINS.has(rootDomain)) return true;
    }
    // Common marketing subdomains
    if (
      domain.startsWith("mail.") || domain.startsWith("email.") ||
      domain.startsWith("e.") || domain.startsWith("m.") ||
      domain.startsWith("p.") || domain.startsWith("t.") ||
      domain.startsWith("go.") || domain.startsWith("click.") ||
      domain.startsWith("engage.") || domain.startsWith("mailcenter.") ||
      domain.startsWith("messages.") || domain.startsWith("notifications.")
    ) return true;
  }

  // Check name patterns
  if (
    nameLower.includes("no reply") || nameLower.includes("noreply") ||
    nameLower.includes("do not reply") || nameLower.includes("notification") ||
    nameLower.includes("automated") || nameLower.includes("customer service")
  ) return true;

  return false;
}

function isBulkEmailByContent(subject: string, body: string): boolean {
  const combined = (subject + " " + body).toLowerCase();

  // Check for bulk email keywords
  let keywordMatches = 0;
  for (const keyword of BULK_EMAIL_KEYWORDS) {
    if (combined.includes(keyword.toLowerCase())) {
      keywordMatches++;
    }
  }

  // If 2+ bulk keywords, likely bulk email
  if (keywordMatches >= 2) return true;

  // Check for common transactional patterns
  if (
    combined.includes("your statement") ||
    combined.includes("your bill") ||
    combined.includes("your order") ||
    combined.includes("your receipt") ||
    combined.includes("your account") && combined.includes("view") ||
    combined.includes("log in to") && combined.includes("view") ||
    combined.includes("sign in to") && combined.includes("view")
  ) return true;

  return false;
}

// ============================================
// Email Parsing Helpers
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
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
    return { name: parsedName, email: email.toLowerCase() };
  }
  return { name: from, email: from.toLowerCase() };
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

  if (body.length > 3000) {
    body = body.substring(0, 3000) + "...";
  }

  return body;
}

// ============================================
// AI Email Classification - Is this actionable?
// ============================================

async function classifyEmailsForActions(
  emails: Array<{ id: string; from: string; subject: string; body: string; date: string }>
): Promise<Array<{ id: string; isActionable: boolean; reason: string }>> {
  if (emails.length === 0) return [];

  const results: Array<{ id: string; isActionable: boolean; reason: string }> = [];
  const batchSize = 10;

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);

    const prompt = `You are an expert email classifier. Determine if each email contains REAL, ACTIONABLE requests from a REAL PERSON.

CLASSIFY EACH EMAIL:

${batch.map((e, idx) => `
--- EMAIL ${idx + 1} ---
From: ${e.from}
Subject: ${e.subject}
Body Preview: ${e.body.substring(0, 500)}
---`).join("\n")}

MARK AS **NOT ACTIONABLE** (skip these):
- Automated notifications (statements ready, bills, receipts)
- Marketing/promotional emails
- Newsletters or digests
- System alerts (security, login, password)
- Shipping/tracking updates
- Generic "no-reply" communications
- Mass emails sent to many people
- Subscription confirmations
- Account notifications

MARK AS **ACTIONABLE** (keep these):
- Direct emails from real people with specific requests
- "Can you send me..." or "Please review..."
- Meeting requests from real colleagues
- Emails that require YOUR specific response/action
- Business discussions needing follow-up
- Personal correspondence requiring action

RESPOND WITH JSON ARRAY:
[
  {"index": 1, "actionable": true/false, "reason": "Brief reason"}
]

Be STRICT. When in doubt, mark as NOT actionable. We only want REAL person-to-person emails with actual action items.

Respond ONLY with JSON array.`;

    try {
      const openai = await getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      let responseText = completion.choices[0].message.content || "[]";
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      const classifications = JSON.parse(responseText);

      for (const c of classifications) {
        const email = batch[c.index - 1];
        if (email) {
          results.push({
            id: email.id,
            isActionable: c.actionable === true,
            reason: c.reason,
          });
        }
      }
    } catch (err) {
      console.error("Classification error:", err);
      // On error, include all (will be filtered by action detection)
      for (const email of batch) {
        results.push({ id: email.id, isActionable: true, reason: "Classification failed" });
      }
    }
  }

  return results;
}

// ============================================
// AI Action Detection
// ============================================

type DetectedAction = {
  type: "task" | "follow_up" | "commitment" | "waiting_on";
  priority: "high" | "medium" | "low";
  description: string;
  dueDate: string | null;
  context: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  messageId: string;
  confidence: number;
};

async function detectActionsInEmails(
  emails: Array<{ id: string; from: string; subject: string; body: string; date: string }>
): Promise<DetectedAction[]> {
  if (emails.length === 0) return [];

  const allActions: DetectedAction[] = [];
  const batchSize = 5;

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);

    const prompt = `You are an expert executive assistant analyzing emails to extract actionable items.
IMPORTANT: Only extract actions from REAL person-to-person emails. Skip anything that looks automated.

ANALYZE THESE EMAILS:
${batch.map((e, idx) => `
--- EMAIL ${idx + 1} ---
From: ${e.from}
Subject: ${e.subject}
Date: ${e.date}
Body:
${e.body}
--- END EMAIL ${idx + 1} ---`).join("\n")}

EXTRACT ONLY REAL ACTIONABLE ITEMS:

1. **TASK** - Specific request directed at me from a real person
   - "Can you send me the proposal?"
   - "Please review the attached document"
   - NOT: "Sign in to view your statement"

2. **FOLLOW_UP** - Real conversation that needs to continue
   - "Let's circle back next week"
   - "We should schedule a call"
   - NOT: "Click here to manage preferences"

3. **COMMITMENT** - Promise I made to a real person
   - "I'll send you the documents by Friday"
   - NOT: Anything from automated emails

4. **WAITING_ON** - Something a real person promised to do
   - "I'll have the contract to you tomorrow"
   - NOT: "Your order will ship soon"

CRITICAL RULES:
- SKIP all automated/bulk/transactional emails
- SKIP anything with "unsubscribe", "view in browser", etc.
- SKIP account notifications, statements, bills
- ONLY extract from genuine person-to-person correspondence
- Be SPECIFIC about what needs to be done

RESPOND WITH JSON ARRAY:
[
  {
    "emailIndex": 1,
    "type": "task" | "follow_up" | "commitment" | "waiting_on",
    "priority": "high" | "medium" | "low",
    "description": "Specific action needed",
    "dueDate": "2024-01-15" or null,
    "context": "Brief context",
    "confidence": 0.0-1.0
  }
]

If an email has NO actionable items or is automated, don't include it.
Respond ONLY with the JSON array.`;

    try {
      const openai = await getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      let responseText = completion.choices[0].message.content || "[]";
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      const actions = JSON.parse(responseText);

      for (const action of actions) {
        const emailIdx = action.emailIndex - 1;
        if (emailIdx >= 0 && emailIdx < batch.length) {
          const email = batch[emailIdx];
          const { name, email: emailAddr } = parseFromField(email.from);

          allActions.push({
            type: action.type,
            priority: action.priority,
            description: action.description,
            dueDate: action.dueDate,
            context: action.context,
            fromName: name,
            fromEmail: emailAddr,
            subject: email.subject,
            messageId: email.id,
            confidence: action.confidence,
          });
        }
      }
    } catch (err) {
      console.error("AI action detection error:", err);
    }
  }

  return allActions;
}

// ============================================
// Find person in Second Brain (Supabase Contacts)
// ============================================

async function findPersonByEmail(userId: string, email: string): Promise<{ id: string; name: string } | null> {
  try {
    const contact = await getContactByEmail(userId, email);
    if (contact) {
      return { id: contact.id, name: contact.name };
    }
  } catch (err) {
    console.error("Error finding person:", err);
  }
  return null;
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

    let newAccessToken: string | null = null;

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    let gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - daysBack);
    const afterTimestamp = Math.floor(afterDate.getTime() / 1000);

    console.log(`📧 Scanning emails from last ${daysBack} days...`);

    let messages: any[] = [];

    try {
      const messagesResponse = await gmail.users.messages.list({
        userId: "me",
        maxResults,
        q: `in:inbox after:${afterTimestamp}`,
      });
      messages = messagesResponse.data.messages || [];
    } catch (err: any) {
      if (err.status === 401 && refreshToken) {
        console.log("🔄 Token expired, refreshing...");
        const refreshed = await refreshAccessToken(refreshToken);

        if (refreshed) {
          newAccessToken = refreshed.accessToken;
          oauth2Client.setCredentials({ access_token: newAccessToken });
          gmail = google.gmail({ version: "v1", auth: oauth2Client });

          const messagesResponse = await gmail.users.messages.list({
            userId: "me",
            maxResults,
            q: `in:inbox after:${afterTimestamp}`,
          });
          messages = messagesResponse.data.messages || [];
        } else {
          return NextResponse.json({
            ok: false,
            error: "Token expired. Please reconnect Gmail.",
            needsReconnect: true,
          }, { status: 401 });
        }
      } else {
        throw err;
      }
    }

    console.log(`📬 Found ${messages.length} messages`);

    // Fetch and filter emails
    const emails: Array<{ id: string; from: string; subject: string; body: string; date: string }> = [];
    let blockedCount = 0;
    let bulkCount = 0;

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

        // LAYER 1: Block by domain/pattern
        if (isBlockedEmail(email, name)) {
          blockedCount++;
          continue;
        }

        const body = extractEmailBody(msgDetail.data.payload);

        // Skip empty or very short emails
        if (body.length < 20) continue;

        // LAYER 2: Block by content keywords
        if (isBulkEmailByContent(subject, body)) {
          bulkCount++;
          continue;
        }

        emails.push({ id: message.id, from, subject, body, date });
      } catch (err) {
        console.error(`Error fetching message ${message.id}:`, err);
      }
    }

    console.log(`🚫 Blocked ${blockedCount} by domain/pattern`);
    console.log(`🚫 Blocked ${bulkCount} by content keywords`);
    console.log(`📝 ${emails.length} emails passed initial filters`);

    // LAYER 3: AI Classification - Is this email actionable?
    console.log("🧠 AI classifying emails...");
    const classifications = await classifyEmailsForActions(emails);

    const actionableEmails = emails.filter((e) => {
      const c = classifications.find((cl) => cl.id === e.id);
      return c?.isActionable === true;
    });

    const skippedByAI = emails.length - actionableEmails.length;
    console.log(`🧠 AI filtered out ${skippedByAI} non-actionable emails`);
    console.log(`✅ ${actionableEmails.length} emails to scan for actions`);

    // LAYER 4: Detect specific actions
    console.log("🎯 Detecting actions...");
    const detectedActions = await detectActionsInEmails(actionableEmails);
    console.log(`✅ Found ${detectedActions.length} actionable items`);

    // Enrich with Second Brain data (Supabase Contacts)
    for (const action of detectedActions) {
      const person = await findPersonByEmail(userId, action.fromEmail);
      if (person) {
        (action as any).personId = person.id;
        (action as any).personName = person.name;
        (action as any).inSecondBrain = true;
      } else {
        (action as any).inSecondBrain = false;
      }
    }

    // Group by type
    const tasks = detectedActions.filter((a) => a.type === "task");
    const followUps = detectedActions.filter((a) => a.type === "follow_up");
    const commitments = detectedActions.filter((a) => a.type === "commitment");
    const waitingOn = detectedActions.filter((a) => a.type === "waiting_on");

    return NextResponse.json({
      ok: true,
      totalScanned: messages.length,
      blockedByFilters: blockedCount + bulkCount,
      skippedByAI,
      emailsAnalyzed: actionableEmails.length,
      actionsFound: detectedActions.length,
      actions: detectedActions,
      summary: {
        tasks: tasks.length,
        followUps: followUps.length,
        commitments: commitments.length,
        waitingOn: waitingOn.length,
      },
      grouped: { tasks, followUps, commitments, waitingOn },
      ...(newAccessToken && { newAccessToken }),
    });
  } catch (err: any) {
    console.error("❌ Scan error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to scan emails" },
      { status: 500 }
    );
  }
}