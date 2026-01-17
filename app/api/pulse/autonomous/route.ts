import { canMakeAICall, trackAIUsage } from "@/services/usage";
import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/services/ai/openai";
import { supabaseAdmin } from "@/lib/supabase";
import { refreshAccessToken } from "@/app/lib/gmail-utils";
import { auth } from '@clerk/nextjs/server';



// Supabase Data Layers
import { createTask, getTasks } from '@/lib/data/tasks';
import { createFollowUp, getFollowUps } from '@/lib/data/followups';
import { createContact, getContacts } from '@/lib/data/journal';



// ============================================
// BLOCKED DOMAINS & PATTERNS
// ============================================
const BLOCKED_DOMAINS = new Set([
  // Email marketing platforms
  "mailchimp.com", "sendgrid.net", "sendgrid.com", "constantcontact.com",
  "mailgun.com", "amazonses.com", "postmarkapp.com", "hubspot.com",
  "klaviyo.com", "braze.com", "marketo.com", "pardot.com",
  // Social media
  "facebookmail.com", "facebook.com", "twitter.com", "linkedin.com",
  "instagram.com", "tiktok.com", "pinterest.com",
  // E-commerce
  "amazon.com", "ebay.com", "shopify.com", "walmart.com", "target.com",
  // Financial
  "usaa.com", "chase.com", "bankofamerica.com", "wellsfargo.com",
  "capitalone.com", "americanexpress.com", "discover.com", "paypal.com",
  "venmo.com", "cashapp.com", "stripe.com", "rocketmortgage.com",
  "sofi.com", "robinhood.com", "fidelity.com", "schwab.com", "vanguard.com",
  // Insurance
  "geico.com", "progressive.com", "statefarm.com", "allstate.com",
  // Tech giants
  "google.com", "youtube.com", "apple.com", "microsoft.com",
  "github.com", "slack.com", "zoom.us", "dropbox.com", "adobe.com",
  // Streaming
  "netflix.com", "spotify.com", "hulu.com", "disneyplus.com",
  // Food delivery
  "doordash.com", "ubereats.com", "grubhub.com", "instacart.com",
  // Travel
  "airbnb.com", "booking.com", "expedia.com", "tripadvisor.com",
  // Newsletters
  "substack.com", "beehiiv.com", "canva.com", "medium.com",
  // JOB SITES
  "linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com",
  "monster.com", "careerbuilder.com", "dice.com", "hired.com",
  "lever.co", "greenhouse.io", "workday.com", "icims.com",
  // REAL ESTATE
  "redfin.com", "zillow.com", "realtor.com", "trulia.com",
  "compass.com", "coldwellbanker.com", "remax.com", "kw.com",
  // HR & Training
  "workday.com", "adp.com", "paychex.com", "gusto.com",
  "knowbe4.com", "cornerstonelearning.com", "linkedin.com",
  // Recruiting
  "jobvite.com", "smartrecruiters.com", "breezy.hr",
]);

const BLOCKED_EMAIL_PATTERNS = [
  /^no[-_]?reply@/i, /^noreply@/i, /^do[-_]?not[-_]?reply@/i,
  /^notification[s]?@/i, /^alert[s]?@/i, /^update[s]?@/i,
  /^newsletter@/i, /^news@/i, /^info@/i, /^support@/i,
  /^billing@/i, /^invoice@/i, /^receipt@/i, /^order@/i,
  /^shipping@/i, /^tracking@/i, /^confirm@/i, /^statement@/i,
];

const BULK_KEYWORDS = [
  "unsubscribe", "view in browser", "email preferences",
  "statement is ready", "view your statement", "your bill is ready",
  "order confirmation", "shipping confirmation", "track your order",
  "sign in to view", "log in to view", "verify your email",
  "security alert", "password reset",
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
    if (domain.startsWith("mail.") || domain.startsWith("email.") ||
      domain.startsWith("e.") || domain.startsWith("m.") ||
      domain.startsWith("notifications.")) return true;
  }

  if (nameLower.includes("no reply") || nameLower.includes("noreply") ||
    nameLower.includes("notification") || nameLower.includes("automated")) return true;

  return false;
}

