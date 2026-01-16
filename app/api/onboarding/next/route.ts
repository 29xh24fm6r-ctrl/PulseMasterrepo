import { canMakeAICall, trackAIUsage } from "@/services/usage";
// POST /api/onboarding/next
// Gets the next question based on conversation history

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { ONBOARDING_SYSTEM_PROMPT, FIRST_QUESTION, OnboardingResponse } from "@/lib/onboarding/system";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { answer, isStart } = body;

    // Check if user already completed onboarding
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .single();

    if (existingProfile?.onboarding_completed) {
      return NextResponse.json({
        isComplete: true,
        redirect: "/"
      });
    }

    // Get or create conversation
    const { data: conversation } = await supabase
      .from("onboarding_conversations")
      .select("*")
      .eq("user_id", userId)
      .eq("is_complete", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // If starting fresh or no conversation exists
    if (isStart || !conversation) {
      // Create new conversation
      const { data: newConvo, error } = await supabase
        .from("onboarding_conversations")
        .insert({
          user_id: userId,
          messages: [],
          partial_profile: {},
          question_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Update profile to mark onboarding started
      await supabase
        .from("user_profiles")
        .upsert({
          user_id: userId,
          onboarding_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      // Return first question
      return NextResponse.json({
        ...FIRST_QUESTION,
        conversationId: newConvo.id,
        questionNumber: 1,
      });
    }

    // We have an existing conversation and an answer
    if (!answer) {
      // Return current state (resume)
      const messages = conversation.messages || [];
      if (messages.length === 0) {
        return NextResponse.json({
          ...FIRST_QUESTION,
          conversationId: conversation.id,
          questionNumber: 1,
        });
      }

      // Get last question to re-display
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        return NextResponse.json({
          ...lastMessage.content,
          conversationId: conversation.id,
          questionNumber: conversation.question_count + 1,
        });
      }
    }

    // Add the user's answer to messages
    const messages = conversation.messages || [];
    messages.push({
      role: 'user',
      content: answer,
      timestamp: new Date().toISOString(),
    });

    // Build conversation history for OpenAI
    const openaiMessages: Array<{ role: "system" | "user" | "assistant", content: string }> = [
      { role: 'system' as const, content: ONBOARDING_SYSTEM_PROMPT },
    ];

    // Add conversation history
    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.content) {
        openaiMessages.push({
          role: 'assistant' as const,
          content: JSON.stringify(msg.content),
        });
      } else if (msg.role === 'user') {
        openaiMessages.push({
          role: 'user' as const,
          content: `User answered: "${msg.content}"`,
        });
      }
    }

    // Add instruction for next question
    const questionCount = conversation.question_count + 1;
    openaiMessages.push({
      role: 'user' as const,
      content: `Based on this answer and everything learned so far, generate the next question. This is question ${questionCount}. Aim for 18-25 total questions. Return valid JSON only.`,
    });

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error("No response from AI");
    }

    let aiResponse: OnboardingResponse;
    try {
      aiResponse = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse AI response:", responseText);
      throw new Error("Invalid AI response format");
    }

    // Update partial profile if provided
    let partialProfile = conversation.partial_profile || {};
    if (aiResponse.profileUpdate) {
      partialProfile = deepMerge(partialProfile, aiResponse.profileUpdate);
    }

    // Add assistant response to messages
    messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
    });

    // Check if complete
    if (aiResponse.isComplete && aiResponse.profile) {
      // Mark conversation complete
      await supabase
        .from("onboarding_conversations")
        .update({
          messages,
          partial_profile: aiResponse.profile,
          is_complete: true,
          question_count: questionCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation.id);

      // Save complete profile
      await supabase
        .from("user_profiles")
        .upsert({
          user_id: userId,
          archetype: aiResponse.profile.archetype,
          summary: aiResponse.profile.summary,
          profile_data: aiResponse.profile,
          life_season: aiResponse.profile.lifeContext?.season,
          role_type: aiResponse.profile.role?.type,
          industry: aiResponse.profile.role?.industry,
          specific_role: aiResponse.profile.role?.specificRole,
          dashboard_density: aiResponse.profile.preferences?.dashboardDensity || 0.5,
          coach_style: aiResponse.profile.preferences?.coach?.personality || 'supportive',
          gamification_level: aiResponse.profile.preferences?.gamification?.overall || 'moderate',
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      // Create initial dashboard layout
      await createDashboardLayout(userId, aiResponse.profile);

      return NextResponse.json({
        isComplete: true,
        profile: aiResponse.profile,
        questionNumber: questionCount,
      });
    }

    // Update conversation
    await supabase
      .from("onboarding_conversations")
      .update({
        messages,
        partial_profile: partialProfile,
        question_count: questionCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation.id);

    return NextResponse.json({
      question: aiResponse.question,
      subtext: aiResponse.subtext,
      options: aiResponse.options,
      allowOther: aiResponse.allowOther || false,
      allowMultiple: aiResponse.allowMultiple || false,
      otherPlaceholder: aiResponse.otherPlaceholder,
      isComplete: false,
      conversationId: conversation.id,
      questionNumber: questionCount + 1,
    });

  } catch (error) {
    console.error("[Onboarding Next]", error);
    return NextResponse.json(
      { error: "Failed to get next question" },
      { status: 500 }
    );
  }
}

// Helper: Deep merge objects
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(
        (target[key] as Record<string, unknown>) || {},
        source[key] as Record<string, unknown>
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// Helper: Create dashboard layout based on profile
async function createDashboardLayout(userId: string, profile: any) {
  const widgets = profile.dashboardConfig?.widgets || getDefaultWidgets(profile);

  const layoutData = {
    widgets,
    style: profile.preferences?.visualStyle || 'dark_focused',
    density: profile.dashboardConfig?.density || 'comfortable',
    gamification: profile.preferences?.gamification || { xp: true, streaks: true, celebrations: 'moderate' },
    coach: profile.preferences?.coach || { personality: 'supportive_friend', tone: 'warm', pushLevel: 0.5 },
  };

  await supabase
    .from("user_dashboard_layouts")
    .upsert({
      user_id: userId,
      layout_data: layoutData,
      is_active: true,
      version: 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
}

function getDefaultWidgets(profile: any): string[] {
  const widgets = ['daily_focus', 'guidance_stream'];

  const role = profile.role?.type;
  const industry = profile.role?.industry;

  // Add role-specific widgets
  if (role === 'self_employed' || industry?.includes('mortgage') || industry?.includes('real_estate') || industry?.includes('sales')) {
    widgets.push('pipeline_snapshot', 'follow_up_radar', 'prospecting_tracker');
  }

  if (role === 'employed' || role === 'manager') {
    widgets.push('tasks_today', 'calendar_preview', 'meetings_prep');
  }

  if (profile.family?.situation?.includes('kids') || profile.family?.situation?.includes('parent')) {
    widgets.push('family_commitments');
  }

  if (profile.preferences?.gamification?.xp) {
    widgets.push('xp_progress');
  }

  if (profile.preferences?.gamification?.streaks) {
    widgets.push('streak_tracker');
  }

  // Add standard widgets
  widgets.push('quick_capture', 'upcoming_week');

  return widgets;
}
