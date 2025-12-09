import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  getExerciseForEmotion, 
  generateSupportiveResponse,
  BREATHING_EXERCISES,
  GROUNDING_EXERCISES 
} from "@/lib/proactive/stabilization";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { emotion, intensity, context, exercise_type } = await req.json();

  // Get appropriate exercise
  let exercise;
  if (exercise_type === "breathing") {
    exercise = BREATHING_EXERCISES[0];
  } else if (exercise_type === "grounding") {
    exercise = GROUNDING_EXERCISES[0];
  } else {
    exercise = getExerciseForEmotion(emotion || "stressed", intensity || 0.5);
  }

  // Generate supportive message
  const supportiveMessage = await generateSupportiveResponse(
    emotion || "uncertain",
    context || "seeking support"
  );

  return NextResponse.json({
    exercise,
    supportive_message: supportiveMessage,
    spoken: `${supportiveMessage} ${exercise.voice_guidance || `Let's try the ${exercise.name} technique.`}`,
  });
}