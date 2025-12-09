import { auth } from "@clerk/nextjs/server";
import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { MentorId } from "@/lib/philosophy/types";
import { getMentor } from "@/lib/philosophy/mentors";
import { loadMentorWithKernel, isValidMentorId } from "@/app/lib/brain-loader";
import { awardXP } from "@/lib/xp/award";
import { getSkillTreeForMentor } from "@/lib/philosophy/skill-trees";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface MentorMessage {
  role: "user" | "assistant";
  content: string;
}

interface PersonContext {
  id: string;
  name: string;
  company?: string;
  email?: string;
  type?: string;
  relationshipStatus?: string;
  lastContact?: string;
  notes?: string;
  rawData?: string;
}

interface CoachInsight {
  coachId: string;
  coachName: string;
  insight: string;
  action?: string;
  timestamp: string;
}

interface MasteredSkill {
  treeId: string;
  treeName: string;
  skillId: string;
  skillName: string;
}

interface MentorSessionRequest {
  mentorId: MentorId | string;
  userMessage: string;
  conversationHistory?: MentorMessage[];
  personContext?: PersonContext;
  coachInsights?: CoachInsight[];
  situation?: string;
}

async function fetchMasteredSkills(): Promise<MasteredSkill[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/philosophy/skills?mastered=true`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return data.ok ? data.masteredSkills : [];
  } catch {
    return [];
  }
}

function buildMentorSystemPrompt(
  mentorId: string, 
  brainContent: string,
  personContext?: PersonContext,
  coachInsights?: CoachInsight[],
  situation?: string,
  masteredSkills?: MasteredSkill[]
): string {
  const mentor = getMentor(mentorId as MentorId);
  const mentorTree = getSkillTreeForMentor(mentorId);
  
  let systemPrompt = `You are a Philosophy Mentor in Pulse OS.

## MENTOR BRAIN
${brainContent}

---

## CRITICAL RULES - FOLLOW EXACTLY

1. **BE BRIEF** — 3-5 sentences max. No lectures.
2. **ONE ACTION** — End EVERY response with ONE specific action they can take TODAY.
3. **STAY IN CHARACTER** — You ARE this mentor. Their voice, their style.
4. **NO LISTS** — Write in natural speech, not bullet points.
5. **ASK ONE QUESTION** — If appropriate, end with a single clarifying question.

## RESPONSE FORMAT

Your response should be:
- 2-4 sentences of wisdom/insight in the mentor's voice
- Then: "**Today:** [ONE specific action]"
`;

  // Add mastered skills context
  if (masteredSkills && masteredSkills.length > 0) {
    const relevantSkills = mentorTree 
      ? masteredSkills.filter(s => s.treeId === mentorTree.id)
      : masteredSkills;
    
    if (relevantSkills.length > 0) {
      systemPrompt += `

---

## STUDENT'S MASTERED SKILLS

This student has trained and mastered these skills. Reference them when relevant:

${relevantSkills.map(s => `- **${s.skillName}** (${s.treeName})`).join('\n')}

Build upon their existing knowledge. Reference their training when giving advice. For example:
- "You have mastered ${relevantSkills[0]?.skillName}. Apply that here..."
- "Remember your training in ${relevantSkills[0]?.skillName}..."
`;
    }
    
    // Also mention skills from other trees if they've cross-trained
    const otherSkills = masteredSkills.filter(s => !relevantSkills.includes(s));
    if (otherSkills.length > 0) {
      systemPrompt += `

They have also trained in other philosophies:
${otherSkills.slice(0, 5).map(s => `- ${s.skillName} (${s.treeName})`).join('\n')}

You may acknowledge their cross-training when relevant.
`;
    }
  }

  // Add person context if available
  if (personContext) {
    systemPrompt += `

---

## PERSON BEING DISCUSSED

The user is asking about a specific person. Use this intelligence:

**Name:** ${personContext.name}
${personContext.company ? `**Company:** ${personContext.company}` : ''}
${personContext.type ? `**Type:** ${personContext.type}` : ''}
${personContext.relationshipStatus ? `**Relationship Status:** ${personContext.relationshipStatus}` : ''}
${personContext.lastContact ? `**Last Contact:** ${personContext.lastContact}` : ''}
${personContext.notes ? `**Notes:** ${personContext.notes}` : ''}
${personContext.rawData ? `**Intelligence:** ${personContext.rawData.substring(0, 800)}` : ''}

Use this information to give SPECIFIC advice about this person. Reference them by name.
`;
  }

  // Add previous coach insights if available
  if (coachInsights && coachInsights.length > 0) {
    systemPrompt += `

---

## PREVIOUS COACH INSIGHTS

Other coaches have already advised on this situation. Build on their wisdom, don't repeat it:

`;
    for (const insight of coachInsights.slice(-3)) {
      systemPrompt += `**${insight.coachName}:** "${insight.insight}"
${insight.action ? `Action suggested: ${insight.action}` : ''}

`;
    }
    systemPrompt += `
Acknowledge what the other coaches said if relevant. Add YOUR unique perspective. Don't repeat their advice.
`;
  }

  // Add situation context
  if (situation) {
    systemPrompt += `

---

## SITUATION CONTEXT

The user is dealing with: ${situation}
`;
  }

  if (mentor) {
    systemPrompt += `

---

## THIS MENTOR
- **Name:** ${mentor.name}
- **Philosophy:** ${mentor.philosophy}  
- **Voice:** ${mentor.styleTags.join(", ")}

Remember: You ARE ${mentor.name}. Speak as they would — brief, powerful, actionable.
`;
  }

  return systemPrompt;
}

function shouldAwardXP(userMessage: string, conversationLength: number): { shouldAward: boolean; activity: string } {
  const lowerMessage = userMessage.toLowerCase();
  
  const growthIndicators = ["i understand", "that makes sense", "i'll try", "i will", "thank you", "helpful", "i needed to hear", "you're right", "i see now"];
  
  if (growthIndicators.some(indicator => lowerMessage.includes(indicator))) {
    return { shouldAward: true, activity: "mentor_insight_received" };
  }
  
  if (conversationLength === 0) {
    return { shouldAward: true, activity: "mentor_session_started" };
  }
  
  if (conversationLength >= 4) {
    return { shouldAward: true, activity: "mentor_deep_conversation" };
  }
  
  return { shouldAward: false, activity: "" };
}

function extractAction(response: string): string | undefined {
  const todayMatch = response.match(/\*\*Today:\*\*\s*(.+?)(?:\n|$)/i);
  if (todayMatch) {
    return todayMatch[1].trim();
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const usageCheck = await canMakeAICall(userId, "philosophy_mentor", 5);
    if (!usageCheck.allowed) return NextResponse.json({ error: usageCheck.reason, requiresUpgrade: usageCheck.requiresUpgrade }, { status: 402 });

    const body: MentorSessionRequest = await request.json();
    const { 
      mentorId, 
      userMessage, 
      conversationHistory = [],
      personContext,
      coachInsights,
      situation,
    } = body;

    if (!mentorId || !isValidMentorId(mentorId)) {
      return NextResponse.json({ error: `Invalid mentor ID: ${mentorId}` }, { status: 400 });
    }

    if (!userMessage || userMessage.trim().length === 0) {
      return NextResponse.json({ error: "User message is required" }, { status: 400 });
    }

    const mentor = getMentor(mentorId as MentorId);
    if (!mentor) {
      return NextResponse.json({ error: `Mentor not found: ${mentorId}` }, { status: 404 });
    }

    // Fetch brain content and mastered skills in parallel
    const [brainContent, masteredSkills] = await Promise.all([
      loadMentorWithKernel(mentorId),
      fetchMasteredSkills(),
    ]);
    
    if (!brainContent) {
      return NextResponse.json({ error: "Failed to load mentor knowledge" }, { status: 500 });
    }

    const systemPrompt = buildMentorSystemPrompt(
      mentorId, 
      brainContent,
      personContext,
      coachInsights,
      situation,
      masteredSkills
    );

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    const recentHistory = conversationHistory.slice(-6);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    messages.push({ role: "user", content: userMessage });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 300,
      presence_penalty: 0.3,
      frequency_penalty: 0.3,
    });

    const mentorResponse = completion.choices[0]?.message?.content || "";

    if (!mentorResponse) {
      return NextResponse.json({ error: "No response generated" }, { status: 500 });
    }

    const actionSuggested = extractAction(mentorResponse);

    // XP handling
    const xpCheck = shouldAwardXP(userMessage, conversationHistory.length);
    let xpAwarded = undefined;

    if (xpCheck.shouldAward) {
      try {
        const result = await awardXP(xpCheck.activity, "mentor_session", { 
          notes: `${mentor.name} session${personContext ? ` about ${personContext.name}` : ''}` 
        });
        xpAwarded = { 
          amount: result.amount, 
          category: result.category, 
          activity: xpCheck.activity, 
          wasCrit: result.wasCrit 
        };
      } catch (xpError) {
        console.error("Failed to award XP:", xpError);
      }
    }

    return NextResponse.json({ 
      mentorResponse, 
      mentorId, 
      mentorName: mentor.name, 
      xpAwarded,
      coachInsight: {
        coachId: mentorId,
        coachName: mentor.name,
        insight: mentorResponse.split('**Today:**')[0].trim(),
        action: actionSuggested,
      },
      // Include relevant mastered skills for UI
      relevantSkills: masteredSkills.filter(s => {
        const mentorTree = getSkillTreeForMentor(mentorId);
        return mentorTree && s.treeId === mentorTree.id;
      }),
    });

  } catch (error) {
    console.error("Mentor Session API error:", error);
    return NextResponse.json({ error: "Failed to process mentor session" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Pulse OS Mentor Session API",
    version: "2.1",
    features: [
      "Person context awareness",
      "Cross-coach intelligence sharing", 
      "Situation tracking",
      "Skill tree awareness",
    ],
    availableMentors: [
      { id: "marcus_aurelius", name: "Marcus Aurelius", philosophy: "Stoicism", icon: "👑" },
      { id: "seneca", name: "Seneca", philosophy: "Stoicism", icon: "📜" },
      { id: "epictetus", name: "Epictetus", philosophy: "Stoicism", icon: "⛓️" },
      { id: "musashi", name: "Miyamoto Musashi", philosophy: "Samurai", icon: "⚔️" },
      { id: "sun_tzu", name: "Sun Tzu", philosophy: "Strategy", icon: "🏹" },
      { id: "lao_tzu", name: "Lao Tzu", philosophy: "Taoism", icon: "☯️" },
      { id: "zen_master", name: "Zen Master", philosophy: "Zen", icon: "🧘" },
      { id: "buddha", name: "The Buddha", philosophy: "Buddhism", icon: "☸️" },
      { id: "covey", name: "Stephen Covey", philosophy: "7 Habits", icon: "📘" },
      { id: "goggins", name: "David Goggins", philosophy: "Discipline", icon: "💀" },
    ],
  });
}
