/**
 * Voice Orchestration Engine v1
 * lib/voice/orchestrator.ts
 * 
 * Processes voice commands and generates spoken responses
 */

import { getOpenAI } from "@/services/ai/openai";
import { supabaseAdmin } from "@/lib/supabase";
import { callAIJson } from "@/lib/ai/call";
import { getEmotionalState } from "@/lib/emotional/engine";
import { getTodaysPlan } from "@/lib/planning/engine";
import { getLatestExecutiveSummary } from "@/lib/executive/engine";
import { getSuggestedActions } from "@/lib/autonomy/engine";
import { trackTTSUsage } from "@/services/usage";



// ============================================
// TYPES
// ============================================

export type VoiceCommandIntent =
  | "greeting"
  | "status_check"
  | "get_plan"
  | "get_insights"
  | "add_task"
  | "complete_task"
  | "emotional_checkin"
  | "get_summary"
  | "unknown";

export interface VoiceCommandResult {
  intent: VoiceCommandIntent;
  confidence: number;
  parameters: Record<string, any>;
  response: string;
  shouldSpeak: boolean;
  actions?: Array<{ type: string; payload: any }>;
}

export interface PulseVoice {
  text: string;
  audioUrl?: string;
  emotion?: "neutral" | "warm" | "encouraging" | "concerned" | "celebratory";
}

// ============================================
// COMMAND PROCESSING
// ============================================

/**
 * Process a voice command transcript
 */
export async function processVoiceCommand(
  userId: string,
  transcript: string
): Promise<VoiceCommandResult> {
  // Parse intent
  const intentResult = await parseIntent(userId, transcript);

  // Execute based on intent
  const response = await executeIntent(userId, intentResult);

  // Log the interaction
  await logVoiceInteraction(userId, transcript, intentResult.intent, response);

  return response;
}

/**
 * Parse user intent from transcript
 */
async function parseIntent(
  userId: string,
  transcript: string
): Promise<{ intent: VoiceCommandIntent; confidence: number; parameters: Record<string, any> }> {
  const aiResult = await callAIJson<{
    intent: VoiceCommandIntent;
    confidence: number;
    parameters: Record<string, any>;
  }>({
    userId,
    feature: "voice_orchestrator",
    systemPrompt: `You parse voice commands for a personal assistant called Pulse. Identify the user's intent.

Possible intents:
- greeting: User is saying hello or starting conversation
- status_check: User wants to know how they're doing / what's happening
- get_plan: User wants their daily plan
- get_insights: User wants AI insights or suggestions
- add_task: User wants to add something to their plan
- complete_task: User completed something
- emotional_checkin: User is sharing feelings or wants emotional support
- get_summary: User wants their executive summary / weekly report
- unknown: Cannot determine intent

Output ONLY valid JSON.`,
    userPrompt: `Parse this voice command: "${transcript}"

Output as JSON:
{
  "intent": "one of the intents listed above",
  "confidence": 0.0 to 1.0,
  "parameters": { any extracted parameters like task_name, mood, etc }
}`,
    maxTokens: 200,
    temperature: 0.2,
  });

  if (aiResult.success && aiResult.data) {
    return {
      intent: aiResult.data.intent || "unknown",
      confidence: aiResult.data.confidence || 0.5,
      parameters: aiResult.data.parameters || {},
    };
  }

  return { intent: "unknown", confidence: 0.5, parameters: {} };
}

/**
 * Execute the parsed intent
 */
async function executeIntent(
  userId: string,
  intentResult: { intent: VoiceCommandIntent; confidence: number; parameters: Record<string, any> }
): Promise<VoiceCommandResult> {
  const { intent, confidence, parameters } = intentResult;

  switch (intent) {
    case "greeting":
      return handleGreeting(userId);

    case "status_check":
      return handleStatusCheck(userId);

    case "get_plan":
      return handleGetPlan(userId);

    case "get_insights":
      return handleGetInsights(userId);

    case "emotional_checkin":
      return handleEmotionalCheckin(userId, parameters);

    case "get_summary":
      return handleGetSummary(userId);

    case "add_task":
      return handleAddTask(userId, parameters);

    case "complete_task":
      return handleCompleteTask(userId, parameters);

    default:
      return {
        intent: "unknown",
        confidence,
        parameters,
        response: "I'm not sure what you need. You can ask me about your plan, insights, or just say how you're feeling.",
        shouldSpeak: true,
      };
  }
}

