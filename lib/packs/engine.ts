/**
 * Business / Industry Packs v1
 * lib/packs/engine.ts
 * 
 * Pre-configured setups for different professions and industries
 */

import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { createTeaching } from "@/lib/teaching/engine";
import { createPersonaFromTemplate } from "@/lib/personas/engine";
import { createCampaignFromTemplate } from "@/lib/campaigns/engine";

// ============================================
// TYPES
// ============================================

export interface IndustryPack {
  id: string;
  name: string;
  description: string;
  icon: string;
  industry: string;
  roles: string[];
  features: PackFeature[];
  teachings: PackTeaching[];
  workflows: PackWorkflow[];
  kpis: PackKPI[];
  integrations: string[];
}

export interface PackFeature {
  name: string;
  description: string;
  enabled: boolean;
}

export interface PackTeaching {
  type: string;
  category: string;
  instruction: string;
}

export interface PackWorkflow {
  name: string;
  description: string;
  steps: string[];
  automatable: boolean;
}

export interface PackKPI {
  name: string;
  metric: string;
  target?: number;
  unit: string;
}

export interface UserPack {
  id: string;
  userId: string;
  packId: string;
  packName: string;
  installedAt: Date;
  customizations: Record<string, any>;
  isActive: boolean;
}

// ============================================
// INDUSTRY PACKS
// ============================================

