import { NextRequest, NextResponse } from "next/server";
import {
  MotivationRequest,
  MotivationResponse,
  ProactiveTriggerRequest,
  XPCallbackRequest,
  MotivationEvent,
  UserMotivationalState,
  PulsePersona,
} from "@/lib/motivation/types";
import { PERSONAS, getPersonaById } from "@/lib/motivation/persona-library";
import {
  routeMotivation,
  classifyUserState,
  updatePersonaEffectiveness,
} from "@/lib/motivation/router";

// In-memory storage (use Redis/DB in production)
const motivationEvents = new Map<string, MotivationEvent>();
const userEffectivenessHistory = new Map<string, Record<string, number>>();

// Generate unique event ID
function generateEventId(): string {
  return `mot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Build GPT system prompt for motivation
function buildMotivationPrompt(
  personas: PulsePersona[],
  intensity: "low" | "medium" | "high",
  state: UserMotivationalState
): string {
  const personaDescriptions = personas
    .map(
      (p) => `
### ${p.displayName}
- Tone: ${p.toneDescription}
- Style Guidelines: ${p.styleGuidelines.join("; ")}
- Example Phrases (for inspiration, not verbatim): ${p.examplePhrases.join(" | ")}
`
    )
    .join("\n");

  const intensityGuide =
    intensity === "low"
      ? "Be gentle, supportive, and nurturing. No harsh language."
      : intensity === "high"
      ? "Be intense, challenging, and direct. Light a fire under them."
      : "Be balanced - supportive but with a push toward action.";

  return `You are Pulse Motivational Coach, a master motivator that adapts to the user's needs.

## Persona Profiles to Blend
${personaDescriptions}

## User's Current State
- Emotional State: ${state.emotion}
- Energy Level: ${state.energyLevel}/5
- Urgency: ${state.urgency}
- Needs: ${state.needs.join(", ")}
- Identity Path: ${state.identityPath || "Not specified"}
- Recent Patterns: ${state.recentPatterns.join(", ") || "None noted"}

## Intensity Level: ${intensity.toUpperCase()}
${intensityGuide}

## Your Goals
1. Speak directly to the user's current situation
2. Blend the styles of the given personas naturally
3. Be concise - deliverable in 20-60 seconds of speech
4. End with ONE clear, actionable micro-step they can take RIGHT NOW
5. Never use harmful language or push beyond healthy limits
6. Be authentic, not preachy

## Output Format
Respond with a short motivational message (3-6 sentences) followed by a micro-action.

Remember: You're not giving a lecture. You're igniting action.`;
}

// Generate motivational message (mock - would use OpenAI in production)
function generateMotivationalMessage(
  personas: PulsePersona[],
  intensity: "low" | "medium" | "high",
  state: UserMotivationalState
): { message: string; microAction: string } {
  const primaryPersona = personas[0];

  // Select appropriate template based on state and intensity
  const templates = {
    low: {
      messages: [
        `Take a breath. You're not behind - you're exactly where you need to be right now. ${primaryPersona.examplePhrases[0]} The path forward isn't about perfection. It's about the next small step.`,
        `I see you. I see the weight you're carrying. And I want you to know - it's okay to not have it all figured out. ${primaryPersona.examplePhrases[0]} What matters is that you're still here, still trying.`,
        `Sometimes the bravest thing you can do is be gentle with yourself. ${primaryPersona.examplePhrases[0]} You don't have to conquer the world today. You just have to show up.`,
      ],
      microActions: [
        "Take 3 deep breaths, then write down one thing you're grateful for right now.",
        "Close your eyes for 30 seconds and just breathe. Then open just one tab you need.",
        "Put your hand on your heart. Say 'I am enough.' Then take one tiny step forward.",
      ],
    },
    medium: {
      messages: [
        `Here's the truth: ${primaryPersona.examplePhrases[0]} You have what it takes. The doubt you're feeling? That's just your comfort zone trying to keep you safe. But you weren't made for safe. You were made for growth.`,
        `${primaryPersona.examplePhrases[0]} Stop waiting for the perfect moment. This IS the moment. The gap between where you are and where you want to be? It closes one action at a time.`,
        `Listen to me: ${primaryPersona.examplePhrases[0]} Every master was once a disaster. Every success story started with someone who refused to quit. That someone is you. Right now.`,
      ],
      microActions: [
        "Set a 5-minute timer and work on the hardest thing on your list. Just 5 minutes.",
        "Open the document/task you've been avoiding. Write the first sentence. That's it.",
        "Text one person who believes in you. Tell them what you're about to do. Then do it.",
      ],
    },
    high: {
      messages: [
        `${primaryPersona.examplePhrases[0]} Wake up! The time for excuses is OVER. You know what you need to do. You've always known. The only thing standing between you and that goal is the bullshit story you keep telling yourself. ENOUGH.`,
        `You want to talk about tired? You want to talk about hard? ${primaryPersona.examplePhrases[0]} Millions of people would KILL for the opportunities you're wasting right now. Get up. Get moving. GET AFTER IT.`,
        `${primaryPersona.examplePhrases[0]} Stop negotiating with weakness. Stop making deals with mediocrity. You are CAPABLE of so much more than this. And somewhere inside you, you KNOW it. Prove it. Right now.`,
      ],
      microActions: [
        "Stand up. Do 10 pushups or jumping jacks. Then attack your #1 priority for 15 minutes straight.",
        "Put your phone in another room. Set a timer for 25 minutes. Execute with zero distractions.",
        "Write down your goal. Write down what you're going to do in the next 60 minutes. Then DO IT.",
      ],
    },
  };

  const template = templates[intensity];
  const messageIndex = Math.floor(Math.random() * template.messages.length);
  const actionIndex = Math.floor(Math.random() * template.microActions.length);

  return {
    message: template.messages[messageIndex],
    microAction: template.microActions[actionIndex],
  };
}

