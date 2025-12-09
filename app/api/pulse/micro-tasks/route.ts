import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(request: Request) {
  try {
    const { task } = await request.json();

    if (!task || !task.title) {
      return NextResponse.json({ error: "Task with title required" }, { status: 400 });
    }

    const prompt = `You are an ADHD-friendly task coach. Break down this task into 3-5 tiny, actionable micro-tasks that create dopamine hits and momentum.

TASK: "${task.title}"
${task.project ? `PROJECT: ${task.project}` : ''}
${task.priority ? `PRIORITY: ${task.priority}` : ''}
${task.dueDate ? `DUE: ${task.dueDate}` : ''}

Rules:
- Each micro-task should take 2-10 minutes MAX
- Start with the easiest possible first step (to overcome inertia)
- Use specific, concrete action verbs (Open, Write, Send, Review, etc.)
- Make each step feel achievable and satisfying
- The final step should be a "victory lap" type action

Return ONLY a JSON array with this exact format, no other text:
[
  {"title": "specific action step", "estimatedMinutes": 3},
  {"title": "next specific step", "estimatedMinutes": 5}
]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not parse micro-tasks from response");
    }

    const microTasks = JSON.parse(jsonMatch[0]);
    
    // Add IDs and rewards
    const REWARDS = ['🎉', '⭐', '🔥', '💪', '🚀', '✨', '🌟', '💎', '👏'];
    const enrichedTasks = microTasks.map((mt: any, index: number) => ({
      id: String(index + 1),
      title: mt.title,
      estimatedMinutes: mt.estimatedMinutes || 5,
      completed: false,
      dopamineReward: index === microTasks.length - 1 ? '🏆' : REWARDS[Math.floor(Math.random() * REWARDS.length)]
    }));

    return NextResponse.json({ microTasks: enrichedTasks });

  } catch (error) {
    console.error("Micro-tasks generation error:", error);
    
    // Fallback to generic tasks if AI fails
    const fallbackTasks = [
      { id: '1', title: 'Open and review what needs to be done', estimatedMinutes: 2, completed: false, dopamineReward: '⭐' },
      { id: '2', title: 'Identify the very first small step', estimatedMinutes: 3, completed: false, dopamineReward: '🔥' },
      { id: '3', title: 'Complete that first step', estimatedMinutes: 10, completed: false, dopamineReward: '💪' },
      { id: '4', title: 'Check progress and plan next move', estimatedMinutes: 5, completed: false, dopamineReward: '🚀' },
      { id: '5', title: 'Final push - finish strong!', estimatedMinutes: 5, completed: false, dopamineReward: '🏆' },
    ];
    
    return NextResponse.json({ microTasks: fallbackTasks });
  }
}