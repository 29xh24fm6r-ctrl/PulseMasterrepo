// Multi-Agent Team Coaching API
// app/api/coaches/team/roleplay/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildCoachContextPack, loadScenarioForCoach } from "@/lib/coaches/context";
import { coordinateMultiAgent, AgentType } from "@/lib/coaches/multiAgentEngine";
import { RoleplayMessage } from "@/lib/coaches/types";
import { supabaseAdmin } from "@/lib/supabase";
import { buildCustomerSystemPrompt, realismGuardCheck } from "@/lib/coaches/roleplay";
import { llmComplete } from "@/lib/llm/client";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      scenarioId,
      agents = ["sales"], // Default to sales if not specified
      message,
      messages = [],
      sessionId,
      endSession = false,
    } = body;

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Build context
    const contextPack = await buildCoachContextPack({
      userId,
      coachId: "sales", // Primary coach
      activeScenarioType: scenarioId ? `scenario:${scenarioId}` : undefined,
    });

    // Load scenario
    let scenario: any = null;
    if (scenarioId) {
      scenario = await loadScenarioForCoach("sales", { scenarioId });
    }

    if (!scenario) {
      // Fallback to default
      const { getDefaultVehiclePriceScenario } = await import("@/lib/coaches/roleplay");
      scenario = getDefaultVehiclePriceScenario();
    }

    // Add user message to transcript
    const updatedMessages: RoleplayMessage[] = [
      ...messages,
      { role: "user", content: message, timestamp: new Date().toISOString() },
    ];

    // Coordinate multi-agent response
    const agentTypes = agents as AgentType[];
    const multiAgentResponse = await coordinateMultiAgent(
      userId,
      agentTypes,
      messages,
      contextPack,
      scenario,
      message
    );

    // Add unified coach message
    updatedMessages.push({
      role: "coach",
      content: multiAgentResponse.unifiedMessage,
      timestamp: new Date().toISOString(),
    });

    // Generate customer reply if not ending
    let customerReply: string | undefined;
    if (!endSession) {
      const customerSystem = buildCustomerSystemPrompt(scenario, contextPack.difficultyLevel);
      const customerPrompt = [
        "Context:",
        updatedMessages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n"),
        "",
        "The last USER message is the salesperson's latest line. Reply as the customer.",
      ].join("\n");

      customerReply = await llmComplete(customerPrompt, {
        model: "gpt-4o-mini",
        temperature: 0.8,
        max_tokens: 200,
      });

      // Realism guard
      const realism = await realismGuardCheck(scenario, customerReply);
      if (realism.score < 6) {
        customerReply = await llmComplete(
          customerPrompt +
            "\n\nYour previous reply was not realistic enough. Regenerate it, acknowledging the salesperson's math if correct.",
          {
            model: "gpt-4o-mini",
            temperature: 0.8,
            max_tokens: 200,
          }
        );
      }

      updatedMessages.push({
        role: "customer",
        content: customerReply,
        timestamp: new Date().toISOString(),
      });
    }

    // Save or update session
    let savedSessionId = sessionId;
    if (!savedSessionId) {
      // Create new session
      const { data: newSession } = await supabaseAdmin
        .from("coach_multi_agent_sessions")
        .insert({
          user_id: dbUserId,
          scenario_id: scenarioId || null,
          agents: agentTypes,
          transcript: updatedMessages,
          agent_contributions: multiAgentResponse.agentContributions,
        })
        .select("id")
        .single();

      savedSessionId = newSession?.id;
    } else {
      // Update existing session
      await supabaseAdmin
        .from("coach_multi_agent_sessions")
        .update({
          transcript: updatedMessages,
          agent_contributions: multiAgentResponse.agentContributions,
          updated_at: new Date().toISOString(),
        })
        .eq("id", savedSessionId);
    }

    return NextResponse.json({
      unifiedMessage: multiAgentResponse.unifiedMessage,
      agentContributions: multiAgentResponse.agentContributions,
      customerMessage: customerReply,
      updatedMessages,
      sessionId: savedSessionId,
      shouldShowInlineCommentary: multiAgentResponse.shouldShowInlineCommentary,
    });
  } catch (err: any) {
    console.error("[MultiAgentRoleplay] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

