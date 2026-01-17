/**
 * Butler Campaigns v1
 * lib/campaigns/engine.ts
 * 
 * Multi-step automated campaigns for relationship nurturing, follow-ups, and outreach
 */

import { supabaseAdmin } from "@/lib/supabase";

import { getOpenAI } from "@/lib/llm/client";

// Removed global openai init

// ============================================
// TYPES
// ============================================

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: "nurture" | "followup" | "outreach" | "reactivation" | "custom";
  status: "draft" | "active" | "paused" | "completed";
  targetCriteria?: Record<string, any>;
  steps: CampaignStep[];
  enrolledCount: number;
  completedCount: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignStep {
  id: string;
  order: number;
  type: "email" | "task" | "wait" | "condition";
  name: string;
  config: {
    // Email
    subject?: string;
    template?: string;
    // Task
    taskTitle?: string;
    taskDescription?: string;
    // Wait
    waitDays?: number;
    // Condition
    condition?: string;
  };
}

export interface CampaignEnrollment {
  id: string;
  campaignId: string;
  userId: string;
  relationshipId?: string;
  contactEmail?: string;
  contactName?: string;
  currentStepIndex: number;
  status: "active" | "completed" | "paused" | "exited";
  nextStepAt?: Date;
  completedSteps: string[];
  startedAt: Date;
  completedAt?: Date;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  type: Campaign["type"];
  steps: CampaignStep[];
}

// ============================================
// CAMPAIGN TEMPLATES
// ============================================

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "nurture-30-60-90",
    name: "30-60-90 Day Nurture",
    description: "Keep relationships warm with periodic check-ins",
    type: "nurture",
    steps: [
      { id: "1", order: 1, type: "email", name: "Initial Check-in", config: { subject: "Quick check-in", template: "nurture_checkin" } },
      { id: "2", order: 2, type: "wait", name: "Wait 30 days", config: { waitDays: 30 } },
      { id: "3", order: 3, type: "email", name: "Value Share", config: { subject: "Thought you might find this useful", template: "nurture_value" } },
      { id: "4", order: 4, type: "wait", name: "Wait 30 days", config: { waitDays: 30 } },
      { id: "5", order: 5, type: "task", name: "Schedule Call", config: { taskTitle: "Schedule call with {name}", taskDescription: "It's been 60 days - time to reconnect" } },
      { id: "6", order: 6, type: "wait", name: "Wait 30 days", config: { waitDays: 30 } },
      { id: "7", order: 7, type: "email", name: "Quarter Check-in", config: { subject: "Quarterly hello", template: "nurture_quarterly" } },
    ],
  },
  {
    id: "followup-sequence",
    name: "Follow-up Sequence",
    description: "Systematic follow-up after initial contact",
    type: "followup",
    steps: [
      { id: "1", order: 1, type: "wait", name: "Wait 3 days", config: { waitDays: 3 } },
      { id: "2", order: 2, type: "email", name: "First Follow-up", config: { subject: "Following up", template: "followup_first" } },
      { id: "3", order: 3, type: "wait", name: "Wait 5 days", config: { waitDays: 5 } },
      { id: "4", order: 4, type: "email", name: "Second Follow-up", config: { subject: "Checking in again", template: "followup_second" } },
      { id: "5", order: 5, type: "wait", name: "Wait 7 days", config: { waitDays: 7 } },
      { id: "6", order: 6, type: "task", name: "Final Decision", config: { taskTitle: "Decide on {name}", taskDescription: "No response - mark as cold or try different approach" } },
    ],
  },
  {
    id: "reactivation",
    name: "Reactivation Campaign",
    description: "Re-engage cold relationships",
    type: "reactivation",
    steps: [
      { id: "1", order: 1, type: "email", name: "Reconnect", config: { subject: "It's been a while!", template: "reactivation_reconnect" } },
      { id: "2", order: 2, type: "wait", name: "Wait 7 days", config: { waitDays: 7 } },
      { id: "3", order: 3, type: "condition", name: "Check Response", config: { condition: "responded" } },
      { id: "4", order: 4, type: "email", name: "Value Offer", config: { subject: "Something that might help", template: "reactivation_value" } },
      { id: "5", order: 5, type: "wait", name: "Wait 14 days", config: { waitDays: 14 } },
      { id: "6", order: 6, type: "task", name: "Final Outreach", config: { taskTitle: "Call {name}", taskDescription: "Last attempt to reconnect" } },
    ],
  },
];

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get all campaigns for a user
 */
