/**
 * Agents Library
 * lib/agents.ts
 * 
 * Provides agent listing, running, and run management functions
 */

import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface Agent {
  key: string;
  name: string;
  description: string;
  category?: string;
}

export interface AgentRun {
  id: string;
  user_id: string;
  agent_key: string;
  status: "active" | "completed" | "aborted" | "error";
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface AgentMessage {
  id: string;
  run_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface RunAgentParams {
  userId: string;
  agentKey: string;
  message: string;
  payload?: Record<string, any>;
  topic?: string;
  runId?: string;
  caller?: string;
}

export interface RunAgentResult {
  runId: string;
  response: string;
  messages: AgentMessage[];
}

/**
 * List available agents
 */
export function listAgents(): Agent[] {
  // Return predefined list of agents
  // TODO: In the future, this could be loaded from a database or config
  return [
    {
      key: "memory_coach",
      name: "Memory Coach",
      description: "Helps you capture and reflect on important moments",
      category: "coaching",
    },
    {
      key: "task_agent",
      name: "Task Agent",
      description: "Manages tasks and helps prioritize work",
      category: "productivity",
    },
    {
      key: "relationship_agent",
      name: "Relationship Agent",
      description: "Tracks and nurtures your relationships",
      category: "relationships",
    },
  ];
}

/**
 * Run an agent with a message
 */
export async function runAgent(params: RunAgentParams): Promise<RunAgentResult> {
  const { userId, agentKey, message, payload, runId: existingRunId } = params;

  // Resolve user ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // Create or get run
  let runId = existingRunId;
  if (!runId) {
    const { data: run, error } = await supabaseAdmin
      .from("agent_runs")
      .insert({
        user_id: dbUserId,
        agent_key: agentKey,
        status: "active",
        metadata: payload || {},
      })
      .select("id")
      .single();

    if (error || !run) {
      throw new Error(`Failed to create agent run: ${error?.message || "Unknown error"}`);
    }
    runId = run.id;
  }

  // Add user message
  await supabaseAdmin.from("agent_messages").insert({
    run_id: runId,
    role: "user",
    content: message,
  });

  // Generate agent response (placeholder - replace with actual agent logic)
  const response = `Agent "${agentKey}" received your message: "${message}". This is a placeholder response.`;

  // Add assistant message
  const { data: assistantMessage } = await supabaseAdmin
    .from("agent_messages")
    .insert({
      run_id: runId,
      role: "assistant",
      content: response,
    })
    .select("*")
    .single();

  // Get all messages for this run
  const { data: messages } = await supabaseAdmin
    .from("agent_messages")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });

  return {
    runId,
    response,
    messages: (messages || []) as AgentMessage[],
  };
}

/**
 * Get agent run details
 */
export async function getRun(runId: string): Promise<AgentRun | null> {
  const { data, error } = await supabaseAdmin
    .from("agent_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();

  if (error || !data) return null;
  return data as AgentRun;
}

/**
 * Get messages for a run
 */
export async function getRunMessages(runId: string): Promise<AgentMessage[]> {
  const { data } = await supabaseAdmin
    .from("agent_messages")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });

  return (data || []) as AgentMessage[];
}

/**
 * Get user's agent runs
 */
export async function getUserRuns(params: {
  userId: string;
  status?: string;
  limit?: number;
}): Promise<AgentRun[]> {
  const { userId, status, limit = 10 } = params;

  // Resolve user ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  let query = supabaseAdmin
    .from("agent_runs")
    .select("*")
    .eq("user_id", dbUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data } = await query;
  return (data || []) as AgentRun[];
}

/**
 * Complete an agent run
 */
export async function completeRun(runId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("agent_runs")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", runId);

  return !error;
}

/**
 * Abort an agent run
 */
export async function abortRun(runId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("agent_runs")
    .update({ status: "aborted", updated_at: new Date().toISOString() })
    .eq("id", runId);

  return !error;
}

