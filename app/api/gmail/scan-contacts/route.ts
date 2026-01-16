import { canMakeAICall, trackAIUsage } from "@/services/usage";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { google } from "googleapis";
import OpenAI from "openai";
import { refreshAccessToken } from "@/app/lib/gmail-utils";
import { getContacts } from "@/lib/data/journal";

// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

function normalizeDatabaseId(id: string): string {
  return id.replace(/-/g, "");
}

// ============================================
// LAYER 1: Domain & Email Blocklist
// ============================================
const BLOCKED_DOMAINS = new Set([
  "mailchimp.com", "sendgrid.net", "sendgrid.com", "constantcontact.com",
  "mailgun.com", "mailgun.org", "amazonses.com", "postmarkapp.com",
  "hubspot.com", "hubspotmail.com", "klaviyo.com", "braze.com",
  "sailthru.com", "responsys.com", "exacttarget.com", "pardot.com",
  "marketo.com", "eloqua.com", "infusionsoft.com", "activecampaign.com",
  "drip.com", "convertkit.com", "getresponse.com", "aweber.com",
  "facebookmail.com", "facebook.com", "twitter.com", "x.com",
  "instagram.com", "tiktok.com", "pinterest.com", "snapchat.com",
  "reddit.com", "tumblr.com", "medium.com", "quora.com",
  "amazon.com", "ebay.com", "etsy.com", "shopify.com",
  "walmart.com", "target.com", "bestbuy.com", "costco.com",
  "paypal.com", "venmo.com", "cashapp.com", "stripe.com",
  "squareup.com", "intuit.com", "chase.com", "bankofamerica.com",
  "wellsfargo.com", "capitalone.com", "americanexpress.com",
  "google.com", "youtube.com", "apple.com", "microsoft.com",
  "github.com", "gitlab.com", "atlassian.com", "slack.com",
  "zoom.us", "zoom.com", "dropbox.com", "box.com",
  "doordash.com", "ubereats.com", "grubhub.com", "postmates.com",
  "instacart.com", "seamless.com",
  "airbnb.com", "booking.com", "expedia.com", "hotels.com",
  "tripadvisor.com", "southwest.com", "united.com", "delta.com",
  "aa.com", "jetblue.com",
  "substack.com", "beehiiv.com", "revue.co", "buttondown.email",
  "mailerlite.com", "tinyletter.com",
  // Mortgage & Financial Marketing
  "rocketmortgage.com", "quickenloans.com", "lendingtree.com", "bankrate.com",
  "nerdwallet.com", "creditkarma.com", "mint.com", "sofi.com",
  "better.com", "rocket.com", "loandepot.com", "uwm.com",
  // Insurance Marketing
  "usaa.com", "geico.com", "progressive.com", "statefarm.com", "allstate.com",
  "libertymutual.com", "nationwide.com", "farmers.com", "travelers.com",
  // Design & SaaS Marketing
  "canva.com", "engage.canva.com", "figma.com", "adobe.com", "creativecloud.com",
  "mailchimp.com", "constantcontact.com", "sendinblue.com",
  // Retail & Shopping
  "kohls.com", "macys.com", "nordstrom.com", "gap.com", "oldnavy.com",
  "jcrew.com", "nike.com", "adidas.com", "underarmour.com",
  // Food & Beverage
  "starbucks.com", "dunkindonuts.com", "mcdonalds.com", "chipotle.com",
  "dominos.com", "pizzahut.com", "subway.com",
  // Telecom
  "verizon.com", "att.com", "tmobile.com", "sprint.com", "xfinity.com",
  "comcast.com", "spectrum.com",
  // Newsletters & Content
  "morningbrew.com", "theskim.com", "dailymail.com", "cnn.com", "foxnews.com",
]);

