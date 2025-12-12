// Execution Engine - Turn plans into real changes
// lib/agi/executor.ts
//
// SAFETY GUARANTEES:
// - NO real email sends (only draft records)
// - NO financial transfers or payments (only planning suggestions)
// - NO destructive deletes or cancellations
// - All external actions are "draft only" or internal records
// - High-risk actions require confirmation and are never auto-executed
//
// HARD SAFETY RULE: Do not send emails or move money from AGI actions in v1.
// Only internal tasks/insights/nudges are allowed for auto-execution.

import { AGIAction } from "./types";
import { supabaseAdmin } from "@/lib/supabase";
import { AGIUserProfile, isActionAllowedByProfile } from "./settings";

/**
 * Resolve Clerk ID to database user ID
 */
async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

interface UserAGISettings {
  level: "off" | "assist" | "autopilot";
  require_confirmation_for_high_impact: boolean;
}

/**
 * Safety check: Is this action allowed to execute?
 */
async function isActionAllowed(
  action: AGIAction,
  settings: UserAGISettings,
  isAutopilotMode: boolean
): Promise<boolean> {
  // Always disallow high-risk actions without explicit confirmation
  if (action.riskLevel === "high" && action.requiresConfirmation !== false) {
    return false;
  }

  // Check action type for dangerous operations
  const dangerousTypes = ["send_email", "transfer_money", "delete_data", "cancel_plan"];
  if (dangerousTypes.some((dt) => action.type.includes(dt))) {
    return false; // Never auto-execute dangerous actions
  }

  // Require confirmation for high-impact actions if setting is enabled
  if (settings.require_confirmation_for_high_impact && action.requiresConfirmation) {
    return false;
  }

  // Autopilot mode: only allow low-risk actions
  if (isAutopilotMode && action.riskLevel !== "low") {
    return false;
  }

  return true;
}

