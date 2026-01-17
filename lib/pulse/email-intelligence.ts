import { google } from "googleapis";
import { getOpenAI } from "@/services/ai/openai";
import { supabaseAdmin } from "@/lib/supabase";
import { refreshAccessToken } from "@/app/lib/gmail-utils";

const openai = getOpenAI();

// ============================================
// Types
// ============================================

export type ScannedEmail = {
    id: string;
    from: string;
    fromName: string;
    fromEmail: string;
    subject: string;
    body: string;
    date: string;
};

export type DetectedAction = {
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
    personId?: string;
    personName?: string;
    inSecondBrain?: boolean;
};

export type ContactInfo = {
    name: string;
    email: string;
    company: string;
    subject: string;
    classification: "real_person" | "marketing" | "automated" | "uncertain";
    confidence: number;
    reason: string;
};

// ============================================
// Constants & Filters
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

// ============================================
// Helpers
// ============================================

export function isBlockedEmail(email: string, name: string): boolean {
    const emailLower = email.toLowerCase();

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

export function isBulkEmailByContent(subject: string, body: string): boolean {
    const combined = (subject + " " + body).toLowerCase();
    let matches = 0;
    for (const keyword of BULK_EMAIL_KEYWORDS) {
        if (combined.includes(keyword.toLowerCase())) matches++;
    }
    return matches >= 2;
}

export function parseFromField(from: string): { name: string; email: string } {
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

export function extractEmailBody(payload: any): string {
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

function parseEmail(email: string): { company: string } {
    const domain = email.split("@")[1] || "";
    const company = domain.split(".")[0];
    return { company: company.charAt(0).toUpperCase() + company.slice(1) };
}

function stringSimilarity(s1: string, s2: string): number {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    if (s1 === s2) return 1;
    if (!s1.length || !s2.length) return 0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    return 0.5;
}

function safeParseJSON(text: string): any {
    if (!text) return { emails: [] };
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
    try {
        return JSON.parse(cleaned);
    } catch (err) {
        console.error("JSON parse error:", err);
        return { emails: [] };
    }
}

// ============================================
// Core Logic
// ============================================

export async function fetchEmails(
    accessToken: string,
    refreshToken: string | undefined,
    maxResults: number = 50,
    daysBack: number = 7
): Promise<{ emails: ScannedEmail[], blockedCount: number, newAccessToken?: string }> {

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    let gmail = google.gmail({ version: "v1", auth: oauth2Client });
    let newAccessToken: string | undefined;

    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - daysBack);
    const afterTimestamp = Math.floor(afterDate.getTime() / 1000);

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
                throw new Error("Token expired and refresh failed");
            }
        } else {
            throw err;
        }
    }

    const emails: ScannedEmail[] = [];
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

    return { emails, blockedCount, newAccessToken };
}

export async function classifyAndExtractActions(
    emails: ScannedEmail[]
): Promise<{ contacts: ContactInfo[]; actions: DetectedAction[] }> {
    if (emails.length === 0) return { contacts: [], actions: [] };

    const allContacts: ContactInfo[] = [];
    const allActions: DetectedAction[] = [];
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
            const openai = getOpenAI();
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

export async function dedupeAndEnrich(
    userId: string,
    actions: DetectedAction[],
    contacts: ContactInfo[],
    existingEmails: Set<string>,
    existingActions: Set<string>,
    existingContacts: any[] // passed from caller to avoid double fetch
): Promise<{ newActions: DetectedAction[]; newContacts: ContactInfo[] }> {

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

    // Enrich actions with Person Info if found in DB
    for (const action of newActions) {
        const existing = existingContacts.find((c: any) => c.emails.includes(action.fromEmail.toLowerCase()));
        if (existing) {
            action.personId = existing.id;
            action.personName = existing.name;
            action.inSecondBrain = true;
        } else {
            action.inSecondBrain = false;
        }
    }

    // Dedupe Contacts
    const uniqueContacts = new Map<string, ContactInfo>();
    for (const contact of contacts) {
        if (!uniqueContacts.has(contact.email)) uniqueContacts.set(contact.email, contact);
    }

    // Simple filter against existing emails
    const newContacts = Array.from(uniqueContacts.values()).filter((c) => !existingEmails.has(c.email.toLowerCase()));

    return { newActions, newContacts };
}