const BLOCKED_EMAIL_PATTERNS = [
  /^no[-_]?reply@/i, /^noreply@/i, /^do[-_]?not[-_]?reply@/i,
  /^mailer[-_]?daemon@/i, /^postmaster@/i, /^bounce[s]?@/i,
  /^newsletter[s]?@/i, /^notification[s]?@/i, /^alert[s]?@/i,
  /^update[s]?@/i, /^news@/i, /^info@/i, /^support@/i, /^help@/i,
  /^billing@/i, /^invoice[s]?@/i, /^receipt[s]?@/i, /^order[s]?@/i,
  /^shipping@/i, /^tracking@/i, /^confirm(ation)?@/i, /^verify@/i,
  /^security@/i, /^account@/i, /^team@/i, /^hello@/i, /^hi@/i,
  /^contact@/i, /^feedback@/i, /^survey[s]?@/i, /^promo(tion)?[s]?@/i,
  /^marketing@/i, /^sales@/i, /^deals@/i, /^offer[s]?@/i,
  /^discount[s]?@/i, /^welcome@/i, /^onboarding@/i, /^digest@/i,
  /^weekly@/i, /^daily@/i, /^monthly@/i,
];

// ============================================
// DUPLICATE DETECTION
// ============================================

type ExistingContact = {
  id: string;
  name: string;
  email: string | null;
  emails: string[];
};

// Normalize name for comparison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Remove special chars
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
}

// Extract name parts for comparison
function getNameParts(name: string): { first: string; last: string; full: string } {
  const normalized = normalizeName(name);
  const parts = normalized.split(" ").filter(Boolean);
  return {
    first: parts[0] || "",
    last: parts[parts.length - 1] || "",
    full: normalized,
  };
}

// Calculate similarity between two strings (0-1)
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Levenshtein distance based similarity
  const matrix: number[][] = [];
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
}

// Check if two names likely refer to same person
function areNamesSimilar(name1: string, name2: string): { similar: boolean; confidence: number; reason: string } {
  const parts1 = getNameParts(name1);
  const parts2 = getNameParts(name2);

  // Exact match
  if (parts1.full === parts2.full) {
    return { similar: true, confidence: 1, reason: "Exact name match" };
  }

  // Same last name + similar first name (Matt vs Matthew)
  if (parts1.last === parts2.last && parts1.last.length > 1) {
    const firstSimilarity = stringSimilarity(parts1.first, parts2.first);
    if (firstSimilarity > 0.6) {
      return { similar: true, confidence: 0.9, reason: `Same last name, similar first name` };
    }
    // First name starts with same letters (nickname detection)
    if (parts1.first.length >= 2 && parts2.first.length >= 2) {
      const shorter = parts1.first.length < parts2.first.length ? parts1.first : parts2.first;
      const longer = parts1.first.length >= parts2.first.length ? parts1.first : parts2.first;
      if (longer.startsWith(shorter.substring(0, 2))) {
        return { similar: true, confidence: 0.85, reason: "Same last name, likely nickname" };
      }
    }
  }

  // High overall similarity
  const fullSimilarity = stringSimilarity(parts1.full, parts2.full);
  if (fullSimilarity > 0.85) {
    return { similar: true, confidence: fullSimilarity, reason: "Very similar names" };
  }

  return { similar: false, confidence: 0, reason: "" };
}

// Check if emails suggest same person
function areEmailsSamePerson(email1: string, email2: string): { similar: boolean; confidence: number; reason: string } {
  const [local1, domain1] = email1.toLowerCase().split("@");
  const [local2, domain2] = email2.toLowerCase().split("@");

  // Same email
  if (email1.toLowerCase() === email2.toLowerCase()) {
    return { similar: true, confidence: 1, reason: "Same email" };
  }

  // Same domain (likely same company/person)
  if (domain1 === domain2) {
    const localSimilarity = stringSimilarity(local1, local2);
    if (localSimilarity > 0.7) {
      return { similar: true, confidence: 0.9, reason: "Same domain, similar username" };
    }
  }

  // Similar local parts across domains (mpaller@gmail.com vs mpaller@work.com)
  const localSimilarity = stringSimilarity(local1, local2);
  if (localSimilarity > 0.85) {
    return { similar: true, confidence: 0.8, reason: "Very similar email usernames" };
  }

  return { similar: false, confidence: 0, reason: "" };
}