export const INDUSTRY_PACKS: IndustryPack[] = [
  {
    id: "commercial-lending",
    name: "Commercial Loan Officer",
    description: "Optimized for commercial lending professionals",
    icon: "🏦",
    industry: "Banking & Finance",
    roles: ["Loan Officer", "Relationship Manager", "Credit Analyst"],
    features: [
      { name: "Deal Pipeline Tracking", description: "Track loans from application to close", enabled: true },
      { name: "Borrower Relationship Management", description: "Manage borrower touchpoints", enabled: true },
      { name: "Document Checklist Automation", description: "Auto-generate doc requirements", enabled: true },
      { name: "Rate & Term Comparisons", description: "Quick rate calculations", enabled: true },
    ],
    teachings: [
      { type: "rule", category: "communication", instruction: "Always maintain compliance with banking regulations in communications" },
      { type: "preference", category: "formatting", instruction: "Use formal, professional tone in all borrower correspondence" },
      { type: "context", category: "workflow", instruction: "When discussing loans, always consider credit risk factors" },
      { type: "template", category: "email", instruction: "Include loan number and borrower name in subject lines" },
    ],
    workflows: [
      { name: "New Loan Application", description: "Process new commercial loan applications", steps: ["Initial intake", "Document collection", "Credit analysis", "Committee presentation", "Approval/Decline", "Closing"], automatable: true },
      { name: "Annual Review", description: "Conduct annual borrower reviews", steps: ["Financial statement collection", "Covenant compliance check", "Risk rating update", "Relationship meeting"], automatable: true },
      { name: "Pipeline Management", description: "Weekly pipeline review", steps: ["Update deal statuses", "Identify bottlenecks", "Forecast closings", "Report to management"], automatable: false },
    ],
    kpis: [
      { name: "Loans Closed", metric: "count", target: 5, unit: "per month" },
      { name: "Pipeline Value", metric: "currency", unit: "USD" },
      { name: "Average Time to Close", metric: "days", target: 45, unit: "days" },
      { name: "Borrower Retention Rate", metric: "percentage", target: 90, unit: "%" },
    ],
    integrations: ["email", "calendar", "crm"],
  },
  {
    id: "sales-executive",
    name: "Sales Executive",
    description: "Built for B2B sales professionals",
    icon: "💼",
    industry: "Sales",
    roles: ["Account Executive", "Sales Manager", "Business Development"],
    features: [
      { name: "Deal Tracking", description: "Track opportunities through pipeline", enabled: true },
      { name: "Contact Intelligence", description: "AI-powered prospect research", enabled: true },
      { name: "Meeting Prep", description: "Auto-generate meeting briefs", enabled: true },
      { name: "Follow-up Sequences", description: "Automated outreach campaigns", enabled: true },
    ],
    teachings: [
      { type: "rule", category: "communication", instruction: "Always personalize outreach with specific company/person details" },
      { type: "preference", category: "tone", instruction: "Be consultative rather than pushy in sales conversations" },
      { type: "shortcut", category: "workflow", instruction: "When I say 'prep for [company]', generate a meeting brief with recent news and talking points" },
      { type: "context", category: "follow-up", instruction: "After demos, suggest next steps within 24 hours" },
    ],
    workflows: [
      { name: "Prospect Research", description: "Research new prospects", steps: ["Company overview", "Key contacts", "Recent news", "Pain points", "Competition"], automatable: true },
      { name: "Deal Progression", description: "Move deals through pipeline", steps: ["Discovery call", "Demo", "Proposal", "Negotiation", "Close"], automatable: false },
      { name: "Quarterly Business Review", description: "Prepare QBR for accounts", steps: ["Usage metrics", "ROI analysis", "Expansion opportunities", "Renewal status"], automatable: true },
    ],
    kpis: [
      { name: "Pipeline Generated", metric: "currency", unit: "USD" },
      { name: "Deals Closed", metric: "count", unit: "per quarter" },
      { name: "Win Rate", metric: "percentage", target: 30, unit: "%" },
      { name: "Average Deal Size", metric: "currency", unit: "USD" },
    ],
    integrations: ["email", "calendar", "crm", "linkedin"],
  },
  {
    id: "startup-founder",
    name: "Startup Founder",
    description: "For early-stage founders wearing multiple hats",
    icon: "🚀",
    industry: "Startups",
    roles: ["Founder", "CEO", "Co-founder"],
    features: [
      { name: "Investor Relations", description: "Track investor conversations and follow-ups", enabled: true },
      { name: "Team Coordination", description: "Manage across departments", enabled: true },
      { name: "Fundraising Pipeline", description: "Track fundraising progress", enabled: true },
      { name: "Metrics Dashboard", description: "Key startup metrics at a glance", enabled: true },
    ],
    teachings: [
      { type: "rule", category: "prioritization", instruction: "Focus on tasks that directly impact runway or growth metrics" },
      { type: "preference", category: "communication", instruction: "Keep investor updates concise with clear metrics and asks" },
      { type: "context", category: "time", instruction: "Protect deep work time in mornings for strategic thinking" },
      { type: "template", category: "investor", instruction: "Monthly investor updates: metrics, highlights, lowlights, asks" },
    ],
    workflows: [
      { name: "Fundraising", description: "Manage fundraising process", steps: ["Target list", "Warm intros", "First meetings", "Partner meetings", "Due diligence", "Term sheet", "Close"], automatable: false },
      { name: "Weekly All-Hands", description: "Prepare weekly team updates", steps: ["Metrics review", "Team updates", "Priorities", "Blockers", "Wins"], automatable: true },
      { name: "Board Meeting Prep", description: "Prepare for board meetings", steps: ["Deck update", "Metrics compilation", "Discussion topics", "Asks"], automatable: true },
    ],
    kpis: [
      { name: "MRR", metric: "currency", unit: "USD" },
      { name: "Runway", metric: "months", target: 18, unit: "months" },
      { name: "Burn Rate", metric: "currency", unit: "USD/month" },
      { name: "Customer Growth", metric: "percentage", unit: "% MoM" },
    ],
    integrations: ["email", "calendar", "notion", "slack"],
  },
  {
    id: "real-estate-agent",
    name: "Real Estate Agent",
    description: "For residential and commercial real estate professionals",
    icon: "🏠",
    industry: "Real Estate",
    roles: ["Real Estate Agent", "Broker", "Property Manager"],
    features: [
      { name: "Lead Management", description: "Track and nurture buyer/seller leads", enabled: true },
      { name: "Showing Scheduler", description: "Coordinate property showings", enabled: true },
      { name: "Transaction Tracker", description: "Monitor deals from contract to close", enabled: true },
      { name: "Market Updates", description: "Stay informed on market trends", enabled: true },
    ],
    teachings: [
      { type: "rule", category: "response", instruction: "Respond to new leads within 5 minutes during business hours" },
      { type: "preference", category: "communication", instruction: "Always include property photos and virtual tour links" },
      { type: "shortcut", category: "workflow", instruction: "When I say 'prep for showing', create checklist and talking points" },
      { type: "context", category: "follow-up", instruction: "Follow up with showing attendees within 24 hours" },
    ],
    workflows: [
      { name: "Buyer Journey", description: "Guide buyers from search to close", steps: ["Needs assessment", "Pre-approval", "Showings", "Offer", "Inspection", "Closing"], automatable: false },
      { name: "Listing Launch", description: "Launch new listings", steps: ["Pricing analysis", "Staging", "Photography", "MLS entry", "Marketing", "Open house"], automatable: true },
      { name: "Past Client Nurture", description: "Stay in touch with past clients", steps: ["Anniversary check-in", "Market update", "Referral request"], automatable: true },
    ],
    kpis: [
      { name: "Listings Taken", metric: "count", unit: "per month" },
      { name: "Deals Closed", metric: "count", unit: "per month" },
      { name: "Commission Volume", metric: "currency", unit: "USD" },
      { name: "Days on Market", metric: "days", target: 30, unit: "days" },
    ],
    integrations: ["email", "calendar", "mls", "zillow"],
  },
  {
    id: "consultant",
    name: "Management Consultant",
    description: "For strategy and management consultants",
    icon: "📊",
    industry: "Consulting",
    roles: ["Consultant", "Senior Consultant", "Manager", "Partner"],
    features: [
      { name: "Client Management", description: "Track engagements and deliverables", enabled: true },
      { name: "Utilization Tracking", description: "Monitor billable hours", enabled: true },
      { name: "Research Assistant", description: "AI-powered research and analysis", enabled: true },
      { name: "Deliverable Templates", description: "Pre-built frameworks and templates", enabled: true },
    ],
    teachings: [
      { type: "rule", category: "work", instruction: "Structure all analyses using MECE principles" },
      { type: "preference", category: "formatting", instruction: "Use pyramid principle for all written communication" },
      { type: "template", category: "deliverable", instruction: "Slide structure: title as takeaway, evidence below" },
      { type: "context", category: "client", instruction: "Always frame recommendations in terms of client impact and ROI" },
    ],
    workflows: [
      { name: "New Engagement", description: "Start new client engagement", steps: ["Scoping", "Team staffing", "Kickoff", "Workplan", "Execution", "Delivery"], automatable: false },
      { name: "Weekly Status", description: "Weekly client status update", steps: ["Progress review", "Issues/risks", "Next week plan", "Client meeting"], automatable: true },
      { name: "Knowledge Capture", description: "Document learnings", steps: ["Case summary", "Key insights", "Reusable materials", "Database update"], automatable: true },
    ],
    kpis: [
      { name: "Utilization Rate", metric: "percentage", target: 80, unit: "%" },
      { name: "Client Satisfaction", metric: "score", target: 9, unit: "/10" },
      { name: "Revenue Generated", metric: "currency", unit: "USD" },
      { name: "Proposals Won", metric: "percentage", target: 40, unit: "%" },
    ],
    integrations: ["email", "calendar", "powerpoint", "excel"],
  },
];

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get all available packs
 */