function isBulkEmail(subject: string, body: string): boolean {
  const combined = (subject + " " + body).toLowerCase();
  let matches = 0;
  for (const keyword of BULK_KEYWORDS) {
    if (combined.includes(keyword)) matches++;
  }
  return matches >= 2;
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
    const parsedName = localPart.replace(/[._]/g, " ").split(" ")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
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
    }
  }
  body = body.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return body.length > 3000 ? body.substring(0, 3000) + "..." : body;
}

// ============================================
// Duplicate Detection
// ============================================

function stringSimilarity(s1: string, s2: string): number {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  if (s1 === s2) return 1;
  if (!s1.length || !s2.length) return 0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

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

async function getExistingActions(userId: string): Promise<Set<string>> {
  const existing = new Set<string>();

  const tasks = await getTasks(userId);
  const followups = await getFollowUps(userId);

  for (const t of tasks) existing.add(t.title.replace(/^[📋📅📤⏳]\s*/, "").toLowerCase().trim());
  for (const f of followups) existing.add(f.name.replace(/^[📋📅📤⏳]\s*/, "").toLowerCase().trim());

  return existing;
}

async function getExistingContacts(userId: string): Promise<Map<string, string>> {
  const contactsMap = new Map<string, string>();
  const contacts = await getContacts(userId);

  for (const c of contacts) {
    if (c.email) contactsMap.set(c.email.toLowerCase(), c.name);
  }
  return contactsMap;
}

// ============================================
// AI Analysis
// ============================================

type ActionItem = {
  type: "task" | "follow_up" | "commitment" | "waiting_on";
  priority: "high" | "medium" | "low";
  description: string;
  dueDate: string | null;
  context: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  messageId: string;
};

type ContactItem = {
  name: string;
  email: string;
  company: string;
  subject: string;
  isRealPerson: boolean;
};

async function classifyEmails(emails: any[]) {
  const openai = getOpenAI();
  const headers = emails.map((e, i) => `Email ${i}: Subject: ${e.subject}, From: ${e.from}`).join('\n');
}

async function analyzeEmailsWithAI(
  emails: Array<{ id: string; from: string; fromName: string; fromEmail: string; subject: string; body: string; date: string }>
): Promise<{ actions: ActionItem[]; contacts: ContactItem[] }> {
  const allActions: ActionItem[] = [];
  const allContacts: ContactItem[] = [];
  const batchSize = 5;

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);

    const prompt = `You are an AI executive assistant. Analyze these emails and extract:

1. ACTION ITEMS - Things that need to be done
2. REAL PERSON CONTACTS - People worth adding to a CRM

IMPORTANT RULES:
- ONLY extract actions from emails sent by REAL PEOPLE with REAL REQUESTS
- IGNORE automated emails like: job listings, property listings, newsletters, training reminders, system notifications
- A real action is something a PERSON asked YOU to do or respond to
- If the email is clearly automated/bulk (no personal greeting, generic content), mark it as having NO actions

EMAILS:
${batch.map((e, idx) => `
--- EMAIL ${idx + 1} ---
From: ${e.from}
Subject: ${e.subject}
Date: ${e.date}
Body: ${e.body.substring(0, 600)}
---`).join("\n")}

For ACTIONS, only extract if it's from a real person:
- "task" = Something I need to do that a person requested
- "follow_up" = Conversation to continue with a real person
- "commitment" = Promise I made to someone
- "waiting_on" = Something a real person promised me

For CONTACTS:
- Only real people (not companies, bots, job boards, or automated senders)

Calculate smart due dates:
- High priority = 1 day
- Medium priority = 3 days
- Low priority = 7 days
- If date mentioned (e.g., "by Friday"), use that

RESPOND WITH JSON:
{
  "emails": [
    {
      "index": 1,
      "isRealPerson": true/false,
      "isAutomated": true/false,
      "actions": [
        {
          "type": "task|follow_up|commitment|waiting_on",
          "priority": "high|medium|low",
          "description": "Specific action",
          "dueDate": "YYYY-MM-DD" or null,
          "context": "Brief context"
        }
      ]
    }
  ]
}

If an email is automated (job listing, property alert, newsletter, training reminder), set isAutomated: true and actions: []
Respond ONLY with valid JSON.`;

    try {
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      let responseText = completion.choices[0].message.content || "{}";
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const result = JSON.parse(responseText);

      for (const emailResult of result.emails || []) {
        const idx = emailResult.index - 1;
        if (idx < 0 || idx >= batch.length) continue;
        const email = batch[idx];

        // Add contact if real person and not automated
        if (emailResult.isRealPerson && !emailResult.isAutomated) {
          const domain = email.fromEmail.split("@")[1] || "";
          allContacts.push({
            name: email.fromName,
            email: email.fromEmail,
            company: domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1),
            subject: email.subject,
            isRealPerson: true,
          });
        }

        // Add actions only if not automated
        if (!emailResult.isAutomated) {
          for (const action of emailResult.actions || []) {
            // Calculate due date if not provided
            let dueDate = action.dueDate;
            if (!dueDate) {
              const now = new Date();
              if (action.priority === "high") now.setDate(now.getDate() + 1);
              else if (action.priority === "medium") now.setDate(now.getDate() + 3);
              else now.setDate(now.getDate() + 7);
              dueDate = now.toISOString().split("T")[0];
            }

            allActions.push({
              type: action.type,
              priority: action.priority,
              description: action.description,
              dueDate,
              context: action.context,
              fromName: email.fromName,
              fromEmail: email.fromEmail,
              subject: email.subject,
              messageId: email.id,
            });
          }
        }
      }
    } catch (err) {
      console.error("AI analysis error:", err);
    }
  }

  return { actions: allActions, contacts: allContacts };
}