// Find potential duplicates
function findDuplicates(
  newContacts: Array<{ name: string; email: string; company: string; subject: string }>,
  existingContacts: ExistingContact[]
): Map<string, { type: "existing" | "scan"; matches: Array<{ name: string; email: string; confidence: number; reason: string; existingId?: string }> }> {
  const duplicates = new Map<string, { type: "existing" | "scan"; matches: any[] }>();

  // Check against existing contacts in Second Brain
  for (const newContact of newContacts) {
    const matches: any[] = [];

    for (const existing of existingContacts) {
      // Check name similarity
      const nameSim = areNamesSimilar(newContact.name, existing.name);

      // Check email similarity
      let emailSim = { similar: false, confidence: 0, reason: "" };
      if (existing.email) {
        emailSim = areEmailsSamePerson(newContact.email, existing.email);
      }
      for (const existingEmail of existing.emails) {
        const sim = areEmailsSamePerson(newContact.email, existingEmail);
        if (sim.confidence > emailSim.confidence) {
          emailSim = sim;
        }
      }

      // If either name or email matches strongly
      if (nameSim.similar || emailSim.similar) {
        const confidence = Math.max(nameSim.confidence, emailSim.confidence);
        const reason = nameSim.confidence > emailSim.confidence ? nameSim.reason : emailSim.reason;
        matches.push({
          name: existing.name,
          email: existing.email || existing.emails[0] || "No email",
          confidence,
          reason,
          existingId: existing.id,
        });
      }
    }

    if (matches.length > 0) {
      duplicates.set(newContact.email, { type: "existing", matches });
    }
  }

  // Check for duplicates within the scan itself
  for (let i = 0; i < newContacts.length; i++) {
    for (let j = i + 1; j < newContacts.length; j++) {
      const contact1 = newContacts[i];
      const contact2 = newContacts[j];

      const nameSim = areNamesSimilar(contact1.name, contact2.name);
      const emailSim = areEmailsSamePerson(contact1.email, contact2.email);

      if (nameSim.similar || emailSim.similar) {
        const confidence = Math.max(nameSim.confidence, emailSim.confidence);
        const reason = nameSim.confidence > emailSim.confidence ? nameSim.reason : emailSim.reason;

        // Add to both contacts' duplicate lists
        if (!duplicates.has(contact1.email)) {
          duplicates.set(contact1.email, { type: "scan", matches: [] });
        }
        duplicates.get(contact1.email)!.matches.push({
          name: contact2.name,
          email: contact2.email,
          confidence,
          reason,
        });

        if (!duplicates.has(contact2.email)) {
          duplicates.set(contact2.email, { type: "scan", matches: [] });
        }
        duplicates.get(contact2.email)!.matches.push({
          name: contact1.name,
          email: contact1.email,
          confidence,
          reason,
        });
      }
    }
  }

  return duplicates;
}

// ============================================
// LAYER 2: Pattern Detection
// ============================================
function isBlockedByPatterns(email: string, name: string): boolean {
  const emailLower = email.toLowerCase();
  const nameLower = name.toLowerCase();

  for (const pattern of BLOCKED_EMAIL_PATTERNS) {
    if (pattern.test(emailLower)) return true;
  }

  const domain = emailLower.split("@")[1];
  if (domain && BLOCKED_DOMAINS.has(domain)) return true;

  // Check for marketing subdomains
  if (domain && (
    domain.startsWith("mail.") || domain.startsWith("email.") ||
    domain.startsWith("newsletter.") || domain.startsWith("news.") ||
    domain.startsWith("marketing.") || domain.startsWith("promo.") ||
    domain.startsWith("engage.") || domain.startsWith("e.") ||
    domain.startsWith("m.") || domain.startsWith("p.") ||
    domain.startsWith("t.") || domain.startsWith("go.") ||
    domain.startsWith("click.") || domain.startsWith("links.") ||
    domain.startsWith("track.") || domain.startsWith("info.") ||
    domain.startsWith("offers.") || domain.startsWith("deals.") ||
    domain.startsWith("mailcenter.") || domain.startsWith("messages.")
  )) return true;

  // Check if the root domain (without subdomain) is blocked
  if (domain) {
    const domainParts = domain.split(".");
    if (domainParts.length > 2) {
      const rootDomain = domainParts.slice(-2).join(".");
      if (BLOCKED_DOMAINS.has(rootDomain)) return true;
    }
  }

  if (
    nameLower.includes("newsletter") || nameLower.includes("no reply") ||
    nameLower.includes("noreply") || nameLower.includes("do not reply") ||
    nameLower.includes("notification") || nameLower.includes("automated") ||
    nameLower.includes("auto-") || nameLower.includes("mailer")
  ) return true;

  return false;
}

