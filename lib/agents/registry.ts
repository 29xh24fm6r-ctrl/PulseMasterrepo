// lib/agents/registry.ts
// Sprint 4: Agent registry and execution
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/obs/log";
import type { Agent, AgentType, AgentRunResult } from "./types";

const logger = createLogger({ source: "agent_registry" });

/**
 * Run an agent
 * 
 * Agents produce findings and suggestions but do NOT directly mutate user data.
 * They write to agent_findings and agent_reports tables only.
 */
export async function runAgent(
  agentId: string,
  userId: string
): Promise<{
  report_id: string;
  findings_count: number;
  suggested_actions_count: number;
}> {
  const agentLogger = logger.child({ agent_id: agentId, user_id: userId });

  // Fetch agent
  const { data: agent, error: agentError } = await supabaseAdmin
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .eq("user_id", userId)
    .eq("enabled", true)
    .single();

  if (agentError || !agent) {
    agentLogger.error("Agent not found or disabled", agentError);
    throw new Error("Agent not found or disabled");
  }

  agentLogger.info("Running agent", { agent_type: agent.agent_type, name: agent.name });

  // Execute agent based on type
  const result = await executeAgentByType(agent.agent_type, userId, agent.config, agentLogger);

  // Store findings
  const findingsIds = await storeFindings(agent.id, userId, result.findings, agentLogger);

  // Store report
  const { data: report, error: reportError } = await supabaseAdmin
    .from("agent_reports")
    .insert({
      user_id: userId,
      agent_id: agent.id,
      findings_count: result.findings.length,
      suggested_actions_count: result.suggested_actions.length,
      risk_flags: result.risk_flags || [],
      report_data: {
        findings: result.findings,
        suggested_actions: result.suggested_actions,
        risk_flags: result.risk_flags,
      },
    })
    .select("*")
    .single();

  if (reportError || !report) {
    agentLogger.error("Failed to store agent report", reportError);
    throw new Error("Failed to store agent report");
  }

  agentLogger.info("Agent run completed", {
    report_id: report.id,
    findings_count: result.findings.length,
    suggested_actions_count: result.suggested_actions.length,
  });

  return {
    report_id: report.id,
    findings_count: result.findings.length,
    suggested_actions_count: result.suggested_actions.length,
  };
}

/**
 * Execute agent by type
 */
