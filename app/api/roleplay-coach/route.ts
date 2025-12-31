import { NextRequest, NextResponse } from "next/server";
import {
  RoleplayRequest,
  RoleplayResponse,
  RoleplaySession,
  RoleplaySessionConfig,
  RoleplaySessionSummary,
  RoleplayState,
  InternalState,
  SessionScores,
  XPAwards,
  RelationshipProfile,
  PERSONA_TEMPLATES,
  CONTEXT_XP_MAPPING,
  calculateBaseXP,
  getDefaultInternalState,
} from "@/lib/roleplay/types";

// In-memory session storage (use Redis/DB in production)
const sessions = new Map<string, RoleplaySession>();

// ============================================
// SYSTEM PROMPTS
// ============================================

function buildRoleplaySystemPrompt(config: RoleplaySessionConfig, internalState: InternalState): string {
  const profile = config.relationship_profile;
  const difficulty = config.difficulty;
  
  let personaDescription = "";
  const behaviorGuidelines = "";
  
  if (profile) {
    // Use relationship profile
    personaDescription = `
You are playing ${profile.name}, who is the user's ${profile.relationship_type.replace("_", " ")}.

ABOUT THIS PERSON:
${profile.summary}

COMMUNICATION STYLE:
- Tone: ${profile.communication_style.tone}
- Directness: ${profile.communication_style.directness}/5
- Emotional Intensity: ${profile.communication_style.emotional_intensity}/5
- Conflict Style: ${profile.communication_style.conflict_style}
- ${profile.communication_style.likes_detail ? "Likes detailed explanations" : "Prefers brevity"}
- ${profile.communication_style.prefers_facts_over_feelings ? "Prefers facts over feelings" : ""}
- ${profile.communication_style.prefers_feelings_over_facts ? "Prefers feelings over facts" : ""}

CORE MOTIVES: ${profile.core_motives.join(", ")}
CORE FEARS: ${profile.core_fears.join(", ")}

TRIGGERS (topics/phrases that escalate them): ${profile.triggers.join(", ")}
GREEN LIGHTS (things that help them open up): ${profile.green_lights.join(", ")}

COMMON PHRASES THEY USE: "${profile.common_phrases.join('", "')}"
${profile.swears_or_not ? "May use occasional profanity when frustrated" : "Doesn't swear"}
${profile.uses_humor ? "Uses humor" : "Generally serious"}

CURRENT STATE:
- Trust Level: ${profile.trust_level}/5
- Current Tension: ${profile.current_tension}/5

PATTERNS:
- Recurring conflicts: ${profile.patterns.recurring_conflicts.join(", ")}
- What usually helps repair: ${profile.patterns.successful_repair_moves.join(", ")}
- What makes things worse: ${profile.patterns.escalation_patterns.join(", ")}
`;
  } else {
    // Use generic persona template based on context
    const templateKey = getTemplateKeyForContext(config.context_type);
    const template = PERSONA_TEMPLATES[templateKey];
    
    personaDescription = `
You are playing a ${template.name}: ${template.description}

COMMUNICATION STYLE:
- Tone: ${template.default_tone}
- Directness: ${template.default_directness}/5
- Emotional Intensity: ${template.default_intensity}/5
- Conflict Style: ${template.default_conflict_style}

COMMON BEHAVIORS: ${template.common_behaviors.join(", ")}
TYPICAL OBJECTIONS/RESPONSES: ${template.typical_objections.join(", ")}
`;
  }

  // Difficulty scaling
  const difficultyInstructions = getDifficultyInstructions(difficulty);
  
  // User profile accommodations
  let userAccommodations = "";
  if (config.user_profile) {
    if (config.user_profile.wants_soft_training) {
      userAccommodations = `
The user is practicing social skills and wants gentle training. Be realistic but not harsh.
Give them openings to succeed. Acknowledge good attempts even if imperfect.
`;
    }
    if (config.user_profile.prefers_short_turns) {
      userAccommodations += `Keep your responses concise - 1-3 sentences typically.`;
    }
  }

  return `You are the Pulse OS Roleplay Coach in ROLEPLAY mode.

SCENARIO: ${config.scenario_description}
USER'S GOAL: ${config.user_goal}

${personaDescription}

DIFFICULTY LEVEL: ${difficulty}/5
${difficultyInstructions}

${userAccommodations}

INTERNAL STATE (hidden from user, guides your responses):
- Trust: ${internalState.trust}/100
- Frustration: ${internalState.frustration}/100  
- Openness: ${internalState.openness}/100
- Engagement: ${internalState.engagement}/100

RULES:
1. Stay COMPLETELY in character. Never break character or mention being an AI.
2. Respond naturally as this person would, based on their profile and current emotional state.
3. If the user hits a TRIGGER, show increased frustration/defensiveness.
4. If the user does something from GREEN LIGHTS, show increased openness/trust.
5. Adjust your internal state based on how the conversation goes.
6. If the user says "end roleplay", "pause", "stop", or similar, acknowledge and let them know they can get feedback.

Respond as ${profile?.name || "the character"} would. Do not add meta-commentary.`;
}

