// Today Command Queue Builder
// lib/productivity/queue.ts

import { supabaseAdmin } from "@/lib/supabase";
import { WorkItem, WorkItemSource } from "./types";
import { getCurrentEmotionState } from "@/lib/emotion-os/server";
import { analyzeTask, breakIntoSteps, sequenceTasks, CognitiveProfile } from "./executive-function";
import { buildThirdBrainProductivityContext, ThirdBrainContext } from "./context-builder";

/**
 * Build today's prioritized work queue with Executive Function + Third Brain integration
 */
export async function buildTodayQueue(
  userId: string,
  options?: {
    includeThirdBrain?: boolean;
    includeEFAnalysis?: boolean;
    autonomousMode?: boolean;
  }
): Promise<WorkItem[]> {
  const {
    includeThirdBrain = true,
    includeEFAnalysis = true,
    autonomousMode = false,
  } = options || {};
  const items: WorkItem[] = [];

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // 1. Pull tasks (pending/in_progress)
  try {
    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select("id, title, description, due_date, status, priority, project_id, estimated_minutes")
      .eq("user_id", dbUserId)
      .in("status", ["pending", "in_progress"])
      .order("due_date", { ascending: true, nullsLast: true })
      .limit(20);

    if (tasks) {
      for (const task of tasks) {
        const importance = getTaskImportance(task.priority || "medium");
        const urgency = getTaskUrgency(task.due_date);
        const energy = estimateEnergyRequired(task.estimated_minutes, task.priority);

        items.push({
          id: `task_${task.id}`,
          source: "task",
          title: task.title,
          description: task.description || undefined,
          dueAt: task.due_date || null,
          projectId: task.project_id || null,
          estimatedMinutes: task.estimated_minutes || undefined,
          importanceScore: importance,
          urgencyScore: urgency,
          energyRequired: energy,
          metadata: { taskId: task.id, status: task.status },
        });
      }
    }
  } catch (err) {
    console.warn("[ProductivityQueue] Failed to load tasks:", err);
  }

  // 2. Pull email followups (from email intelligence)
  try {
    const { data: followups } = await supabaseAdmin
      .from("email_followups")
      .select("id, thread_id, subject, due_date, priority")
      .eq("user_id", dbUserId)
      .eq("status", "pending")
      .lte("due_date", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(10);

    if (followups) {
      for (const followup of followups) {
        const importance = getTaskImportance(followup.priority || "medium");
        const urgency = getTaskUrgency(followup.due_date);
        
        items.push({
          id: `email_${followup.id}`,
          source: "email_followup",
          title: `Follow up: ${followup.subject || "Email thread"}`,
          description: "Email follow-up needed",
          dueAt: followup.due_date || null,
          emailId: followup.thread_id || null,
          estimatedMinutes: 10,
          importanceScore: importance,
          urgencyScore: urgency,
          energyRequired: "low",
          metadata: { followupId: followup.id },
        });
      }
    }
  } catch (err) {
    console.warn("[ProductivityQueue] Failed to load email followups:", err);
  }

  // 3. Pull relationship nudges (from relationship engine)
  try {
    const { data: relationships } = await supabaseAdmin
      .from("contacts")
      .select("id, name, last_interaction_at, relationship_score")
      .eq("user_id", dbUserId)
      .not("last_interaction_at", "is", null)
      .limit(10);

    if (relationships) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      for (const contact of relationships) {
        if (contact.last_interaction_at && contact.last_interaction_at < sevenDaysAgo) {
          const daysSince = Math.floor(
            (Date.now() - new Date(contact.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          // Only nudge if it's been 7+ days and relationship score is decent
          if (daysSince >= 7 && (contact.relationship_score || 0) > 30) {
            items.push({
              id: `relationship_${contact.id}`,
              source: "relationship_nudge",
              title: `Check in with ${contact.name}`,
              description: `${daysSince} days since last interaction`,
              relationshipId: contact.id,
              estimatedMinutes: 5,
              importanceScore: Math.min(60, contact.relationship_score || 50),
              urgencyScore: Math.min(70, daysSince * 5),
              energyRequired: "low",
              metadata: { contactId: contact.id, daysSince },
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("[ProductivityQueue] Failed to load relationship nudges:", err);
  }

  // 4. Pull autopilot suggestions
  try {
    const { data: autopilotActions } = await supabaseAdmin
      .from("autopilot_actions")
      .select("id, action_type, suggested_summary, suggested_payload, context, created_at")
      .eq("user_id", dbUserId)
      .eq("status", "suggested")
      .order("created_at", { ascending: false })
      .limit(10);

    if (autopilotActions) {
      for (const action of autopilotActions) {
        const payload = (action.suggested_payload as any) || {};
        const context = (action.context as any) || {};
        
        // Map autopilot action types to WorkItem format
        let title = action.suggested_summary || "Autopilot suggestion";
        let estimatedMinutes = 15;
        let importanceScore = 50;
        let urgencyScore = 30;

        // Adjust scores based on action type and context
        if (action.action_type === "create_task") {
          title = payload.title || title;
          estimatedMinutes = payload.estimated_minutes || 30;
          importanceScore = payload.priority === "high" ? 70 : payload.priority === "critical" ? 90 : 50;
          urgencyScore = payload.due_at ? getTaskUrgency(payload.due_at) : 30;
        } else if (action.action_type === "email_followup") {
          title = `Follow up: ${payload.draft_subject || "Email"}`;
          estimatedMinutes = 10;
          importanceScore = 60;
          urgencyScore = 40;
        } else if (action.action_type === "relationship_checkin") {
          title = `Check in with ${context.contact_name || "contact"}`;
          estimatedMinutes = 5;
          importanceScore = 50;
          urgencyScore = 35;
        }

        items.push({
          id: `autopilot_${action.id}`,
          source: "autopilot_suggestion",
          title,
          description: action.suggested_summary || undefined,
          estimatedMinutes,
          importanceScore,
          urgencyScore,
          energyRequired: estimatedMinutes <= 15 ? "low" : estimatedMinutes <= 60 ? "medium" : "high",
          metadata: {
            autopilotActionId: action.id,
            actionType: action.action_type,
            payload,
          },
        });
      }
    }
  } catch (err) {
    console.warn("[ProductivityQueue] Failed to load autopilot suggestions:", err);
  }

  // 5. Load Third Brain context if enabled
  let thirdBrainContext: ThirdBrainContext | null = null;
  if (includeThirdBrain) {
    try {
      thirdBrainContext = await buildThirdBrainProductivityContext(userId);
    } catch (err) {
      console.warn("[ProductivityQueue] Failed to load Third Brain context:", err);
    }
  }

  // 6. EF-weighted scoring with Third Brain relevance
  const scored = await scoreWithEF(
    items,
    thirdBrainContext,
    includeEFAnalysis
  );

  scored.sort((a, b) => b.finalScore - a.finalScore);

  // 7. Task restructuring pass (break down high-load tasks)
  const restructured = await restructureTasks(scored, thirdBrainContext, includeEFAnalysis);

  // 8. Apply daily filters (limit to 5-15 items, respect weekly plan priorities)
  const filtered = await applyDailyFilters(dbUserId, restructured);

  // 9. Apply emotion-aware adjustments
  const emotionAdjusted = await applyEmotionFilters(userId, filtered);

  // 10. Safety guards: handle edge cases
  const safeQueue = applySafetyGuards(emotionAdjusted, thirdBrainContext);

  // 10. Sequence tasks optimally (if autonomous mode or EF enabled)
  let sequenced = emotionAdjusted;
  if (autonomousMode || includeEFAnalysis) {
    const emotionState = await getCurrentEmotionState(userId);
    const cognitiveProfile = thirdBrainContext?.cognitiveProfile || {
      peakHours: [9, 10, 11],
      preferredTaskLength: 30,
      contextSwitchingCost: 0.3,
      deepWorkCapacity: 120,
      currentEnergyLevel: 0.7,
    };
    
    sequenced = sequenceTasks(
      emotionAdjusted.map(({ finalScore, ...item }) => item),
      cognitiveProfile,
      emotionState ? { type: emotionState.detected_emotion, intensity: emotionState.intensity } : null
    );
  } else {
    sequenced = emotionAdjusted.map(({ finalScore, ...item }) => item);
  }

  return sequenced;
}

/**
 * Get importance score from task priority
 */
function getTaskImportance(priority: string): number {
  switch (priority?.toLowerCase()) {
    case "critical":
      return 100;
    case "high":
      return 70;
    case "medium":
      return 40;
    case "low":
      return 10;
    default:
      return 40;
  }
}

/**
 * Get urgency score from due date
 */
function getTaskUrgency(dueDate: string | null): number {
  if (!dueDate) return 20;

  const due = new Date(dueDate).getTime();
  const now = Date.now();
  const daysUntil = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return 100; // Overdue
  if (daysUntil === 0) return 90; // Due today
  if (daysUntil <= 1) return 70; // Due tomorrow
  if (daysUntil <= 3) return 50; // Due this week
  return 30; // Future
}

/**
 * Estimate energy required based on estimated time and priority
 */
function estimateEnergyRequired(
  estimatedMinutes: number | null,
  priority: string | null
): "low" | "medium" | "high" {
  const minutes = estimatedMinutes || 30;
  
  if (minutes <= 15) return "low";
  if (minutes <= 60) return priority === "critical" ? "high" : "medium";
  return "high";
}

/**
 * Apply daily filters based on weekly plan and user preferences
 */
async function applyDailyFilters(
  userId: string,
  items: Array<WorkItem & { finalScore: number }>
): Promise<Array<WorkItem & { finalScore: number }>> {
  // Get weekly plan priorities if available
  try {
    const { data: weeklyPlan } = await supabaseAdmin
      .from("weekly_plans")
      .select("big_three, themes")
      .eq("user_id", userId)
      .gte("week_start", new Date().toISOString().split("T")[0])
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (weeklyPlan?.big_three) {
      // Boost items that match weekly priorities
      const priorities = (weeklyPlan.big_three as any[]) || [];
      const priorityKeywords = priorities
        .map((p) => p.title?.toLowerCase() || "")
        .filter(Boolean);

      items = items.map((item) => {
        const titleLower = item.title.toLowerCase();
        const matchesPriority = priorityKeywords.some((kw) => titleLower.includes(kw));
        
        if (matchesPriority) {
          return {
            ...item,
            finalScore: item.finalScore + 20, // Boost priority items
          };
        }
        return item;
      });

      // Re-sort after boosting
      items.sort((a, b) => b.finalScore - a.finalScore);
    }
  } catch (err) {
    console.warn("[ProductivityQueue] Failed to load weekly plan:", err);
  }

  // Limit to 5-15 items (prefer top 10)
  const limit = Math.min(15, Math.max(5, items.length));
  return items.slice(0, limit);
}

/**
 * Score items with EF-weighted algorithm including Third Brain relevance
 */
async function scoreWithEF(
  items: WorkItem[],
  thirdBrainContext: ThirdBrainContext | null,
  includeEFAnalysis: boolean
): Promise<Array<WorkItem & { finalScore: number }>> {
  return items.map((item) => {
    // Base scores
    const importance = item.importanceScore;
    const urgency = item.urgencyScore;

    // Third Brain relevance (how related to active projects/context)
    let thirdBrainRelevance = 0;
    if (thirdBrainContext) {
      // Check if task relates to active projects
      const relatesToProject = thirdBrainContext.activeProjects.some(
        (project) =>
          item.projectId === project.id ||
          item.title.toLowerCase().includes(project.name.toLowerCase())
      );

      if (relatesToProject) {
        thirdBrainRelevance = 80; // High relevance
      } else if (thirdBrainContext.recentNotes.some((note) =>
        item.title.toLowerCase().includes(note.toLowerCase().substring(0, 20))
      )) {
        thirdBrainRelevance = 50; // Medium relevance
      }
    }

    // Cognitive fit (match between task load and current energy/emotion)
    let cognitiveFit = 50; // Default neutral
    if (includeEFAnalysis && thirdBrainContext) {
      const analysis = analyzeTask(item, thirdBrainContext);
      const energyLevel = thirdBrainContext.cognitiveProfile.currentEnergyLevel;

      if (analysis.energyRequirement === "high" && energyLevel > 0.7) {
        cognitiveFit = 90; // Perfect fit
      } else if (analysis.energyRequirement === "low" && energyLevel < 0.5) {
        cognitiveFit = 90; // Perfect fit for low energy
      } else if (analysis.energyRequirement === "high" && energyLevel < 0.5) {
        cognitiveFit = 20; // Poor fit
      } else {
        cognitiveFit = 60; // Decent fit
      }
    }

    // EF-weighted scoring
    const finalScore =
      importance * 0.45 +
      urgency * 0.25 +
      thirdBrainRelevance * 0.15 +
      cognitiveFit * 0.15;

    return {
      ...item,
      finalScore,
    };
  });
}

/**
 * Restructure tasks: break down high-load tasks into micro-steps
 */
async function restructureTasks(
  items: Array<WorkItem & { finalScore: number }>,
  thirdBrainContext: ThirdBrainContext | null,
  includeEFAnalysis: boolean
): Promise<Array<WorkItem & { finalScore: number; isMicroStep?: boolean; parentTaskId?: string }>> {
  if (!includeEFAnalysis || !thirdBrainContext) {
    return items;
  }

  const restructured: Array<WorkItem & { finalScore: number; isMicroStep?: boolean; parentTaskId?: string }> = [];

  for (const item of items) {
    const analysis = analyzeTask(item, thirdBrainContext);

    if (analysis.needsBreakdown) {
      // Break into micro-steps
      const steps = breakIntoSteps(item, analysis);

      // Add micro-steps to queue (replace parent task)
      for (const step of steps) {
        restructured.push({
          ...item,
          id: step.id,
          title: step.title,
          estimatedMinutes: step.estimatedMinutes,
          finalScore: item.finalScore * 0.9, // Slightly lower score for steps
          isMicroStep: true,
          parentTaskId: item.id,
          metadata: {
            ...item.metadata,
            stepOrder: step.order,
            parentTaskTitle: item.title,
          },
        });
      }
    } else {
      // Keep original task
      restructured.push(item);
    }
  }

  return restructured;
}

/**
 * Apply emotion-aware filters to adjust queue based on user's emotional state
 */
async function applyEmotionFilters(
  userId: string,
  items: Array<WorkItem & { finalScore: number }>
): Promise<Array<WorkItem & { finalScore: number }>> {
  try {
    const emotionState = await getCurrentEmotionState(userId);
    if (!emotionState) return items;

    const primaryEmotion = emotionState.detected_emotion;
    const intensity = emotionState.intensity || 0.5;

    // Adjust queue based on emotional state
    if (primaryEmotion === "stressed" || primaryEmotion === "overwhelmed" || primaryEmotion === "tired") {
      // Reduce queue size and prioritize low-energy tasks
      items = items
        .filter((item) => item.energyRequired === "low" || item.energyRequired === "medium")
        .slice(0, 5); // Smaller queue
    } else if (primaryEmotion === "excited" || primaryEmotion === "motivated" || primaryEmotion === "confident") {
      // Allow larger queue and all energy levels
      // No filtering needed, just keep top items
    } else if (primaryEmotion === "sad" || primaryEmotion === "anxious" || primaryEmotion === "fearful") {
      // Prioritize quick wins (low energy, high completion probability)
      items = items
        .filter((item) => item.energyRequired === "low" || (item.estimatedMinutes && item.estimatedMinutes <= 15))
        .slice(0, 8);
    }

    return items;
  } catch (err) {
    console.warn("[ProductivityQueue] Failed to load emotion state:", err);
    return items;
  }
}

/**
 * Apply safety guards and handle edge cases
 */
function applySafetyGuards(
  items: Array<WorkItem & { finalScore: number }>,
  thirdBrainContext: ThirdBrainContext | null
): Array<WorkItem & { finalScore: number }> {
  // Guard 1: If queue is empty, return empty array (will trigger Autopilot suggestions in UI)
  if (items.length === 0) {
    return [];
  }

  // Guard 2: If user is severely stressed, block deep work recommendations
  if (thirdBrainContext?.emotionalTrend.primary === "stressed" && 
      thirdBrainContext?.emotionalTrend.intensity > 0.8) {
    return items
      .filter((item) => item.energyRequired !== "high")
      .slice(0, 5); // Limit to 5 low-energy items
  }

  // Guard 3: If user is overwhelmed, switch to recovery mode (only low-energy tasks)
  if (thirdBrainContext?.emotionalTrend.primary === "overwhelmed") {
    return items
      .filter((item) => item.energyRequired === "low")
      .slice(0, 3); // Very small queue
  }

  // Guard 4: If user has been avoiding tasks, prioritize quick wins
  // (This would be enhanced with telemetry data in future)
  const quickWins = items.filter(
    (item) => item.estimatedMinutes && item.estimatedMinutes <= 15
  );
  if (quickWins.length > 0 && items.length > 8) {
    // Mix in some quick wins at the top
    const otherItems = items.filter((item) => !quickWins.includes(item));
    return [...quickWins.slice(0, 2), ...otherItems].slice(0, 10);
  }

  return items;
}