// Main motivation request handler
async function handleMotivationRequest(
  request: MotivationRequest,
  userId: string = "default_user"
): Promise<MotivationResponse> {
  // Classify user state
  const state = classifyUserState(request.rawText, request.context);

  // Get user's effectiveness history
  const history = userEffectivenessHistory.get(userId) || {};

  // Route to optimal personas
  const routing = routeMotivation(state, history);

  // Generate motivational content
  const { message, microAction } = generateMotivationalMessage(
    routing.personas,
    routing.intensity,
    state
  );

  // Create motivation event
  const eventId = generateEventId();
  const event: MotivationEvent = {
    id: eventId,
    timestamp: new Date().toISOString(),
    userId,
    detectedState: state,
    selectedPersonas: routing.personas.map((p) => p.id),
    intensity: routing.intensity,
    channel: request.context?.source || "text",
    contentSummary: message.slice(0, 100) + "...",
    microAction,
  };

  // Store event
  motivationEvents.set(eventId, event);

  return {
    personas: routing.personas.map((p) => p.id),
    intensity: routing.intensity,
    message,
    microAction,
    voiceScript: message, // Same as message for TTS
    motivationEventId: eventId,
  };
}

// Proactive trigger handler
async function handleProactiveTrigger(
  request: ProactiveTriggerRequest
): Promise<MotivationResponse> {
  // Create synthetic motivation request from trigger
  const syntheticRequest: MotivationRequest = {
    rawText: request.rawContext,
    context: {
      source: "text",
      prefersGentle: true, // Proactive triggers are gentler by default
    },
  };

  // Override state if provided
  if (request.inferredStateOverride) {
    // Would merge override with classified state in production
  }

  return handleMotivationRequest(syntheticRequest, request.userId);
}

// XP callback handler
async function handleXPCallback(
  request: XPCallbackRequest
): Promise<{ success: boolean; xpAwarded?: number }> {
  const event = motivationEvents.get(request.motivationEventId);
  if (!event) {
    return { success: false };
  }

  // Update event with feedback
  event.userImmediateFeedback = request.userFeedback || null;
  event.userFollowThrough = request.actionTaken;

  // Calculate effectiveness score
  event.effectivenessScore =
    request.actionTaken && request.userFeedback === "better"
      ? 10
      : request.actionTaken
      ? 7
      : request.userFeedback === "better"
      ? 5
      : request.userFeedback === "same"
      ? 3
      : 1;

  // Update persona effectiveness history
  const history = userEffectivenessHistory.get(event.userId) || {};
  const updatedHistory = updatePersonaEffectiveness(
    history,
    event.selectedPersonas,
    request.userFeedback || "same",
    request.actionTaken
  );
  userEffectivenessHistory.set(event.userId, updatedHistory);

  // Store updated event
  motivationEvents.set(request.motivationEventId, event);

  // Calculate XP award
  const xpAwarded = request.actionTaken ? 25 : 0;

  return { success: true, xpAwarded };
}

// API Routes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "request":
        const response = await handleMotivationRequest(body as MotivationRequest);
        return NextResponse.json(response);

      case "proactive-trigger":
        const proactiveResponse = await handleProactiveTrigger(
          body as ProactiveTriggerRequest
        );
        return NextResponse.json(proactiveResponse);

      case "xp-callback":
        const callbackResult = await handleXPCallback(body as XPCallbackRequest);
        return NextResponse.json(callbackResult);

      default:
        // Default to motivation request
        const defaultResponse = await handleMotivationRequest(body);
        return NextResponse.json(defaultResponse);
    }
  } catch (error) {
    console.error("Motivation API error:", error);
    return NextResponse.json(
      { error: "Failed to process motivation request" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Pulse Motivational Coach",
    version: "1.0",
    personaCount: PERSONAS.length,
    archetypes: [
      "military",
      "industry",
      "modern_motivator",
      "spiritual",
      "psychology",
      "sports",
      "philosophy",
      "oratory",
      "faith",
      "warrior",
      "creative",
    ],
    endpoints: {
      "POST /request": "Get personalized motivation",
      "POST /proactive-trigger": "Trigger motivation from system events",
      "POST /xp-callback": "Report action taken for XP",
    },
  });
}