function getTemplateKeyForContext(context: string): string {
  const mapping: Record<string, string> = {
    sales: "skeptical_prospect",
    business: "tired_boss",
    leadership: "tired_boss",
    interview: "anxious_interviewer",
    networking: "stranger_small_talk",
    dating: "nervous_first_date",
    romantic: "upset_spouse",
    family: "difficult_parent",
    friends: "supportive_friend",
    personal_conflict: "upset_spouse",
    social_skills_practice: "stranger_small_talk",
    other: "supportive_friend",
  };
  return mapping[context] || "supportive_friend";
}

function getDifficultyInstructions(difficulty: number): string {
  if (difficulty <= 2) {
    return `
DIFFICULTY: EASY
- Be more forgiving of communication mistakes
- Provide obvious openings for the user to make progress
- Don't push back too hard on objections
- Give the user time to think and respond
`;
  } else if (difficulty === 3) {
    return `
DIFFICULTY: MODERATE
- Respond realistically - not too easy, not too hard
- Have reasonable objections and concerns
- Require the user to demonstrate good communication to make progress
`;
  } else {
    return `
DIFFICULTY: CHALLENGING
- Be more demanding and less forgiving
- Interrupt occasionally if the user rambles
- Push back firmly on weak arguments
- Require excellent communication skills to make real progress
- Show impatience if the user wastes time
`;
  }
}

function buildCoachPrompt(session: RoleplaySession): string {
  const config = session.config;
  const messages = session.messages;
  
  const conversationTranscript = messages
    .filter(m => m.role !== "system")
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  return `You are the Pulse OS Roleplay Coach in COACH mode.

The user just completed a roleplay session. Analyze their performance and provide structured feedback.

SCENARIO: ${config.scenario_description}
USER'S GOAL: ${config.user_goal}
CONTEXT TYPE: ${config.context_type}
DIFFICULTY: ${config.difficulty}/5
${config.relationship_profile ? `PERSON PLAYED: ${config.relationship_profile.name} (${config.relationship_profile.relationship_type})` : "GENERIC SCENARIO"}

CONVERSATION TRANSCRIPT:
${conversationTranscript}

${config.user_profile?.wants_soft_training ? "NOTE: This user prefers gentle, encouraging feedback. Be supportive while still being helpful." : ""}

Provide your analysis in this EXACT format:

## Summary
[2-4 sentence summary of what happened]

## Scorecard (1-10)
- Rapport & Empathy: [score]
- Clarity of Goal: [score]
- Listening & Questions: [score]
- Emotional Regulation: [score]
- Handling Objections/Conflict: [score]
- Closing/Next Step: [score]

## Strengths
[3-6 bullet points of specific things they did well]

## Areas for Improvement
[3-6 bullet points of specific behaviors to work on]

## Better Phrases to Try
[5-10 alternative phrases they could use, formatted as:
Instead of: "[what they said]"
Try: "[better version]"]

## Micro-Drills
[2-4 small practice exercises they can do]

## Emotional Trajectory
[One sentence describing how the emotional tone shifted, e.g., "Started tense → built rapport → slight tension at the end"]

## Outcome
[One of: improved, won, lost, neutral, open_ended]

---

Now output the structured JSON summary (this will be parsed by the system):

\`\`\`json
{
  "session_id": "${session.config.session_id}",
  "timestamp": "${new Date().toISOString()}",
  "context_type": "${config.context_type}",
  "scenario_description": "${config.scenario_description.replace(/"/g, '\\"')}",
  "user_goal": "${config.user_goal.replace(/"/g, '\\"')}",
  "relationship_used": ${!!config.relationship_profile},
  ${config.relationship_profile ? `"person_name": "${config.relationship_profile.name}",` : ""}
  ${config.relationship_profile ? `"relationship_type": "${config.relationship_profile.relationship_type}",` : ""}
  "outcome": "[outcome from above]",
  "scores": {
    "rapport_empathy": [number],
    "clarity_of_goal": [number],
    "listening_and_questions": [number],
    "emotional_regulation": [number],
    "handling_objections_conflict": [number],
    "closing_or_next_step": [number]
  },
  "strengths": ["...", "..."],
  "improvement_areas": ["...", "..."],
  "suggested_phrases": ["...", "..."],
  "micro_drills": ["...", "..."],
  "emotional_trajectory": "[trajectory]",
  "xp_awards": {
    "${CONTEXT_XP_MAPPING[config.context_type]}": [calculated XP based on scores and difficulty]
  },
  "profile_update_notes": ["optional hints for updating the relationship profile"]
}
\`\`\``;
}