// ============================================
// LAYER 3: AI Classification
// ============================================
async function classifyContactsWithAI(contacts: Array<{
  name: string;
  email: string;
  company: string;
  subject: string;
}>): Promise<Array<{
  name: string;
  email: string;
  company: string;
  subject: string;
  classification: "real_person" | "marketing" | "automated" | "uncertain";
  confidence: number;
  reason: string;
}>> {
  if (contacts.length === 0) return [];

  const batchSize = 20;
  const results: any[] = [];

  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);

    const prompt = `You are an intelligent email contact classifier. Analyze each email sender and classify them.

For each contact, determine if they are:
1. "real_person" - An actual human being you might want a relationship with
2. "marketing" - Marketing emails, newsletters, promotional content
3. "automated" - Automated system emails, receipts, notifications
4. "uncertain" - Can't determine with confidence

CONTACTS TO CLASSIFY:
${batch.map((c, idx) => `${idx + 1}. Name: "${c.name}" | Email: ${c.email} | Subject: "${c.subject}"`).join("\n")}

Respond with a JSON array:
[{"index": 1, "classification": "real_person", "confidence": 0.95, "reason": "Brief reason"}]

Respond ONLY with the JSON array.`;

    try {
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      let responseText = completion.choices[0].message.content || "[]";
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      const classifications = JSON.parse(responseText);

      for (const classification of classifications) {
        const contact = batch[classification.index - 1];
        if (contact) {
          results.push({
            ...contact,
            classification: classification.classification,
            confidence: classification.confidence,
            reason: classification.reason,
          });
        }
      }
    } catch (err) {
      console.error("AI classification error:", err);
      for (const contact of batch) {
        results.push({
          ...contact,
          classification: "uncertain",
          confidence: 0.5,
          reason: "AI classification failed",
        });
      }
    }
  }

  return results;
}

// ============================================
// Helper Functions
// ============================================
function parseEmail(email: string): { name: string; domain: string; company: string } {
  const [localPart, domain] = email.split("@");
  const nameParts = localPart
    .replace(/[._]/g, " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
  const name = nameParts.join(" ");
  const companyName = domain
    ? domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1)
    : "";
  return { name, domain: domain || "", company: companyName };
}

function parseFromField(from: string): { name: string; email: string } {
  const match = from.match(/^(?:"?([^"]*)"?\s*)?<?([^>]+@[^>]+)>?$/);
  if (match) {
    const [, name, email] = match;
    if (name && name.trim()) {
      return { name: name.trim(), email: email.toLowerCase() };
    }
    const parsed = parseEmail(email);
    return { name: parsed.name, email: email.toLowerCase() };
  }
  return { name: from, email: from.toLowerCase() };
}

async function getAllExistingContacts(userId: string): Promise<ExistingContact[]> {
  try {
    const contacts = await getContacts(userId);
    return contacts.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email || null,
      emails: c.email ? [c.email.toLowerCase()] : []
    }));
  } catch (err) {
    console.error("Error fetching existing contacts:", err);
    return [];
  }
}

