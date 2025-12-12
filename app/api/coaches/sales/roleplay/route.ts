// Sales Coach Roleplay API
// app/api/coaches/sales/roleplay/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildCoachContextPack, loadScenarioForCoach } from "@/lib/coaches/context";
import {
  getDefaultVehiclePriceScenario,
  buildCoachSystemPrompt,
  buildCustomerSystemPrompt,
  realismGuardCheck,
  generateCoachFeedbackV2,
} from "@/lib/coaches/roleplay";
import { RoleplayMessage, CoachScenario } from "@/lib/coaches/types";
import { supabaseAdmin } from "@/lib/supabase";
import { callAI } from "@/lib/ai/call";
import { llmComplete } from "@/lib/llm/client";
import { applyCoachXP } from "@/lib/xp/applyCoachXP";
import { generateCoachTurn } from "@/lib/coaching/engine";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      scenarioType = "sales:vehicle_price_objection",
      messages = [],
      difficulty,
      userRating,
      endSession,
      scenarioId, // v2.5: optional scenario ID from library
    } = body as any;

    // 1) Build context (includes preferences and difficulty level)
    const contextPack = await buildCoachContextPack({
      userId,
      coachId: "sales",
      activeScenarioType: scenarioType,
    });

    // v2.5: Load scenario from library or use default
    let scenario: CoachScenario | ReturnType<typeof getDefaultVehiclePriceScenario>;
    let scenarioIdUsed: string | null = null;

    if (scenarioId) {
      // Load specific scenario from library
      const loadedScenario = await loadScenarioForCoach("sales", { scenarioId });
      if (loadedScenario) {
        scenario = loadedScenario;
        scenarioIdUsed = loadedScenario.id;
      } else {
        // Fallback to default
        scenario = getDefaultVehiclePriceScenario();
        if (contextPack.difficultyLevel) {
          (scenario as any).constraints.difficulty = contextPack.difficultyLevel;
        }
      }
    } else {
      // Load scenario by difficulty or use default
      const loadedScenario = await loadScenarioForCoach("sales", {
        difficulty: contextPack.difficultyLevel,
      });
      if (loadedScenario) {
        scenario = loadedScenario;
        scenarioIdUsed = loadedScenario.id;
      } else {
        // Fallback to default
        scenario = getDefaultVehiclePriceScenario();
        if (contextPack.difficultyLevel) {
          (scenario as any).constraints.difficulty = contextPack.difficultyLevel;
        }
      }
    }

    const effectiveDifficulty = contextPack.difficultyLevel || "beginner";

    // 2) Decide what to generate: continuing roleplay vs feedback v2
    const turnsSoFar = messages.filter(
      (m: RoleplayMessage) => m.role === "user" || m.role === "customer"
    ).length;

    const needFeedback = turnsSoFar > 0 && turnsSoFar % 4 === 0; // v2.5: every 4 user messages
    let feedbackV2: any = null;

    // 3) Build coach message
    const userTranscriptText = messages
      .map((m: RoleplayMessage) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");
    
    const lastUserMessage = messages.filter((m: RoleplayMessage) => m.role === "user").pop()?.content || "";

    let coachReply: string;
    let orchestratorResult: any = null;

    // v3.6: Use emotion-aware orchestrator if enabled (for non-feedback turns)
    if (useOrchestrator && lastUserMessage && !needFeedback) {
      try {
        orchestratorResult = await generateCoachTurn({
          userId,
          coachId: "sales",
          userMessage: lastUserMessage,
          context: {
            previousMessages: messages,
            scenarioInfo: scenario,
          },
        });
        coachReply = orchestratorResult.replyText;
      } catch (err) {
        console.warn("[SalesRoleplay] Orchestrator failed, falling back to default:", err);
        // Fall through to default behavior
        orchestratorResult = null;
      }
    }

    // Default behavior (original roleplay logic or feedback turns)
    if (!orchestratorResult) {
      const coachSystem = buildCoachSystemPrompt(contextPack, scenario);
      const coachPrompt = [
        needFeedback
          ? "Step 1: Give brief FEEDBACK on the last few lines (2–4 bullet points)."
          : "Continue the ROLEPLAY as the coach guiding the conversation.",
        "Step 2: If appropriate, suggest what the salesperson could say next.",
        "",
        "Transcript so far:",
        userTranscriptText || "(no transcript yet)",
      ].join("\n");

      // Use callAI for coach response (with usage tracking)
      const coachResult = await callAI({
        userId,
        systemPrompt: coachSystem,
        userPrompt: coachPrompt,
        model: "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 500,
        feature: "coach_roleplay",
      });

      if (!coachResult.success || !coachResult.content) {
        return NextResponse.json(
          { error: coachResult.error || "Failed to generate coach response" },
          { status: 500 }
        );
      }

      coachReply = coachResult.content;
    }

    const newMessages: RoleplayMessage[] = [
      ...messages,
      { role: "coach", content: coachReply, timestamp: new Date().toISOString() },
    ];

    // 4) Generate customer reply (if not ending session)
    let customerReply: string | undefined;
    let realismScore: number | undefined;
    let realismExplanation: string | undefined;

    // v2.5: Generate structured feedback if needed
    if (needFeedback && messages.length > 0) {
      feedbackV2 = await generateCoachFeedbackV2({
        transcript: messages,
        scenario,
        context: contextPack,
      });
    }

    if (!endSession) {
      const customerSystem = buildCustomerSystemPrompt(scenario, effectiveDifficulty);
      const customerPrompt = [
        "Context:",
        userTranscriptText,
        "",
        "The last USER message is the salesperson's latest line. Reply as the customer.",
      ].join("\n");

      // Use llmComplete for customer (no usage tracking needed, it's part of roleplay)
      let rawCustomerReply = await llmComplete(customerPrompt, {
        model: "gpt-4o-mini",
        temperature: 0.8,
        max_tokens: 200,
      });

      // Realism guard
      const realism = await realismGuardCheck(scenario, rawCustomerReply);
      realismScore = realism.score;
      realismExplanation = realism.explanation;

      if (realism.score < 6) {
        rawCustomerReply = await llmComplete(
          customerPrompt +
            "\n\nYour previous reply was not realistic enough. Regenerate it, but this time acknowledge the salesperson's math if it is clearly correct and adjust your expectations slightly.",
          {
            model: "gpt-4o-mini",
            temperature: 0.8,
            max_tokens: 200,
          }
        );
      }

      customerReply = rawCustomerReply;

      newMessages.push({
        role: "customer",
        content: customerReply,
        timestamp: new Date().toISOString(),
      });
    }

    // v2.5: Generate final feedback if ending session
    if (endSession && !feedbackV2) {
      feedbackV2 = await generateCoachFeedbackV2({
        transcript: newMessages,
        scenario,
        context: contextPack,
      });
    }

    // 5) Optionally log session
    let sessionLogged = false;
    if (endSession) {
      // Get user's database ID
      const { data: userRow } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("clerk_id", userId)
        .single();

      const dbUserId = userRow?.id || userId;

      // v2.5: Extract skill nodes from feedback if available
      const skillNodes = feedbackV2?.suggestedDrills
        ? feedbackV2.suggestedDrills.map((d: string) => d.toLowerCase().replace(/\s+/g, "_")).slice(0, 3)
        : ["objection_clarify", "value_framing"];

      const { data: savedSession } = await supabaseAdmin
        .from("coach_training_sessions")
        .insert({
          user_id: dbUserId,
          coach_id: "sales",
          scenario_type: scenarioIdUsed ? `scenario:${scenarioIdUsed}` : scenarioType,
          skill_nodes: skillNodes,
          success_rating: userRating ?? null,
          llm_difficulty: effectiveDifficulty,
          difficulty: effectiveDifficulty, // v2.5: new field
          performance_score: feedbackV2?.confidenceScore ?? null, // v2.5: new field
          feedback_summary: feedbackV2 ? feedbackV2 : null, // v2.5: new field
          transcript: newMessages,
          key_takeaways: feedbackV2?.whatWentWell?.join("; ") || null,
        })
        .select("id")
        .single();

      // v3.5: Award XP
      let xpResult = null;
      if (savedSession?.id && feedbackV2) {
        try {
          xpResult = await applyCoachXP(userId, {
            sessionId: savedSession.id,
            scenarioType: scenarioIdUsed ? `scenario:${scenarioIdUsed}` : scenarioType,
            performanceScore: feedbackV2.confidenceScore,
            confidenceScore: feedbackV2.confidenceScore,
            coachType: "sales",
            skillNodes,
            difficulty: effectiveDifficulty,
          });

          // Update session with XP awarded
          await supabaseAdmin
            .from("coach_training_sessions")
            .update({ xp_awarded: xpResult.xpAwarded })
            .eq("id", savedSession.id);
        } catch (xpError) {
          console.error("[SalesRoleplay] XP awarding error:", xpError);
          // Don't fail the request if XP fails
        }
      }

      sessionLogged = true;
    }

    return NextResponse.json({
      coachMessage: coachReply,
      customerMessage: customerReply,
      updatedMessages: newMessages,
      realismScore,
      realismExplanation,
      sessionLogged,
      // v2.5: Include feedback and scenario info
      feedback: feedbackV2,
      scenario: scenarioIdUsed
        ? {
            id: scenarioIdUsed,
            title: "title" in scenario ? scenario.title : "Default Scenario",
            difficulty: effectiveDifficulty,
          }
        : null,
      difficultyLevel: effectiveDifficulty,
      // v3.5: Include XP if awarded
      xpAwarded: endSession && xpResult ? xpResult : null,
      // v3.6: Include orchestrator result if used
      intent: orchestratorResult?.intent || null,
      voiceProfile: orchestratorResult?.voiceProfile || null,
      rationale: orchestratorResult?.rationale || null,
    });
  } catch (err: any) {
    console.error("[SalesRoleplay] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