// ============================================
// STATE MACHINE HANDLERS
// ============================================

async function handleSetup(config: Partial<RoleplaySessionConfig>): Promise<RoleplayResponse> {
  const sessionId = `rp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const fullConfig: RoleplaySessionConfig = {
    session_id: sessionId,
    scenario_description: config.scenario_description || "General conversation practice",
    user_goal: config.user_goal || "Practice communication skills",
    difficulty: config.difficulty || 3,
    context_type: config.context_type || "other",
    relationship_profile: config.relationship_profile,
    user_profile: config.user_profile,
  };

  const session: RoleplaySession = {
    config: fullConfig,
    state: "ROLEPLAY",
    internal_state: getDefaultInternalState(fullConfig.relationship_profile),
    messages: [],
    started_at: new Date().toISOString(),
  };

  sessions.set(sessionId, session);

  const characterName = fullConfig.relationship_profile?.name || 
    PERSONA_TEMPLATES[getTemplateKeyForContext(fullConfig.context_type)]?.name || 
    "the other person";

  // Build setup message
  let setupMessage = `**Scenario Set Up**\n\n`;
  setupMessage += `📍 **Situation:** ${fullConfig.scenario_description}\n\n`;
  setupMessage += `🎯 **Your Goal:** ${fullConfig.user_goal}\n\n`;
  setupMessage += `⚡ **Difficulty:** ${"⭐".repeat(fullConfig.difficulty)}${"☆".repeat(5 - fullConfig.difficulty)}\n\n`;
  
  if (fullConfig.relationship_profile) {
    setupMessage += `👤 **You're talking to:** ${fullConfig.relationship_profile.name} (your ${fullConfig.relationship_profile.relationship_type.replace("_", " ")})\n\n`;
    setupMessage += `💡 **About them:** ${fullConfig.relationship_profile.summary}\n\n`;
  } else {
    setupMessage += `👤 **You're talking to:** ${characterName}\n\n`;
  }

  setupMessage += `---\n\n`;
  setupMessage += `I'll play **${characterName}**. You start when you're ready.\n\n`;
  setupMessage += `*Say "end roleplay" or "get feedback" at any time to stop and receive coaching.*`;

  // Suggested openers for anxious users
  let suggestedResponses: string[] | undefined;
  if (fullConfig.user_profile?.anxiety_level && fullConfig.user_profile.anxiety_level >= 3) {
    suggestedResponses = getSuggestedOpeners(fullConfig.context_type);
  }

  return {
    session_id: sessionId,
    state: "ROLEPLAY",
    message: setupMessage,
    character_name: characterName,
    suggested_responses: suggestedResponses,
  };
}