async function fetchEmailsWithToken(
  accessToken: string,
  maxResults: number
): Promise<{ messages: any[] }> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const messagesResponse = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: "in:inbox",
  });

  return { messages: messagesResponse.data.messages || [] };
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
    const { accessToken, refreshToken, maxResults = 50 } = body;

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: "Missing access token" },
        { status: 401 }
      );
    }

    let messages: any[] = [];
    let newAccessToken: string | null = null;

    try {
      console.log(`📧 Fetching last ${maxResults} emails...`);
      const result = await fetchEmailsWithToken(accessToken, maxResults);
      messages = result.messages;
    } catch (err: any) {
      if (err.status === 401 && refreshToken) {
        console.log("🔄 Access token expired, refreshing...");
        const refreshed = await refreshAccessToken(refreshToken);

        if (refreshed) {
          newAccessToken = refreshed.accessToken;
          const result = await fetchEmailsWithToken(newAccessToken, maxResults);
          messages = result.messages;
        } else {
          return NextResponse.json({
            ok: false,
            error: "Token expired and refresh failed. Please reconnect Gmail.",
            needsReconnect: true,
          }, { status: 401 });
        }
      } else {
        throw err;
      }
    }

    console.log(`📬 Found ${messages.length} messages`);

    // Get existing contacts for duplicate detection
    const existingContacts = await getAllExistingContacts(userId);
    const existingEmails = new Set(existingContacts.flatMap((c) => c.emails));
    console.log(`📇 Found ${existingContacts.length} existing contacts in Supabase`);

    const workingToken = newAccessToken || accessToken;
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: workingToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const senderMap = new Map<string, { name: string; email: string; subject: string; date: string }>();
    let blockedByLayer1 = 0;

    for (const message of messages) {
      if (!message.id) continue;
      try {
        const msgDetail = await gmail.users.messages.get({
          userId: "me",
          id: message.id,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        });

        const headers = msgDetail.data.payload?.headers || [];
        const fromHeader = headers.find((h) => h.name === "From")?.value || "";
        const subjectHeader = headers.find((h) => h.name === "Subject")?.value || "(No Subject)";
        const dateHeader = headers.find((h) => h.name === "Date")?.value || "";

        const { name, email } = parseFromField(fromHeader);

        if (senderMap.has(email)) continue;

        if (isBlockedByPatterns(email, name)) {
          blockedByLayer1++;
          continue;
        }

        senderMap.set(email, { name, email, subject: subjectHeader, date: dateHeader });
      } catch (err) {
        console.error(`Error fetching message ${message.id}:`, err);
      }
    }

    console.log(`🚫 Blocked ${blockedByLayer1} by pattern matching`);

    // Filter out exact email matches
    const potentialContacts: Array<{
      name: string;
      email: string;
      company: string;
      subject: string;
    }> = [];

    for (const [email, data] of senderMap) {
      if (!existingEmails.has(email.toLowerCase())) {
        const { company } = parseEmail(email);
        potentialContacts.push({
          name: data.name,
          email: data.email,
          company,
          subject: data.subject,
        });
      }
    }

    console.log(`🆕 ${potentialContacts.length} potential new contacts`);

    // DUPLICATE DETECTION
    console.log("🔍 Checking for duplicates...");
    const duplicates = findDuplicates(potentialContacts, existingContacts);
    console.log(`⚠️ Found ${duplicates.size} potential duplicates`);

    // AI Classification
    let classifiedContacts: any[] = [];

    if (potentialContacts.length > 0 && OPENAI_API_KEY) {
      console.log("🧠 Running AI classification...");
      classifiedContacts = await classifyContactsWithAI(potentialContacts);
    } else {
      classifiedContacts = potentialContacts.map((c) => ({
        ...c,
        classification: "uncertain",
        confidence: 0.5,
        reason: "AI classification not available",
      }));
    }

    // Add duplicate info to contacts
    const contactsWithDuplicates = classifiedContacts.map((contact) => {
      const dupInfo = duplicates.get(contact.email);
      return {
        ...contact,
        hasDuplicate: !!dupInfo,
        duplicateType: dupInfo?.type || null,
        duplicateMatches: dupInfo?.matches || [],
      };
    });

    // Separate by classification
    const realPeople = contactsWithDuplicates.filter((c) => c.classification === "real_person");
    const marketing = contactsWithDuplicates.filter((c) => c.classification === "marketing");
    const automated = contactsWithDuplicates.filter((c) => c.classification === "automated");
    const uncertain = contactsWithDuplicates.filter((c) => c.classification === "uncertain");

    // Separate duplicates - BUT only for real people and uncertain, NOT marketing/automated
    const withDuplicates = contactsWithDuplicates.filter(
      (c) => c.hasDuplicate && (c.classification === "real_person" || c.classification === "uncertain")
    );
    const withoutDuplicates = contactsWithDuplicates.filter((c) => !c.hasDuplicate);

    console.log(`✅ Real people: ${realPeople.length}`);
    console.log(`⚠️ Possible duplicates: ${withDuplicates.length}`);

    return NextResponse.json({
      ok: true,
      totalScanned: messages.length,
      uniqueSenders: senderMap.size + blockedByLayer1,
      blockedByPatterns: blockedByLayer1,
      existingContacts: existingContacts.length,
      realPeople: realPeople.filter((c) => !c.hasDuplicate),
      marketing,
      automated,
      uncertain: uncertain.filter((c) => !c.hasDuplicate),
      possibleDuplicates: withDuplicates,
      summary: {
        realPeople: realPeople.filter((c) => !c.hasDuplicate).length,
        marketing: marketing.length,
        automated: automated.length,
        uncertain: uncertain.filter((c) => !c.hasDuplicate).length,
        possibleDuplicates: withDuplicates.length,
      },
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