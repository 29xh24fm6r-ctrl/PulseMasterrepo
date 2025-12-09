import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Scenario categories - user picks category, then we generate specific scenarios
const SCENARIO_CATEGORIES = [
  { id: 'difficult_client', label: '😤 Difficult Client Conversation', icon: '😤', description: 'Handle pushback, complaints, or tough asks' },
  { id: 'negotiation', label: '🤝 Negotiation', icon: '🤝', description: 'Rates, terms, deadlines, resources' },
  { id: 'bad_news', label: '📉 Delivering Bad News', icon: '📉', description: 'Declines, delays, problems' },
  { id: 'internal_politics', label: '🏢 Internal Politics', icon: '🏢', description: 'Managing up, cross-team conflicts' },
  { id: 'career_conversation', label: '💼 Career Conversation', icon: '💼', description: 'Raises, promotions, feedback' },
  { id: 'sales_pitch', label: '🎯 Sales / Persuasion', icon: '🎯', description: 'Convince someone of something' },
  { id: 'conflict_resolution', label: '⚖️ Conflict Resolution', icon: '⚖️', description: 'Resolve disagreements professionally' },
  { id: 'custom', label: '✨ Custom Scenario', icon: '✨', description: 'Describe your own situation' },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'categories') {
    return NextResponse.json({ ok: true, categories: SCENARIO_CATEGORIES });
  }
  
  return NextResponse.json({ ok: true, categories: SCENARIO_CATEGORIES });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, categoryId, jobModel, customDescription, scenario, messages } = body;

  // Generate scenarios for a category based on job model
  if (action === 'generate_scenarios') {
    const context = buildJobContext(jobModel);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Generate 5 realistic role-play scenarios for someone in this role to practice.

THEIR ROLE: ${context}

CATEGORY: ${categoryId}

Return JSON array:
{
  "scenarios": [
    {
      "id": "unique_id",
      "title": "Short title (5-7 words)",
      "situation": "The situation YOU (the practitioner) are facing (2 sentences, written in second person 'You...')",
      "otherPerson": "Who they'll be talking to - name + brief description (e.g., 'Sarah Chen, a demanding CFO who's been a client for 3 years')",
      "otherPersonMood": "Their emotional state/attitude going in",
      "yourGoal": "What YOU need to accomplish",
      "difficulty": "easy/medium/hard"
    }
  ]
}

Make scenarios specific to their industry and role. Use realistic names and details.
The "otherPerson" is who the AI will play. The user practices being themselves.`
        },
        { role: "user", content: `Generate ${categoryId} scenarios` }
      ],
      temperature: 0.9,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '{"scenarios":[]}');
    return NextResponse.json({ ok: true, scenarios: result.scenarios });
  }

  // Generate a custom scenario from user description
  if (action === 'custom_scenario') {
    const context = buildJobContext(jobModel);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Create a role-play scenario based on the user's description.

THEIR ROLE: ${context}

Return JSON:
{
  "id": "custom",
  "title": "Short title",
  "situation": "The situation written in second person",
  "otherPerson": "Specific person with name and description",
  "otherPersonMood": "Their emotional state",
  "yourGoal": "What the user needs to accomplish",
  "difficulty": "medium"
}`
        },
        { role: "user", content: customDescription }
      ],
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });
    
    const scenario = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return NextResponse.json({ ok: true, scenario });
  }

  // Start a roleplay - AI plays the other person, speaks first
  if (action === 'start') {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are playing a character in a role-play exercise. The user is practicing a professional conversation.

YOU ARE: ${scenario.otherPerson}
YOUR MOOD/ATTITUDE: ${scenario.otherPersonMood}
THE SITUATION: ${scenario.situation}

IMPORTANT: You are the OTHER person, not the practitioner. The user is practicing being themselves.

Stay in character throughout. Be realistic - make it challenging but not impossible.
React naturally based on your character's personality and mood.
Keep responses to 2-3 sentences.

Start the conversation as your character would naturally initiate or respond to the situation.`
        },
        { role: "user", content: "Begin. Say your opening line as the character." }
      ],
      temperature: 0.9,
      max_tokens: 150,
    });
    return NextResponse.json({ ok: true, response: completion.choices[0]?.message?.content });
  }

  // Continue the conversation
  if (action === 'respond') {
    const systemPrompt = `You are playing a character in a role-play exercise.

YOU ARE: ${scenario.otherPerson}
YOUR MOOD/ATTITUDE: ${scenario.otherPersonMood}
THE SITUATION: ${scenario.situation}

Stay in character. React naturally to what the user says. Be realistic.
If they handle things well, you can soften. If they handle things poorly, you can escalate.
Keep responses to 2-3 sentences.`;

    const chatMessages: any[] = [{ role: "system", content: systemPrompt }];
    messages.forEach((m: any) => chatMessages.push({ 
      role: m.role === 'user' ? 'user' : 'assistant', 
      content: m.content 
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      temperature: 0.9,
      max_tokens: 150,
    });
    return NextResponse.json({ ok: true, response: completion.choices[0]?.message?.content });
  }

  // Get feedback on the conversation
  if (action === 'feedback') {
    const context = buildJobContext(jobModel);
    const transcript = messages.map((m: any) => 
      `${m.role === 'user' ? 'PRACTITIONER (user)' : scenario.otherPerson.split(',')[0].toUpperCase()}: ${m.content}`
    ).join('\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert communication coach reviewing a role-play practice session.

PRACTITIONER'S ROLE: ${context}
SCENARIO: ${scenario.situation}
THEIR GOAL: ${scenario.yourGoal}
OTHER PERSON: ${scenario.otherPerson}

Analyze how the practitioner handled the conversation.

Return JSON:
{
  "score": 1-10,
  "goalAchieved": true/false,
  "whatWorked": ["specific effective thing they did", "another good thing"],
  "toImprove": ["specific actionable suggestion", "another suggestion"],
  "keyMoment": "The most critical moment in the conversation and how they handled it",
  "alternativePhrase": "A specific phrase they could try next time in a key moment",
  "summary": "2 sentence overall assessment"
}`
        },
        { role: "user", content: `Review this conversation:\n\n${transcript}` }
      ],
      temperature: 0.6,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const feedback = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return NextResponse.json({ ok: true, feedback });
  }

  return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
}

function buildJobContext(jobModel: any): string {
  if (!jobModel) return 'Professional';
  
  let context = `${jobModel.fullTitle || 'Professional'}`;
  if (jobModel.industryName) context += ` in ${jobModel.industryName}`;
  if (jobModel.company) context += ` at ${jobModel.company}`;
  
  if (jobModel.deepDiveInsights) {
    const di = jobModel.deepDiveInsights;
    if (di.teamContext?.teamSize) context += `. Team: ${di.teamContext.teamSize}`;
    if (di.teamContext?.reportsTo) context += `. ${di.teamContext.reportsTo}`;
    if (di.roleSpecifics) {
      const specs = Object.entries(di.roleSpecifics).map(([k, v]) => `${k}: ${v}`).join(', ');
      if (specs) context += `. Role details: ${specs}`;
    }
  }
  
  return context;
}
