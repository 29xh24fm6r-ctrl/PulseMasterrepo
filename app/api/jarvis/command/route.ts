import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { llmJson, llmComplete } from "@/lib/llm/client";
import { generateProactiveInterventions } from "@/lib/proactive/engine";
import { getExerciseForEmotion, generateSupportiveResponse } from "@/lib/proactive/stabilization";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { command } = await req.json();
  if (!command) {
    return NextResponse.json({ error: "No command provided" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Classify the command
  const classifyPrompt = `Classify this voice command and extract intent:

Command: "${command}"

Return JSON:
{
  "intent": "status_check|task_query|emotion_check|summarize|simulate|coaching|greeting|unknown",
  "entities": {},
  "requires_data": true/false
}`;

  const classification = await llmJson({ prompt: classifyPrompt });
  const intent = classification.intent;

  let response = "";
  const data: any = {};

  try {
    switch (intent) {
      case "greeting":
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
        response = `${timeGreeting}! I'm here to help. You can ask me about your tasks, emotions, or how you're tracking against your goals.`;
        break;

      case "status_check":
        // Get overall status
        const today = new Date().toISOString().split("T")[0];
        const [tasksRes, emotionRes, momentumRes] = await Promise.all([
          supabase.from("tasks").select("status").eq("user_id", userId).gte("created_at", today),
          supabase.from("emo_states").select("detected_emotion, valence").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(1),
          supabase.from("id_momentum_daily").select("net_momentum").eq("user_id", userId).order("date", { ascending: false }).limit(1),
        ]);

        const tasks = tasksRes.data || [];
        const completed = tasks.filter(t => t.status === "completed").length;
        const pending = tasks.filter(t => t.status === "pending").length;
        const emotion = emotionRes.data?.[0];
        const momentum = momentumRes.data?.[0];

        response = `Today you've completed ${completed} tasks with ${pending} still pending. `;
        if (emotion) {
          response += `Your recent mood shows you're feeling ${emotion.detected_emotion}. `;
        }
        if (momentum) {
          const momentumDesc = momentum.net_momentum > 0.2 ? "positive" : momentum.net_momentum < -0.2 ? "needs attention" : "steady";
          response += `Your identity momentum is ${momentumDesc}.`;
        }
        break;

      case "task_query":
        const { data: nextTask } = await supabase
          .from("tasks")
          .select("title, priority, due_date")
          .eq("user_id", userId)
          .eq("status", "pending")
          .order("priority", { ascending: false })
          .order("due_date", { ascending: true })
          .limit(1)
          .single();

        if (nextTask) {
          response = `Your next task is "${nextTask.title}". It's ${nextTask.priority} priority.`;
          if (nextTask.due_date) {
            response += ` Due ${new Date(nextTask.due_date).toLocaleDateString()}.`;
          }
          response += " Would you like me to start a focus session for this?";
        } else {
          response = "You don't have any pending tasks. Great job staying on top of things! Want to capture a new task?";
        }
        break;

      case "emotion_check":
        const { data: recentEmotions } = await supabase
          .from("emo_states")
          .select("detected_emotion, valence, intensity")
          .eq("user_id", userId)
          .order("occurred_at", { ascending: false })
          .limit(3);

        if (recentEmotions && recentEmotions.length > 0) {
          const current = recentEmotions[0];
          response = `Based on your recent activity, you seem to be feeling ${current.detected_emotion}. `;
          
          if (current.valence < -0.3) {
            const supportive = await generateSupportiveResponse(current.detected_emotion, "checking in");
            response += supportive;
            const exercise = getExerciseForEmotion(current.detected_emotion, current.intensity);
            response += ` Would you like to try a ${exercise.name} exercise?`;
          } else if (current.valence > 0.3) {
            response += "That's wonderful! This positive energy is a great opportunity to tackle something challenging.";
          }
        } else {
          response = "I don't have recent emotion data. How are you feeling right now? Happy, stressed, calm, or something else?";
        }
        break;

      case "summarize":
        // Fetch yesterday's summary
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const { data: summary } = await supabase
          .from("tb_daily_summaries")
          .select("summary, key_events, emotional_theme")
          .eq("user_id", userId)
          .eq("date", yesterday)
          .single();

        if (summary) {
          response = `Yesterday: ${summary.summary} `;
          if (summary.emotional_theme) {
            response += `The emotional theme was ${summary.emotional_theme}.`;
          }
        } else {
          response = "I don't have a summary for yesterday yet. Want me to create one from your activity data?";
        }
        break;

      case "simulate":
        response = "What scenario would you like to simulate? For example, 'What if I quit my job?' or 'What if I moved to a new city?'";
        break;

      case "coaching":
        const interventions = await generateProactiveInterventions(userId);
        if (interventions.length > 0) {
          const top = interventions[0];
          response = `${top.title}. ${top.message}`;
        } else {
          response = "You're doing well! No urgent coaching points right now. Keep up the great work.";
        }
        break;

      default:
        // General AI response
        response = await llmComplete(`You are Jarvis, a helpful AI life assistant. Respond conversationally to: "${command}". Keep response under 3 sentences.`, { temperature: 0.7 });
    }

    return NextResponse.json({
      response,
      spoken: response,
      intent,
      data,
    });

  } catch (error) {
    console.error("Jarvis command error:", error);
    return NextResponse.json({
      response: "I encountered an issue processing that. Could you try rephrasing?",
      spoken: "I encountered an issue processing that. Could you try rephrasing?",
      error: true,
    });
  }
}
