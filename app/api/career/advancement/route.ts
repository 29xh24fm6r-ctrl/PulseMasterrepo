import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SENIORITY_ORDER = ['entry', 'mid', 'senior', 'staff', 'manager', 'senior_manager', 'director', 'vp', 'c_level'];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, jobModel, timeframe = 12 } = body;

  const currentLevel = SENIORITY_ORDER.indexOf(jobModel.seniorityId);
  const nextLevel = SENIORITY_ORDER[Math.min(currentLevel + 1, SENIORITY_ORDER.length - 1)];

  const context = `Current role: ${jobModel.fullTitle} at ${jobModel.company || 'their company'}
Industry: ${jobModel.industryName}
Function: ${jobModel.functionName}
Current level: ${jobModel.seniorityName}
Target: ${nextLevel} level
Timeframe: ${timeframe} months
${jobModel.deepDiveInsights ? `
Team: ${jobModel.deepDiveInsights.teamContext?.teamSize || 'Unknown'}
Reports to: ${jobModel.deepDiveInsights.teamContext?.reportsTo || 'Unknown'}
Current challenge: ${jobModel.deepDiveInsights.challenges?.[0] || 'Unknown'}
2-year goal: ${jobModel.deepDiveInsights.goals?.twoYear || 'Get promoted'}` : ''}`;

  if (action === 'plan') {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a career strategist. Create an advancement plan in JSON:
{
  "summary": "2-3 sentence overview",
  "keySkills": ["skill 1", "skill 2", "skill 3"],
  "experiences": ["experience to seek 1", "experience 2"],
  "quickWins": ["30-day win 1", "30-day win 2"],
  "relationships": ["relationship to build 1", "relationship 2"],
  "risks": ["risk to watch 1", "risk 2"]
}
Be specific to their role and situation.`
        },
        { role: "user", content: context }
      ],
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });
    return NextResponse.json({ ok: true, plan: JSON.parse(completion.choices[0]?.message?.content || '{}') });
  }

  if (action === 'skills') {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze skill gaps for promotion. Return JSON:
{
  "current": [{"skill": "name", "level": "strong/moderate/basic"}],
  "gaps": [{"skill": "name", "importance": "critical/important/nice", "howToAcquire": "specific suggestion"}],
  "priority": ["skill to focus on first", "then this", "then this"]
}`
        },
        { role: "user", content: context }
      ],
      temperature: 0.6,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });
    return NextResponse.json({ ok: true, skills: JSON.parse(completion.choices[0]?.message?.content || '{}') });
  }

  if (action === 'milestones') {
    const quarters = Math.ceil(timeframe / 3);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Create ${quarters} quarterly milestones. Return JSON:
{
  "milestones": [
    {"quarter": "Q1", "theme": "Foundation", "goals": ["goal 1", "goal 2"], "checkpoint": "question to ask yourself"}
  ],
  "weeklyHabits": ["habit 1", "habit 2"],
  "monthlyReviews": ["what to review each month"]
}`
        },
        { role: "user", content: context }
      ],
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });
    return NextResponse.json({ ok: true, milestones: JSON.parse(completion.choices[0]?.message?.content || '{}') });
  }

  return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
}