export async function getCampaigns(userId: string): Promise<Campaign[]> {
  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapCampaign);
}

/**
 * Get a single campaign
 */
export async function getCampaign(userId: string, id: string): Promise<Campaign | null> {
  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return mapCampaign(data);
}

/**
 * Create a campaign from template
 */
export async function createCampaignFromTemplate(
  userId: string,
  templateId: string,
  name: string,
  description?: string
): Promise<Campaign | null> {
  const template = CAMPAIGN_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .insert({
      user_id: userId,
      name,
      description: description || template.description,
      type: template.type,
      status: "draft",
      steps: template.steps,
      enrolled_count: 0,
      completed_count: 0,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error || !data) return null;
  return mapCampaign(data);
}

/**
 * Create a custom campaign
 */
export async function createCampaign(
  userId: string,
  campaign: {
    name: string;
    description?: string;
    type: Campaign["type"];
    steps: CampaignStep[];
  }
): Promise<Campaign | null> {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .insert({
      user_id: userId,
      name: campaign.name,
      description: campaign.description,
      type: campaign.type,
      status: "draft",
      steps: campaign.steps,
      enrolled_count: 0,
      completed_count: 0,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error || !data) return null;
  return mapCampaign(data);
}

/**
 * Update campaign status
 */
export async function updateCampaignStatus(
  userId: string,
  campaignId: string,
  status: Campaign["status"]
): Promise<boolean> {
  const updates: any = { status, updated_at: new Date().toISOString() };

  if (status === "active") {
    updates.started_at = new Date().toISOString();
  } else if (status === "completed") {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from("campaigns")
    .update(updates)
    .eq("user_id", userId)
    .eq("id", campaignId);

  return !error;
}

/**
 * Enroll a contact in a campaign
 */
export async function enrollInCampaign(
  userId: string,
  campaignId: string,
  contact: {
    relationshipId?: string;
    email: string;
    name: string;
  }
): Promise<CampaignEnrollment | null> {
  const campaign = await getCampaign(userId, campaignId);
  if (!campaign || campaign.status !== "active") return null;

  const now = new Date();
  const firstStep = campaign.steps[0];
  let nextStepAt = now;

  if (firstStep?.type === "wait" && firstStep.config.waitDays) {
    nextStepAt = new Date(now.getTime() + firstStep.config.waitDays * 24 * 60 * 60 * 1000);
  }

  const { data, error } = await supabaseAdmin
    .from("campaign_enrollments")
    .insert({
      campaign_id: campaignId,
      user_id: userId,
      relationship_id: contact.relationshipId,
      contact_email: contact.email,
      contact_name: contact.name,
      current_step_index: 0,
      status: "active",
      next_step_at: nextStepAt.toISOString(),
      completed_steps: [],
      started_at: now.toISOString(),
    })
    .select()
    .single();

  if (error || !data) return null;

  // Update enrolled count
  await supabaseAdmin
    .from("campaigns")
    .update({
      enrolled_count: campaign.enrolledCount + 1,
      updated_at: now.toISOString(),
    })
    .eq("id", campaignId);

  return mapEnrollment(data);
}

/**
 * Get enrollments for a campaign
 */
export async function getCampaignEnrollments(
  userId: string,
  campaignId: string
): Promise<CampaignEnrollment[]> {
  const { data, error } = await supabaseAdmin
    .from("campaign_enrollments")
    .select("*")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .order("started_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapEnrollment);
}

/**
 * Process due campaign steps (run via cron)
 */
export async function processDueCampaignSteps(): Promise<{ processed: number; errors: number }> {
  const now = new Date();

  const { data: dueEnrollments } = await supabaseAdmin
    .from("campaign_enrollments")
    .select("*, campaigns(*)")
    .eq("status", "active")
    .lte("next_step_at", now.toISOString())
    .limit(50);

  if (!dueEnrollments) return { processed: 0, errors: 0 };

  let processed = 0;
  let errors = 0;

  for (const enrollment of dueEnrollments) {
    try {
      const campaign = enrollment.campaigns;
      if (!campaign) continue;

      const steps = campaign.steps as CampaignStep[];
      const currentStep = steps[enrollment.current_step_index];

      if (!currentStep) {
        // Campaign completed
        await supabaseAdmin
          .from("campaign_enrollments")
          .update({
            status: "completed",
            completed_at: now.toISOString(),
          })
          .eq("id", enrollment.id);

        await supabaseAdmin
          .from("campaigns")
          .update({
            completed_count: (campaign.completed_count || 0) + 1,
          })
          .eq("id", campaign.id);

        processed++;
        continue;
      }

      // Execute step based on type
      await executeStep(enrollment, currentStep);

      // Move to next step
      const nextIndex = enrollment.current_step_index + 1;
      const nextStep = steps[nextIndex];
      let nextStepAt = now;

      if (nextStep?.type === "wait" && nextStep.config.waitDays) {
        nextStepAt = new Date(now.getTime() + nextStep.config.waitDays * 24 * 60 * 60 * 1000);
      }

      await supabaseAdmin
        .from("campaign_enrollments")
        .update({
          current_step_index: nextIndex,
          next_step_at: nextStepAt.toISOString(),
          completed_steps: [...(enrollment.completed_steps || []), currentStep.id],
        })
        .eq("id", enrollment.id);

      processed++;
    } catch (err) {
      console.error("[Campaigns] Step execution error:", err);
      errors++;
    }
  }

  return { processed, errors };
}

/**
 * Execute a campaign step
 */
async function executeStep(enrollment: any, step: CampaignStep): Promise<void> {
  switch (step.type) {
    case "email":
      // Create draft in delegation engine
      await supabaseAdmin.from("delegation_drafts").insert({
        user_id: enrollment.user_id,
        type: "email",
        target: enrollment.contact_email,
        target_name: enrollment.contact_name,
        subject: step.config.subject?.replace("{name}", enrollment.contact_name),
        content: `Campaign: ${step.name}`,
        status: "pending",
        source: "campaign",
        source_id: enrollment.campaign_id,
        created_at: new Date().toISOString(),
      });
      break;

    case "task":
      // Create task
      await supabaseAdmin.from("autonomy_actions").insert({
        user_id: enrollment.user_id,
        type: "task",
        title: step.config.taskTitle?.replace("{name}", enrollment.contact_name),
        description: step.config.taskDescription?.replace("{name}", enrollment.contact_name),
        priority: "medium",
        status: "pending",
        source: "campaign",
        source_id: enrollment.campaign_id,
        created_at: new Date().toISOString(),
      });
      break;

    case "wait":
      // Nothing to execute, just wait
      break;

    case "condition":
      // TODO: Implement condition checking
      break;
  }
}

/**
 * Generate personalized campaign content with AI
 */
export async function generateCampaignContent(
  userId: string,
  enrollmentId: string,
  stepType: "email" | "task"
): Promise<string | null> {
  const { data: enrollment } = await supabaseAdmin
    .from("campaign_enrollments")
    .select("*, campaigns(*)")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment) return null;

  const prompt = stepType === "email"
    ? `Write a brief, warm, professional email to ${enrollment.contact_name}. 
       This is part of a ${enrollment.campaigns.type} campaign.
       Keep it under 100 words. Be genuine and personal.`
    : `Create a task description for following up with ${enrollment.contact_name}.
       Be specific and actionable.`;

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error("[Campaigns] AI error:", err);
    return null;
  }
}

// ============================================
// MAPPERS
// ============================================

function mapCampaign(row: any): Campaign {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    type: row.type,
    status: row.status,
    targetCriteria: row.target_criteria,
    steps: row.steps || [],
    enrolledCount: row.enrolled_count || 0,
    completedCount: row.completed_count || 0,
    startedAt: row.started_at ? new Date(row.started_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapEnrollment(row: any): CampaignEnrollment {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    userId: row.user_id,
    relationshipId: row.relationship_id,
    contactEmail: row.contact_email,
    contactName: row.contact_name,
    currentStepIndex: row.current_step_index,
    status: row.status,
    nextStepAt: row.next_step_at ? new Date(row.next_step_at) : undefined,
    completedSteps: row.completed_steps || [],
    startedAt: new Date(row.started_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  };
}