export async function executeActions(
  userId: string,
  actions: AGIAction[],
  profile?: AGIUserProfile,
  settings?: UserAGISettings,
  runId?: string
): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  // Load settings for safety checks if not provided
  let currentSettings: UserAGISettings;
  if (settings) {
    currentSettings = settings;
  } else {
    const { data: settingsData } = await supabaseAdmin
      .from("user_agi_settings")
      .select("require_confirmation_for_high_impact, level")
      .eq("user_id", dbUserId)
      .maybeSingle();

    currentSettings = {
      level: settingsData?.level || "assist",
      require_confirmation_for_high_impact: settingsData?.require_confirmation_for_high_impact ?? true,
    };
  }
  const isAutopilotMode = currentSettings.level === "autopilot";

  for (const action of actions) {
    try {
      // Check profile capabilities and hard limits first
      if (profile && !isActionAllowedByProfile(profile, action)) {
        console.warn(`[AGI Executor] Action '${action.type}' blocked by profile capabilities/hard limits.`);
        continue;
      }

      // Safety check before execution
      if (!await isActionAllowed(action, currentSettings, isAutopilotMode)) {
        console.log(`[AGI Executor] Action blocked by safety check: ${action.type} - ${action.label}`);
        continue;
      }

      // SAFE AUTONOMY V1: Only execute low-risk actions automatically
      if ((action.riskLevel ?? "low") !== "low") {
        console.log(`[AGI Executor] Action blocked: only low-risk actions allowed for auto-execution (risk: ${action.riskLevel})`);
        continue;
      }

      // Only allow specific action types for auto-execution
      const allowedAutoTypes = ["create_task", "log_insight", "nudge_user", "schedule_simulation"];
      if (!allowedAutoTypes.includes(action.type)) {
        console.log(`[AGI Executor] Action blocked: type '${action.type}' not allowed for auto-execution`);
        continue;
      }

      switch (action.type) {
        case "create_task": {
          const taskDetails = action.details || {};
          const { error } = await supabaseAdmin.from("tasks").insert({
            user_id: dbUserId,
            name: taskDetails.title || "Untitled Task",
            description: taskDetails.description || taskDetails.metadata?.overdueCount
              ? `Created by AGI: ${action.label}`
              : undefined,
            status: "pending",
            priority: taskDetails.priority || 0.5,
            due_date: taskDetails.when === "today" ? new Date().toISOString().split("T")[0] : null,
            metadata: {
              source: "agi",
              runId: runId || null,
              ...taskDetails.metadata,
            },
          });

          if (error) {
            console.error("Failed to create task:", error);
          }
          break;
        }

        case "update_task": {
          // TODO: Implement task updates
          console.log("Task update not yet implemented:", action.details);
          break;
        }

        case "send_email_draft": {
          // SAFETY: Only creates draft records, never sends actual emails
          // TODO: Integrate with email draft system when available
          try {
            // Create draft record in email_drafts table if it exists
            const { error } = await supabaseAdmin.from("email_drafts").insert({
              user_id: dbUserId,
              to: action.details?.to || "",
              subject: action.details?.subject || action.label,
              body: action.details?.body || "",
              status: "draft",
              source: "agi_kernel",
              metadata: {
                source: "agi",
                subsource: action.details?.subsource || "kernel",
                runId: runId || null,
                ...action.details?.metadata,
              },
              created_at: new Date().toISOString(),
            });

            if (error && error.code !== "42P01") {
              console.warn("Email drafts table not available:", error.message);
            }
          } catch {
            // Email drafts table may not exist - safe to ignore
          }
          break;
        }

        case "schedule_simulation": {
          // TODO: Integrate with simulation engine
          console.log("Simulation scheduling not yet implemented:", action.details);
          break;
        }

        case "log_insight": {
          const insightDetails = action.details || {};
          // Log to insights table if it exists, or create a note
          try {
            const { error } = await supabaseAdmin.from("insights").insert({
              user_id: dbUserId,
              message: insightDetails.insight || action.label,
              priority: insightDetails.priority || "medium",
              source: "agi_kernel",
              metadata: {
                source: "agi",
                runId: runId || null,
                ...insightDetails.metadata,
              },
              created_at: new Date().toISOString(),
            });

            if (error && error.code !== "42P01") {
              // Table doesn't exist - that's okay for now
              console.log("Insights table not available:", error.message);
            }
          } catch {
            // Insights table may not exist
          }
          break;
        }

        case "update_relationship_plan": {
          // TODO: Integrate with relationship engine
          console.log("Relationship plan update not yet implemented:", action.details);
          break;
        }

        case "update_finance_plan": {
          // SAFETY: Only logs planning suggestions, never executes financial transactions
          // TODO: Integrate with finance engine when available
          // This action type should only create internal records, never transfer money
          try {
            const { error } = await supabaseAdmin.from("finance_plan_suggestions").insert({
              user_id: dbUserId,
              suggestion: action.label,
              details: action.details,
              status: "suggestion",
              source: "agi_kernel",
              metadata: {
                source: "agi",
                subsource: action.details?.subsource || "kernel",
                runId: runId || null,
                ...action.details?.metadata,
              },
              created_at: new Date().toISOString(),
            });

            if (error && error.code !== "42P01") {
              console.warn("Finance plan suggestions table not available:", error.message);
            }
          } catch {
            // Finance plan table may not exist - safe to ignore
          }
          break;
        }

        case "nudge_user": {
          // SAFETY: Only creates internal notifications, never external messages
          // Route to Advanced Push Notification system
          try {
            // Try Advanced Push first
            const { queueNotification } = await import("@/lib/notifications/advanced");
            await queueNotification({
              userId: dbUserId,
              type: "autonomy_suggestion",
              priority: action.riskLevel === "high" ? "high" : action.riskLevel === "medium" ? "normal" : "low",
              title: action.label,
              body: action.details?.message || action.label,
              data: {
                source: "agi",
                subsource: action.details?.subsource || "kernel",
                runId: runId || null,
                ...action.details || {},
              },
              url: action.details?.url || "/life",
            });
          } catch {
            // Fallback to basic notifications table
            try {
              const { error } = await supabaseAdmin.from("notifications").insert({
                user_id: dbUserId,
                type: "nudge",
                title: action.label,
                message: action.details?.message || action.label,
                read: false,
                metadata: {
                  source: "agi",
                  subsource: action.details?.subsource || "kernel",
                  runId: runId || null,
                  ...action.details || {},
                },
                created_at: new Date().toISOString(),
              });

              if (error && error.code !== "42P01") {
                console.log("Notifications table not available:", error.message);
              }
            } catch {
              // Notifications table may not exist
            }
          }
          break;
        }

        case "noop":
        default:
          break;
      }
    } catch (err) {
      console.error("Failed to execute AGI action", action, err);
      // TODO: mark action as 'failed' in agi_actions
    }
  }
}