function getSuggestedOpeners(context: string): string[] {
  const openers: Record<string, string[]> = {
    sales: [
      "Hi, thanks for taking the time to meet. How's your day going?",
      "I appreciate you fitting me in. Before I dive in, what's most important to you right now?",
      "Thanks for the opportunity. What prompted you to take this call?",
    ],
    interview: [
      "Thank you for having me. I'm excited to learn more about this role.",
      "I've been looking forward to this conversation. What would be most helpful to cover?",
      "Thanks for your time today. I'd love to hear what you're looking for in this position.",
    ],
    dating: [
      "Hey! So nice to finally meet in person. How was your day?",
      "Hi! This place is great, have you been here before?",
      "Hey! I have to say, I was a bit nervous but you seem really easy to talk to.",
    ],
    romantic: [
      "Hey, do you have a few minutes? There's something I'd like to talk about.",
      "I've been thinking about us, and I wanted to share what's on my mind.",
      "Can we talk? I want to make sure we're on the same page about something.",
    ],
    family: [
      "Hey, thanks for making time to talk. There's something I've been wanting to discuss.",
      "I know we don't always see eye to eye, but I'd like to share my perspective.",
      "I appreciate you being willing to have this conversation with me.",
    ],
    social_skills_practice: [
      "Hey, mind if I sit here?",
      "Hi! Great weather today, isn't it?",
      "Excuse me, I couldn't help but notice... have we met before?",
    ],
    default: [
      "Hi, do you have a moment to talk?",
      "Thanks for taking the time. I wanted to discuss something with you.",
      "Hey, I appreciate you being here. Let me share what's on my mind.",
    ],
  };
  
  return openers[context] || openers.default;
}

async function handleMessage(
  sessionId: string,
  userMessage: string
): Promise<RoleplayResponse> {
  const session = sessions.get(sessionId);
  if (!session) {
    return {
      session_id: sessionId,
      state: "SETUP",
      message: "Session not found. Please start a new roleplay session.",
    };
  }

  // Check for end commands
  const lowerMessage = userMessage.toLowerCase();
  if (
    lowerMessage.includes("end roleplay") ||
    lowerMessage.includes("end role play") ||
    lowerMessage.includes("get feedback") ||
    lowerMessage.includes("stop roleplay") ||
    lowerMessage === "pause" ||
    lowerMessage === "stop"
  ) {
    session.state = "COACH";
    session.ended_at = new Date().toISOString();
    sessions.set(sessionId, session);
    
    return handleCoachMode(sessionId);
  }

  // Add user message to history
  session.messages.push({
    role: "user",
    content: userMessage,
    timestamp: new Date().toISOString(),
  });

  // Update internal state based on user message
  updateInternalState(session, userMessage);

  // Generate character response
  const characterResponse = await generateCharacterResponse(session);

  // Add character response to history
  session.messages.push({
    role: "character",
    content: characterResponse,
    timestamp: new Date().toISOString(),
    internal_state_snapshot: { ...session.internal_state },
  });

  sessions.set(sessionId, session);

  // Generate mood hint for UI
  const internalHint = getMoodHint(session.internal_state);

  // Suggested responses for anxious users
  let suggestedResponses: string[] | undefined;
  if (session.config.user_profile?.anxiety_level && session.config.user_profile.anxiety_level >= 4) {
    suggestedResponses = generateContextualSuggestions(session);
  }

  return {
    session_id: sessionId,
    state: "ROLEPLAY",
    message: characterResponse,
    character_name: session.config.relationship_profile?.name || "Character",
    internal_hint: internalHint,
    suggested_responses: suggestedResponses,
  };
}

function updateInternalState(session: RoleplaySession, userMessage: string): void {
  const state = session.internal_state;
  const profile = session.config.relationship_profile;
  const message = userMessage.toLowerCase();

  // Check for triggers
  if (profile?.triggers.some(t => message.includes(t.toLowerCase()))) {
    state.frustration = Math.min(100, state.frustration + 15);
    state.openness = Math.max(0, state.openness - 10);
  }

  // Check for green lights
  if (profile?.green_lights.some(g => message.includes(g.toLowerCase()))) {
    state.trust = Math.min(100, state.trust + 10);
    state.openness = Math.min(100, state.openness + 10);
    state.frustration = Math.max(0, state.frustration - 5);
  }

  // General positive indicators
  if (
    message.includes("i understand") ||
    message.includes("i hear you") ||
    message.includes("that makes sense") ||
    message.includes("you're right")
  ) {
    state.trust = Math.min(100, state.trust + 5);
    state.openness = Math.min(100, state.openness + 5);
  }

  // General negative indicators
  if (
    message.includes("you always") ||
    message.includes("you never") ||
    message.includes("that's wrong") ||
    message.includes("you're wrong")
  ) {
    state.frustration = Math.min(100, state.frustration + 10);
    state.openness = Math.max(0, state.openness - 5);
  }

  // Engagement based on question asking
  if (message.includes("?")) {
    state.engagement = Math.min(100, state.engagement + 5);
  }

  session.internal_state = state;
}

