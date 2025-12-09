import { NextRequest, NextResponse } from "next/server";
import {
  ContactScore,
  ScoringFactors,
  ContactTier,
  calculateContactScore,
  TIER_CONFIG,
} from "@/lib/scoring/types";

interface ScoredContact {
  id: string;
  name: string;
  company: string;
  email: string;
  score: ContactScore;
  factors: ScoringFactors;
}

// Generate mock scored contacts
function generateMockContacts(): ScoredContact[] {
  const contacts: ScoredContact[] = [
    {
      id: "c1",
      name: "Sarah Chen",
      company: "TechCorp Inc",
      email: "sarah@techcorp.com",
      factors: {
        emailsSent: 12,
        emailsReceived: 8,
        meetingsHeld: 3,
        lastContactDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        dealValue: 150000,
        dealsClosed: 1,
        dealsInProgress: 1,
        relationshipLevel: "connection",
        notes: 5,
        tags: ["enterprise", "q4-priority"],
      },
      score: null as any,
    },
    {
      id: "c2",
      name: "Michael Roberts",
      company: "Acme Corp",
      email: "mroberts@acme.com",
      factors: {
        emailsSent: 8,
        emailsReceived: 6,
        meetingsHeld: 2,
        lastContactDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        dealValue: 75000,
        dealsClosed: 0,
        dealsInProgress: 1,
        relationshipLevel: "contact",
        notes: 3,
        tags: ["mid-market"],
      },
      score: null as any,
    },
    {
      id: "c3",
      name: "Jennifer Walsh",
      company: "StartupXYZ",
      email: "jen@startupxyz.io",
      factors: {
        emailsSent: 15,
        emailsReceived: 12,
        meetingsHeld: 4,
        lastContactDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        dealValue: 50000,
        dealsClosed: 2,
        dealsInProgress: 0,
        relationshipLevel: "friend",
        notes: 8,
        tags: ["startup", "referral-source"],
      },
      score: null as any,
    },
    {
      id: "c4",
      name: "David Kim",
      company: "Enterprise Solutions",
      email: "dkim@enterprise.com",
      factors: {
        emailsSent: 4,
        emailsReceived: 2,
        meetingsHeld: 1,
        lastContactDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        dealValue: 200000,
        dealsClosed: 0,
        dealsInProgress: 1,
        relationshipLevel: "acquaintance",
        notes: 2,
        tags: ["enterprise", "cold"],
      },
      score: null as any,
    },
    {
      id: "c5",
      name: "Lisa Thompson",
      company: "GrowthCo",
      email: "lisa@growthco.com",
      factors: {
        emailsSent: 20,
        emailsReceived: 18,
        meetingsHeld: 6,
        lastContactDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        dealValue: 100000,
        dealsClosed: 3,
        dealsInProgress: 1,
        relationshipLevel: "close",
        notes: 12,
        tags: ["vip", "champion"],
      },
      score: null as any,
    },
    {
      id: "c6",
      name: "James Wilson",
      company: "MidSize LLC",
      email: "jwilson@midsize.com",
      factors: {
        emailsSent: 2,
        emailsReceived: 1,
        meetingsHeld: 0,
        lastContactDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        dealValue: 0,
        dealsClosed: 0,
        dealsInProgress: 0,
        relationshipLevel: "stranger",
        notes: 0,
        tags: [],
      },
      score: null as any,
    },
    {
      id: "c7",
      name: "Amanda Foster",
      company: "Digital First",
      email: "amanda@digitalfirst.io",
      factors: {
        emailsSent: 6,
        emailsReceived: 5,
        meetingsHeld: 2,
        lastContactDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        dealValue: 35000,
        dealsClosed: 1,
        dealsInProgress: 0,
        relationshipLevel: "contact",
        notes: 4,
        tags: ["smb"],
      },
      score: null as any,
    },
    {
      id: "c8",
      name: "Robert Chang",
      company: "Innovate Inc",
      email: "rchang@innovate.com",
      factors: {
        emailsSent: 10,
        emailsReceived: 7,
        meetingsHeld: 3,
        lastContactDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        dealValue: 80000,
        dealsClosed: 1,
        dealsInProgress: 1,
        relationshipLevel: "connection",
        notes: 6,
        tags: ["tech", "repeat-buyer"],
      },
      score: null as any,
    },
  ];

  // Calculate scores for each contact
  return contacts.map((contact) => ({
    ...contact,
    score: {
      ...calculateContactScore(contact.factors),
      contactId: contact.id,
      trend: Math.random() > 0.6 ? "rising" : Math.random() > 0.3 ? "stable" : "declining",
    },
  }));
}

function calculateStats(contacts: ScoredContact[]) {
  const tierCounts: Record<ContactTier, number> = {
    platinum: 0,
    gold: 0,
    silver: 0,
    bronze: 0,
    inactive: 0,
  };

  let totalScore = 0;
  let risingCount = 0;
  let decliningCount = 0;

  for (const contact of contacts) {
    tierCounts[contact.score.tier]++;
    totalScore += contact.score.totalScore;
    if (contact.score.trend === "rising") risingCount++;
    if (contact.score.trend === "declining") decliningCount++;
  }

  return {
    totalContacts: contacts.length,
    avgScore: Math.round(totalScore / contacts.length),
    tierBreakdown: tierCounts,
    risingCount,
    decliningCount,
    topPerformers: contacts
      .sort((a, b) => b.score.totalScore - a.score.totalScore)
      .slice(0, 5)
      .map((c) => ({ id: c.id, name: c.name, score: c.score.totalScore })),
    needsAttention: contacts
      .filter((c) => c.score.trend === "declining" || c.score.breakdown.recency < 10)
      .slice(0, 5)
      .map((c) => ({ id: c.id, name: c.name, score: c.score.totalScore, reason: c.score.breakdown.recency < 10 ? "No recent contact" : "Declining engagement" })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tier = searchParams.get("tier") as ContactTier | null;
    const sortBy = searchParams.get("sortBy") || "score";
    const limit = parseInt(searchParams.get("limit") || "50");

    let contacts = generateMockContacts();

    // Filter by tier
    if (tier) {
      contacts = contacts.filter((c) => c.score.tier === tier);
    }

    // Sort
    if (sortBy === "score") {
      contacts.sort((a, b) => b.score.totalScore - a.score.totalScore);
    } else if (sortBy === "recency") {
      contacts.sort((a, b) => b.score.breakdown.recency - a.score.breakdown.recency);
    } else if (sortBy === "dealValue") {
      contacts.sort((a, b) => b.factors.dealValue - a.factors.dealValue);
    }

    // Limit
    contacts = contacts.slice(0, limit);

    const stats = calculateStats(generateMockContacts()); // Use full list for stats

    return NextResponse.json({
      contacts,
      stats,
      filters: { tier, sortBy, limit },
    });
  } catch (error) {
    console.error("Contact scoring API error:", error);
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, contactId } = body;

    if (action === "recalculate") {
      // In production, recalculate from real data
      const contacts = generateMockContacts();
      const contact = contacts.find((c) => c.id === contactId);
      
      if (!contact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }

      return NextResponse.json({
        message: "Score recalculated",
        score: contact.score,
      });
    }

    if (action === "recalculate_all") {
      // Recalculate all contact scores
      const contacts = generateMockContacts();
      return NextResponse.json({
        message: "All scores recalculated",
        count: contacts.length,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Contact scoring API error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