// ============================================
// INTENT HANDLERS
// ============================================

async function handleGreeting(userId: string): Promise<VoiceCommandResult> {
  const state = await getEmotionalState(userId);
  const hour = new Date().getHours();

  let timeGreeting = "Good evening";
  if (hour < 12) timeGreeting = "Good morning";
  else if (hour < 17) timeGreeting = "Good afternoon";

  let response = `${timeGreeting}! I'm here and ready to help.`;

  if (state.currentMood) {
    if (state.recentTrend === "improving") {
      response += " I've noticed you've been feeling better lately. That's great!";
    } else if (state.needsSupport) {
      response += " How are you feeling today? I'm here if you want to talk.";
    }
  }

  return {
    intent: "greeting",
    confidence: 1,
    parameters: {},
    response,
    shouldSpeak: true,
  };
}

async function handleStatusCheck(userId: string): Promise<VoiceCommandResult> {
  const [state, plan, actions] = await Promise.all([
    getEmotionalState(userId),
    getTodaysPlan(userId),
    getSuggestedActions(userId, 3),
  ]);

  let response = "Here's your status: ";

  if (plan) {
    const completed = plan.items.filter((i) => i.status === "completed").length;
    const total = plan.items.length;
    response += `You've completed ${completed} of ${total} items on your plan today. `;
  }

  if (state.currentMood) {
    response += `Your mood is tracking as ${state.currentMood}`;
    if (state.recentTrend !== "unknown") {
      response += ` and ${state.recentTrend}`;
    }
    response += ". ";
  }

  if (actions.length > 0) {
    response += `I have ${actions.length} suggestions for you when you're ready.`;
  }

  return {
    intent: "status_check",
    confidence: 1,
    parameters: {},
    response,
    shouldSpeak: true,
  };
}

async function handleGetPlan(userId: string): Promise<VoiceCommandResult> {
  const plan = await getTodaysPlan(userId);

  if (!plan || plan.items.length === 0) {
    return {
      intent: "get_plan",
      confidence: 1,
      parameters: {},
      response: "You don't have a plan for today yet. Would you like me to generate one?",
      shouldSpeak: true,
      actions: [{ type: "suggest_generate_plan", payload: {} }],
    };
  }

  const pending = plan.items.filter((i) => i.status === "planned");
  const inProgress = plan.items.filter((i) => i.status === "in_progress");

  let response = "";

  if (inProgress.length > 0) {
    response = `You're currently working on: ${inProgress[0].title}. `;
  }

  if (pending.length > 0) {
    response += `Next up: ${pending.slice(0, 2).map((i) => i.title).join(", ")}. `;
    if (pending.length > 2) {
      response += `Plus ${pending.length - 2} more items.`;
    }
  }

  if (!response) {
    response = "You've completed everything on your plan! Great work.";
  }

  return {
    intent: "get_plan",
    confidence: 1,
    parameters: {},
    response,
    shouldSpeak: true,
  };
}

async function handleGetInsights(userId: string): Promise<VoiceCommandResult> {
  const actions = await getSuggestedActions(userId, 3);

  if (actions.length === 0) {
    return {
      intent: "get_insights",
      confidence: 1,
      parameters: {},
      response: "I don't have any urgent suggestions right now. You're on track!",
      shouldSpeak: true,
    };
  }

  const topAction = actions[0];
  let response = `Here's my top suggestion: ${topAction.title}. `;

  if (topAction.description) {
    response += topAction.description.split(".")[0] + ". ";
  }

  if (actions.length > 1) {
    response += `I have ${actions.length - 1} more suggestions when you're ready.`;
  }

  return {
    intent: "get_insights",
    confidence: 1,
    parameters: {},
    response,
    shouldSpeak: true,
  };
}

