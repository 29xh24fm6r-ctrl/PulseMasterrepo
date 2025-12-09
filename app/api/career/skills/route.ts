import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, skill, jobModel, lessonNumber, userResponse } = body;

  const context = `Role: ${jobModel.fullTitle}
Industry: ${jobModel.industryName}
${jobModel.deepDiveInsights?.roleSpecifics ? `Specifics: ${JSON.stringify(jobModel.deepDiveInsights.roleSpecifics)}` : ''}`;

  if (action === 'curriculum') {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Create a 5-lesson micro-curriculum for "${skill}". Return JSON:
{
  "overview": "Why this skill matters for their role (2 sentences)",
  "lessons": [
    {"number": 1, "title": "Lesson title", "objective": "What they'll learn", "duration": "10-15 min"}
  ]
}
Make it specific to their role and industry.`
        },
        { role: "user", content: context }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });
    return NextResponse.json({ ok: true, curriculum: JSON.parse(completion.choices[0]?.message?.content || '{}') });
  }

  if (action === 'lesson') {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Create lesson ${lessonNumber} for "${skill}". Return JSON:
{
  "title": "Lesson title",
  "intro": "Hook + why this matters (2 sentences)",
  "concept": "The key concept explained simply (3-4 sentences)",
  "example": "Real example from their industry",
  "technique": {"name": "Technique name", "steps": ["step 1", "step 2", "step 3"]},
  "tip": "Pro tip for their specific role",
  "exercise": "Brief practice exercise",
  "takeaway": "One sentence key takeaway"
}`
        },
        { role: "user", content: `${context}\nSkill: ${skill}\nLesson: ${lessonNumber}` }
      ],
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });
    return NextResponse.json({ ok: true, lesson: JSON.parse(completion.choices[0]?.message?.content || '{}') });
  }

  if (action === 'evaluate') {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Evaluate their exercise response. Return JSON:
{
  "score": 1-10,
  "feedback": "Specific feedback (2-3 sentences)",
  "suggestion": "One thing to try differently",
  "encouragement": "Brief encouragement"
}`
        },
        { role: "user", content: `Skill: ${skill}\nTheir response: ${userResponse}` }
      ],
      temperature: 0.6,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });
    return NextResponse.json({ ok: true, evaluation: JSON.parse(completion.choices[0]?.message?.content || '{}') });
  }

  if (action === 'quick_tip') {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Give one quick, actionable tip for "${skill}" specific to their role. Return JSON:
{"tip": "The tip", "why": "Why it works", "example": "Brief example"}`
        },
        { role: "user", content: context }
      ],
      temperature: 0.9,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });
    return NextResponse.json({ ok: true, ...JSON.parse(completion.choices[0]?.message?.content || '{}') });
  }

  return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
}