export function getAvailablePacks(): IndustryPack[] {
  return INDUSTRY_PACKS;
}

/**
 * Get pack by ID
 */
export function getPackById(packId: string): IndustryPack | null {
  return INDUSTRY_PACKS.find((p) => p.id === packId) || null;
}

/**
 * Get packs by industry
 */
export function getPacksByIndustry(industry: string): IndustryPack[] {
  return INDUSTRY_PACKS.filter((p) => p.industry.toLowerCase() === industry.toLowerCase());
}

/**
 * Install pack for user
 */
export async function installPack(
  userId: string,
  packId: string,
  customizations?: Record<string, any>
): Promise<UserPack | null> {
  const pack = getPackById(packId);
  if (!pack) return null;

  const now = new Date().toISOString();

  // Check if already installed
  const { data: existing } = await getSupabaseAdminRuntimeClient()
    .from("user_packs")
    .select("*")
    .eq("user_id", userId)
    .eq("pack_id", packId)
    .single();

  if (existing) {
    // Reactivate
    await getSupabaseAdminRuntimeClient()
      .from("user_packs")
      .update({ is_active: true, customizations })
      .eq("id", existing.id);
    return mapUserPack({ ...existing, is_active: true, customizations });
  }

  // Install new
  const { data, error } = await getSupabaseAdminRuntimeClient()
    .from("user_packs")
    .insert({
      user_id: userId,
      pack_id: packId,
      pack_name: pack.name,
      installed_at: now,
      customizations: customizations || {},
      is_active: true,
    })
    .select()
    .single();

  if (error || !data) return null;

  // Apply pack teachings
  for (const teaching of pack.teachings) {
    await createTeaching(userId, {
      type: teaching.type as any,
      category: teaching.category,
      instruction: teaching.instruction,
      priority: 6,
    });
  }

  return mapUserPack(data);
}