// ============================================
// Auto-Create Functions
// ============================================

async function createTaskWrapper(userId: string, action: ActionItem): Promise<{ ok: boolean; id?: string; error?: string }> {
  const prefix = action.type === "commitment" ? "📤" : "📋";
  const name = `${prefix} ${action.description}`;

  const contextNote = `From: ${action.fromName} (${action.fromEmail})
Subject: ${action.subject}
Context: ${action.context}
Auto-created by Pulse AI`;

  try {
    const newTask = await createTask(userId, {
      title: name,
      status: 'todo',
      priority: action.priority.charAt(0).toUpperCase() + action.priority.slice(1),
      due_at: action.dueDate || new Date().toISOString().split("T")[0],
      // Note: We might be losing 'contextNote' here as Supabase Tasks table might not have body/description yet.
      // If we need it, we should add 'description' col to tasks. 
      // For now, appending to title or ignoring is best effort.
    });

    return { ok: true, id: newTask.id };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

async function createFollowUpWrapper(userId: string, action: ActionItem): Promise<{ ok: boolean; id?: string; error?: string }> {
  const prefix = action.type === "waiting_on" ? "⏳" : "📅";
  const name = `${prefix} ${action.description}`;
  const typeLabel = action.type === "waiting_on" ? "Check-in" : "Follow-up";

  try {
    const followup = await createFollowUp(userId, {
      name: name,
      status: 'pending',
      priority: action.priority.charAt(0).toUpperCase() + action.priority.slice(1),
      due_date: action.dueDate || new Date().toISOString().split("T")[0],
      type: typeLabel,
    });

    return { ok: true, id: followup.id };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

async function createContactWrapper(userId: string, contact: ContactItem): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const newContact = await createContact(userId, {
      name: contact.name,
      email: contact.email,
      company: contact.company,
      // tags: ['Auto-Added'], // if supported
    });

    return { ok: true, id: newContact.id };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// ============================================
// Main Autonomous Processor
// ============================================

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { accessToken, refreshToken, maxResults = 100, daysBack = 7 } = body;

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Missing access token" }, { status: 401 });
    }

    const results = {
      scanned: 0,
      analyzed: 0,
      blocked: 0,
      actionsCreated: 0,
      actionsDuplicate: 0,
      contactsCreated: 0,
      contactsDuplicate: 0,
      errors: [] as string[],
      created: {
        tasks: [] as string[],
        followUps: [] as string[],
        contacts: [] as string[],
      },
    };

    let newAccessToken: string | null = null;

    // Setup Gmail
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    let gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - daysBack);
    const afterTimestamp = Math.floor(afterDate.getTime() / 1000);

    console.log("🤖 PULSE AI: Starting autonomous email processing...");

    // Fetch messages
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

    results.scanned = messages.length;
    console.log(`📧 Found ${messages.length} messages`);

    // Get existing data for duplicate detection
    const existingActions = await getExistingActions(userId);
    const existingContacts = await getExistingContacts(userId);
    console.log(`📋 Checking against ${existingActions.size} existing actions, ${existingContacts.size} contacts`);

    // Fetch and filter emails
    const emails: Array<{ id: string; from: string; fromName: string; fromEmail: string; subject: string; body: string; date: string }> = [];

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

        if (isBlockedEmail(email, name)) {
          results.blocked++;
          continue;
        }

        const body = extractEmailBody(msgDetail.data.payload);
        if (body.length < 20) continue;

        if (isBulkEmail(subject, body)) {
          results.blocked++;
          continue;
        }

        emails.push({ id: message.id, from, fromName: name, fromEmail: email, subject, body, date });
      } catch (err) {
        console.error("Error fetching message:", err);
      }
    }

    results.analyzed = emails.length;
    console.log(`🚫 Blocked ${results.blocked} junk emails`);
    console.log(`📝 Analyzing ${emails.length} emails with AI...`);

    // AI Analysis
    const { actions, contacts } = await analyzeEmailsWithAI(emails);
    console.log(`🧠 AI found ${actions.length} actions, ${contacts.length} contacts`);

    // AUTO-CREATE ACTIONS
    console.log("⚡ Auto-creating actions...");
    for (const action of actions) {
      const normalized = action.description.toLowerCase().trim();

      // Check for duplicates
      let isDuplicate = false;
      for (const existing of existingActions) {
        if (stringSimilarity(normalized, existing) > 0.8) {
          isDuplicate = true;
          break;
        }
      }

      if (isDuplicate) {
        results.actionsDuplicate++;
        console.log(`⏭️ Skipping duplicate: ${action.description.slice(0, 40)}...`);
        continue;
      }

      // Create based on type
      let result;
      if (action.type === "task" || action.type === "commitment") {
        result = await createTaskWrapper(userId, action);
        if (result.ok) {
          results.created.tasks.push(action.description);
          existingActions.add(normalized); // Prevent duplicates in same run
        }
      } else {
        result = await createFollowUpWrapper(userId, action);
        if (result.ok) {
          results.created.followUps.push(action.description);
          existingActions.add(normalized);
        }
      }

      if (result.ok) {
        results.actionsCreated++;
        console.log(`✅ Created: ${action.description.slice(0, 40)}...`);
      } else {
        results.errors.push(`Failed to create: ${action.description} - ${result.error}`);
      }
    }

    // AUTO-CREATE CONTACTS
    console.log("👥 Auto-creating contacts...");
    const uniqueContacts = new Map<string, ContactItem>();
    for (const contact of contacts) {
      if (!uniqueContacts.has(contact.email)) {
        uniqueContacts.set(contact.email, contact);
      }
    }

    for (const [email, contact] of uniqueContacts) {
      if (existingContacts.has(email.toLowerCase())) {
        results.contactsDuplicate++;
        console.log(`⏭️ Contact exists: ${contact.name}`);
        continue;
      }

      const result = await createContactWrapper(userId, contact);
      if (result.ok) {
        results.contactsCreated++;
        results.created.contacts.push(contact.name);
        existingContacts.set(email.toLowerCase(), contact.name);
        console.log(`✅ Added contact: ${contact.name}`);
      } else {
        results.errors.push(`Failed to create contact: ${contact.name} - ${result.error}`);
      }
    }

    console.log("🎉 PULSE AI: Autonomous processing complete!");
    console.log(`   📋 ${results.actionsCreated} actions created`);
    console.log(`   👥 ${results.contactsCreated} contacts created`);
    console.log(`   ⏭️ ${results.actionsDuplicate + results.contactsDuplicate} duplicates skipped`);

    return NextResponse.json({
      ok: true,
      autonomous: true,
      results,
      summary: {
        scanned: results.scanned,
        analyzed: results.analyzed,
        blocked: results.blocked,
        actionsCreated: results.actionsCreated,
        actionsDuplicate: results.actionsDuplicate,
        contactsCreated: results.contactsCreated,
        contactsDuplicate: results.contactsDuplicate,
        errors: results.errors.length,
      },
      created: results.created,
      ...(newAccessToken && { newAccessToken }),
    });
  } catch (err: any) {
    console.error("❌ Autonomous processing error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}