async function executeAgentByType(
  agentType: AgentType,
  userId: string,
  config: Record<string, any>,
  agentLogger: ReturnType<typeof createLogger>
): Promise<AgentRunResult> {
  switch (agentType) {
    case "scout":
      return await executeScoutAgent(userId, config, agentLogger);
    case "organizer":
      return await executeOrganizerAgent(userId, config, agentLogger);
    case "nagger":
      return await executeNaggerAgent(userId, config, agentLogger);
    case "researcher":
      return await executeResearcherAgent(userId, config, agentLogger);
    case "crm_sheriff":
      return await executeCrmSheriffAgent(userId, config, agentLogger);
    case "calendar_prep":
      return await executeCalendarPrepAgent(userId, config, agentLogger);
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
}

/**
 * Scout Agent: Finds opportunities and risks
 */
async function executeScoutAgent(
  userId: string,
  config: Record<string, any>,
  agentLogger: ReturnType<typeof createLogger>
): Promise<AgentRunResult> {
  const findings = [];
  const suggestedActions = [];

  // Check for high-value deals without follow-ups
  const { data: deals } = await supabaseAdmin
    .from("deals")
    .select("id, name, amount, stage, updated_at")
    .eq("user_id", userId)
    .gt("amount", config.min_deal_amount || 10000)
    .not("stage", "eq", "closed")
    .lt("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (deals && deals.length > 0) {
    findings.push({
      kind: "opportunity" as const,
      title: "High-value deals need attention",
      detail: `${deals.length} high-value deals haven't been updated in 7+ days`,
      data: { deals: deals.map((d) => ({ id: d.id, name: d.name, amount: d.amount })) },
      severity: "high" as const,
      confidence: 0.9,
    });

    suggestedActions.push({
      action_type: "nudge_deal",
      payload: { deal_ids: deals.map((d) => d.id) },
      reason: "High-value deals need follow-up",
    });
  }

  return {
    findings,
    suggested_actions: suggestedActions,
    risk_flags: [],
  };
}

/**
 * Organizer Agent: Suggests task organization
 */
async function executeOrganizerAgent(
  userId: string,
  config: Record<string, any>,
  agentLogger: ReturnType<typeof createLogger>
): Promise<AgentRunResult> {
  const findings = [];
  const suggestedActions = [];

  // Check for tasks without due dates
  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("id, title, status, due_date")
    .eq("user_id", userId)
    .eq("status", "open")
    .is("due_date", null)
    .limit(10);

  if (tasks && tasks.length > 0) {
    findings.push({
      kind: "insight" as const,
      title: "Tasks without due dates",
      detail: `${tasks.length} open tasks don't have due dates`,
      data: { task_count: tasks.length },
      severity: "low" as const,
      confidence: 0.8,
    });
  }

  return {
    findings,
    suggested_actions: suggestedActions,
    risk_flags: [],
  };
}

/**
 * Nagger Agent: Reminds about overdue items
 */
async function executeNaggerAgent(
  userId: string,
  config: Record<string, any>,
  agentLogger: ReturnType<typeof createLogger>
): Promise<AgentRunResult> {
  const findings = [];
  const suggestedActions = [];

  // Find overdue tasks
  const { data: overdueTasks } = await supabaseAdmin
    .from("tasks")
    .select("id, title, due_date")
    .eq("user_id", userId)
    .eq("status", "open")
    .lt("due_date", new Date().toISOString().split("T")[0]);

  if (overdueTasks && overdueTasks.length > 0) {
    findings.push({
      kind: "risk" as const,
      title: "Overdue tasks",
      detail: `${overdueTasks.length} tasks are overdue`,
      data: { tasks: overdueTasks.map((t) => ({ id: t.id, title: t.title })) },
      severity: "high" as const,
      confidence: 1.0,
    });
  }

  return {
    findings,
    suggested_actions: suggestedActions,
    risk_flags: [],
  };
}

/**
 * Researcher Agent: Finds information gaps
 */
async function executeResearcherAgent(
  userId: string,
  config: Record<string, any>,
  agentLogger: ReturnType<typeof createLogger>
): Promise<AgentRunResult> {
  // TODO: Implement researcher agent
  return {
    findings: [],
    suggested_actions: [],
    risk_flags: [],
  };
}

/**
 * CRM Sheriff Agent: Finds data quality issues
 */
async function executeCrmSheriffAgent(
  userId: string,
  config: Record<string, any>,
  agentLogger: ReturnType<typeof createLogger>
): Promise<AgentRunResult> {
  const findings = [];

  // Check for contacts without emails
  const { data: contactsNoEmail } = await supabaseAdmin
    .from("crm_contacts")
    .select("id, display_name")
    .eq("user_id", userId)
    .is("primary_email", null)
    .limit(10);

  if (contactsNoEmail && contactsNoEmail.length > 0) {
    findings.push({
      kind: "insight" as const,
      title: "Contacts missing email addresses",
      detail: `${contactsNoEmail.length} contacts don't have email addresses`,
      data: { contact_count: contactsNoEmail.length },
      severity: "low" as const,
      confidence: 1.0,
    });
  }

  return {
    findings,
    suggested_actions: [],
    risk_flags: [],
  };
}

/**
 * Calendar Prep Agent: Prepares for upcoming meetings
 */
async function executeCalendarPrepAgent(
  userId: string,
  config: Record<string, any>,
  agentLogger: ReturnType<typeof createLogger>
): Promise<AgentRunResult> {
  // TODO: Implement calendar prep agent
  return {
    findings: [],
    suggested_actions: [],
    risk_flags: [],
  };
}

/**
 * Store findings in database
 */
async function storeFindings(
  agentId: string,
  userId: string,
  findings: AgentRunResult["findings"],
  agentLogger: ReturnType<typeof createLogger>
): Promise<string[]> {
  if (findings.length === 0) return [];

  const findingsToInsert = findings.map((f) => ({
    user_id: userId,
    agent_id: agentId,
    kind: f.kind,
    title: f.title,
    detail: f.detail || null,
    data: f.data || {},
    severity: f.severity || "info",
    confidence: f.confidence || 0.5,
    acknowledged: false,
  }));

  const { data, error } = await supabaseAdmin
    .from("agent_findings")
    .insert(findingsToInsert)
    .select("id");

  if (error) {
    agentLogger.error("Failed to store findings", error);
    throw new Error(`Failed to store findings: ${error.message}`);
  }

  return (data || []).map((f) => f.id);
}