/**
 * Uninstall pack
 */
export async function uninstallPack(userId: string, packId: string): Promise<boolean> {
  const { error } = await getSupabaseAdminRuntimeClient()
    .from("user_packs")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("pack_id", packId);

  return !error;
}

/**
 * Get user's installed packs
 */
export async function getUserPacks(userId: string): Promise<UserPack[]> {
  const { data } = await getSupabaseAdminRuntimeClient()
    .from("user_packs")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("installed_at", { ascending: false });

  return (data || []).map(mapUserPack);
}

/**
 * Get pack recommendations based on user data
 */
export async function getPackRecommendations(userId: string): Promise<IndustryPack[]> {
  // Get user's job/role from memory or profile
  const { data: memories } = await getSupabaseAdminRuntimeClient()
    .from("memories")
    .select("content")
    .eq("user_id", userId)
    .in("type", ["fact", "preference"])
    .ilike("content", "%work%")
    .limit(10);

  const workContext = (memories || []).map((m) => m.content).join(" ").toLowerCase();

  // Simple keyword matching for recommendations
  const recommendations: IndustryPack[] = [];

  for (const pack of INDUSTRY_PACKS) {
    const keywords = [
      pack.industry.toLowerCase(),
      pack.name.toLowerCase(),
      ...pack.roles.map((r) => r.toLowerCase()),
    ];

    if (keywords.some((kw) => workContext.includes(kw))) {
      recommendations.push(pack);
    }
  }

  // If no matches, return top 3 popular packs
  if (recommendations.length === 0) {
    return INDUSTRY_PACKS.slice(0, 3);
  }

  return recommendations;
}

/**
 * Get KPIs for user's active packs
 */
export async function getPackKPIs(userId: string): Promise<PackKPI[]> {
  const userPacks = await getUserPacks(userId);
  const kpis: PackKPI[] = [];

  for (const up of userPacks) {
    const pack = getPackById(up.packId);
    if (pack) {
      kpis.push(...pack.kpis);
    }
  }

  return kpis;
}

/**
 * Get workflows for user's active packs
 */
export async function getPackWorkflows(userId: string): Promise<PackWorkflow[]> {
  const userPacks = await getUserPacks(userId);
  const workflows: PackWorkflow[] = [];

  for (const up of userPacks) {
    const pack = getPackById(up.packId);
    if (pack) {
      workflows.push(...pack.workflows);
    }
  }

  return workflows;
}

// ============================================
// HELPERS
// ============================================

function mapUserPack(row: any): UserPack {
  return {
    id: row.id,
    userId: row.user_id,
    packId: row.pack_id,
    packName: row.pack_name,
    installedAt: new Date(row.installed_at),
    customizations: row.customizations || {},
    isActive: row.is_active,
  };
}