function getMoodHint(state: InternalState): string {
  if (state.frustration > 70) return "😤 Frustrated";
  if (state.frustration > 50) return "😐 Tense";
  if (state.openness > 70 && state.trust > 60) return "😊 Open";
  if (state.trust > 70) return "🤝 Trusting";
  if (state.engagement < 40) return "😑 Disengaged";
  return "😐 Neutral";
}

async function generateCharacterResponse(session: RoleplaySession): Promise<string> {
  // In production, this would call OpenAI with the system prompt
  // For now, return a mock response based on state
  
  const state = session.internal_state;
  const profile = session.config.relationship_profile;
  const lastUserMessage = session.messages[session.messages.length - 1]?.content || "";
  
  // Mock responses based on context and state
  if (state.frustration > 60) {
    const responses = [
      "Look, I hear what you're saying, but I'm not sure you're really getting where I'm coming from.",
      "That's... not really addressing what I said.",
      "I need you to actually listen to me here.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (state.openness > 60 && state.trust > 50) {
    const responses = [
      "Okay, I appreciate you saying that. Tell me more about what you're thinking.",
      "That's helpful to hear. I think we might be able to work something out.",
      "I'm glad we're talking about this. What else is on your mind?",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Default neutral responses
  const neutralResponses = [
    "I see. What makes you say that?",
    "Okay... go on.",
    "And what would that look like for you?",
    "Hmm, I'm not sure I follow. Can you explain more?",
  ];
  return neutralResponses[Math.floor(Math.random() * neutralResponses.length)];
}

function generateContextualSuggestions(session: RoleplaySession): string[] {
  const state = session.internal_state;
  
  if (state.frustration > 50) {
    return [
      "I can see this is frustrating. Help me understand what's bothering you most.",
      "You're right, and I want to address that. What would help?",
      "I hear you. Let me make sure I understand what you need.",
    ];
  }
  
  if (state.openness > 60) {
    return [
      "I appreciate you sharing that. What would be the ideal outcome for you?",
      "That makes sense. How can we move forward from here?",
      "Thank you for being open about this. What's most important to you?",
    ];
  }
  
  return [
    "Can you tell me more about that?",
    "What would be most helpful for you right now?",
    "I want to make sure I understand. What's the main concern?",
  ];
}

async function handleCoachMode(sessionId: string): Promise<RoleplayResponse> {
  const session = sessions.get(sessionId);
  if (!session) {
    return {
      session_id: sessionId,
      state: "COACH",
      message: "Session not found.",
    };
  }

  // In production, this would call OpenAI with the coach prompt
  // For now, generate a mock coaching response
  
  const messageCount = session.messages.filter(m => m.role === "user").length;
  const avgOpenness = session.internal_state.openness;
  const avgTrust = session.internal_state.trust;
  
  // Calculate mock scores
  const scores: SessionScores = {
    rapport_empathy: Math.min(10, Math.round(avgTrust / 10)),
    clarity_of_goal: Math.min(10, Math.round(5 + Math.random() * 3)),
    listening_and_questions: Math.min(10, Math.round(avgOpenness / 10)),
    emotional_regulation: Math.min(10, Math.round(8 - session.internal_state.frustration / 15)),
    handling_objections_conflict: Math.min(10, Math.round(5 + Math.random() * 3)),
    closing_or_next_step: Math.min(10, Math.round(4 + Math.random() * 4)),
  };

  const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / 6;
  const xpAmount = calculateBaseXP(scores, session.config.difficulty);
  const xpCategory = CONTEXT_XP_MAPPING[session.config.context_type];

  const summary: RoleplaySessionSummary = {
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    context_type: session.config.context_type,
    scenario_description: session.config.scenario_description,
    user_goal: session.config.user_goal,
    relationship_used: !!session.config.relationship_profile,
    person_name: session.config.relationship_profile?.name,
    relationship_type: session.config.relationship_profile?.relationship_type,
    outcome: avgScore >= 7 ? "improved" : avgScore >= 5 ? "neutral" : "open_ended",
    scores,
    strengths: [
      "Initiated the conversation confidently",
      "Asked follow-up questions to understand better",
      "Stayed calm under pressure",
    ],
    improvement_areas: [
      "Could acknowledge the other person's feelings more explicitly",
      "Try to summarize what you heard before responding",
      "Be more specific about what you're asking for",
    ],
    suggested_phrases: [
      'Instead of: "I think..." → Try: "From my perspective..."',
      'Instead of: "You should..." → Try: "What if we..."',
      'Instead of: "That\'s wrong" → Try: "I see it differently because..."',
    ],
    micro_drills: [
      "Practice: Write 3 ways to validate someone's feelings before stating your point",
      "Exercise: In your next conversation, count how many questions you ask vs. statements you make",
    ],
    emotional_trajectory: "Started neutral → built some rapport → maintained steady connection",
    xp_awards: {
      [xpCategory]: xpAmount,
    },
    profile_update_notes: session.config.relationship_profile
      ? ["User showed good empathy - consider noting this as an effective approach"]
      : undefined,
  };

  // Build coaching message
  let coachMessage = `## 🎭 Roleplay Complete!\n\n`;
  coachMessage += `### Summary\n`;
  coachMessage += `You had a ${messageCount}-exchange conversation practicing ${session.config.context_type.replace("_", " ")}. `;
  coachMessage += `Overall, you ${summary.outcome === "improved" ? "made good progress" : "held your ground"} toward your goal.\n\n`;
  
  coachMessage += `### 📊 Scorecard\n`;
  coachMessage += `| Skill | Score |\n|-------|-------|\n`;
  coachMessage += `| Rapport & Empathy | ${scores.rapport_empathy}/10 |\n`;
  coachMessage += `| Clarity of Goal | ${scores.clarity_of_goal}/10 |\n`;
  coachMessage += `| Listening & Questions | ${scores.listening_and_questions}/10 |\n`;
  coachMessage += `| Emotional Regulation | ${scores.emotional_regulation}/10 |\n`;
  coachMessage += `| Handling Objections | ${scores.handling_objections_conflict}/10 |\n`;
  coachMessage += `| Closing/Next Step | ${scores.closing_or_next_step}/10 |\n\n`;

  coachMessage += `### ✅ Strengths\n`;
  summary.strengths.forEach(s => { coachMessage += `- ${s}\n`; });
  
  coachMessage += `\n### 🎯 Areas to Improve\n`;
  summary.improvement_areas.forEach(a => { coachMessage += `- ${a}\n`; });
  
  coachMessage += `\n### 💬 Better Phrases to Try\n`;
  summary.suggested_phrases.forEach(p => { coachMessage += `- ${p}\n`; });
  
  coachMessage += `\n### 🏋️ Micro-Drills\n`;
  summary.micro_drills.forEach(d => { coachMessage += `- ${d}\n`; });

  coachMessage += `\n---\n`;
  coachMessage += `### ⚡ XP Earned: +${xpAmount} ${xpCategory.replace("_", " ").toUpperCase()}\n\n`;
  coachMessage += `*Great work practicing! Remember: every rep makes you better. 💪*`;

  // Clean up session
  sessions.delete(sessionId);

  return {
    session_id: sessionId,
    state: "COACH",
    message: coachMessage,
    summary,
  };
}

// ============================================
// MAIN HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: RoleplayRequest = await request.json();
    const { action, session_id, config, message } = body;

    let response: RoleplayResponse;

    switch (action) {
      case "start":
        if (!config) {
          return NextResponse.json(
            { error: "Config required to start session" },
            { status: 400 }
          );
        }
        response = await handleSetup(config);
        break;

      case "message":
        if (!session_id || !message) {
          return NextResponse.json(
            { error: "session_id and message required" },
            { status: 400 }
          );
        }
        response = await handleMessage(session_id, message);
        break;

      case "end":
      case "get_feedback":
        if (!session_id) {
          return NextResponse.json(
            { error: "session_id required" },
            { status: 400 }
          );
        }
        const session = sessions.get(session_id);
        if (session) {
          session.state = "COACH";
          sessions.set(session_id, session);
        }
        response = await handleCoachMode(session_id);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Roleplay Coach API error:", error);
    return NextResponse.json(
      { error: "Failed to process roleplay request" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Pulse OS Roleplay Coach",
    version: "1.0",
    states: ["SETUP", "ROLEPLAY", "COACH"],
    context_types: [
      "business", "sales", "leadership", "interview", "networking",
      "dating", "romantic", "family", "friends", "personal_conflict",
      "social_skills_practice", "other"
    ],
    persona_templates: Object.keys(PERSONA_TEMPLATES),
  });
}