async function handleEmotionalCheckin(
  userId: string,
  parameters: Record<string, any>
): Promise<VoiceCommandResult> {
  const state = await getEmotionalState(userId);

  let response = "I hear you. ";

  if (state.needsSupport) {
    response +=
      "It sounds like you might be going through a tough time. Remember, it's okay to not be okay. Would you like to talk about it, or would a breathing exercise help?";
  } else {
    response +=
      "Thanks for checking in. How would you rate your energy and stress levels right now?";
  }

  return {
    intent: "emotional_checkin",
    confidence: 1,
    parameters,
    response,
    shouldSpeak: true,
    actions: [{ type: "prompt_checkin_form", payload: {} }],
  };
}

async function handleGetSummary(userId: string): Promise<VoiceCommandResult> {
  const summary = await getLatestExecutiveSummary(userId);

  if (!summary) {
    return {
      intent: "get_summary",
      confidence: 1,
      parameters: {},
      response: "You don't have an executive summary yet. Would you like me to generate your first weekly report?",
      shouldSpeak: true,
      actions: [{ type: "suggest_generate_summary", payload: {} }],
    };
  }

  let response = `Your overall score is ${summary.overallScore} out of 100. ${summary.summary} `;

  if (summary.highlights.length > 0) {
    response += `Highlight: ${summary.highlights[0]}. `;
  }

  if (summary.concerns.length > 0) {
    response += `Something to watch: ${summary.concerns[0]}.`;
  }

  return {
    intent: "get_summary",
    confidence: 1,
    parameters: {},
    response,
    shouldSpeak: true,
  };
}

async function handleAddTask(
  userId: string,
  parameters: Record<string, any>
): Promise<VoiceCommandResult> {
  const taskName = parameters.task_name || parameters.task;

  if (!taskName) {
    return {
      intent: "add_task",
      confidence: 0.7,
      parameters,
      response: "What would you like to add to your plan?",
      shouldSpeak: true,
    };
  }

  return {
    intent: "add_task",
    confidence: 1,
    parameters: { task_name: taskName },
    response: `Got it, I'll add "${taskName}" to your plan.`,
    shouldSpeak: true,
    actions: [{ type: "add_plan_item", payload: { title: taskName, type: "task" } }],
  };
}

async function handleCompleteTask(
  userId: string,
  parameters: Record<string, any>
): Promise<VoiceCommandResult> {
  const taskName = parameters.task_name || parameters.task;

  return {
    intent: "complete_task",
    confidence: 1,
    parameters,
    response: taskName
      ? `Excellent! I'll mark "${taskName}" as complete. Keep up the momentum!`
      : "Great job completing that task! What did you finish?",
    shouldSpeak: true,
  };
}

// ============================================
// TEXT-TO-SPEECH
// ============================================

/**
 * Generate speech from text
 */
export async function generateSpeech(
  userId: string,
  text: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "nova"
): Promise<Buffer> {
  const openai = getOpenAI();
  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice,
    input: text,
  });

  // Track usage
  await trackTTSUsage(userId, text.length, false);

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer;
}

/**
 * Generate Pulse's voice response with emotion
 */
export async function generatePulseVoice(
  userId: string,
  text: string,
  emotion: PulseVoice["emotion"] = "neutral"
): Promise<PulseVoice> {
  // Map emotion to voice
  const voiceMap: Record<string, "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"> = {
    neutral: "nova",
    warm: "nova",
    encouraging: "shimmer",
    concerned: "fable",
    celebratory: "shimmer",
  };

  const voice = voiceMap[emotion || "neutral"];

  // For now, just return text (audio generation can be called separately)
  return {
    text,
    emotion,
  };
}

// ============================================
// LOGGING
// ============================================

async function logVoiceInteraction(
  userId: string,
  transcript: string,
  intent: VoiceCommandIntent,
  result: VoiceCommandResult
): Promise<void> {
  try {
    await (supabaseAdmin as any).from("third_brain_events").insert({
      user_id: userId,
      type: "voice_command",
      source: "voice_orchestrator",
      title: `Voice: ${intent}`,
      summary: transcript.substring(0, 200),
      raw_payload: {
        transcript,
        intent,
        response: result.response,
        confidence: result.confidence,
      },
    });
  } catch (error) {
    console.error("[Voice] Failed to log interaction:", error);
  }
}