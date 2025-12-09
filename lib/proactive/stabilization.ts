// Emotional Stabilization System
// Provides grounding exercises, breathing techniques, and supportive responses
import { llmJson, llmComplete } from "@/lib/llm/client";

export interface StabilizationExercise {
  name: string;
  duration_seconds: number;
  type: "breathing" | "grounding" | "cognitive" | "physical" | "mindfulness";
  instructions: string[];
  voice_guidance?: string;
}

export const BREATHING_EXERCISES: StabilizationExercise[] = [
  {
    name: "4-7-8 Breathing",
    duration_seconds: 120,
    type: "breathing",
    instructions: [
      "Breathe in quietly through your nose for 4 seconds",
      "Hold your breath for 7 seconds",
      "Exhale completely through your mouth for 8 seconds",
      "Repeat 4 times"
    ],
    voice_guidance: "Let's do some calming breaths together. Breathe in... 2, 3, 4. Hold... 2, 3, 4, 5, 6, 7. And slowly out... 2, 3, 4, 5, 6, 7, 8."
  },
  {
    name: "Box Breathing",
    duration_seconds: 60,
    type: "breathing",
    instructions: [
      "Breathe in for 4 seconds",
      "Hold for 4 seconds",
      "Breathe out for 4 seconds",
      "Hold for 4 seconds",
      "Repeat"
    ],
    voice_guidance: "Let's try box breathing. In for 4... hold for 4... out for 4... hold for 4. You're doing great."
  }
];

export const GROUNDING_EXERCISES: StabilizationExercise[] = [
  {
    name: "5-4-3-2-1 Senses",
    duration_seconds: 180,
    type: "grounding",
    instructions: [
      "Name 5 things you can see",
      "Name 4 things you can touch",
      "Name 3 things you can hear",
      "Name 2 things you can smell",
      "Name 1 thing you can taste"
    ],
    voice_guidance: "Let's ground ourselves in the present moment. Look around you. What are 5 things you can see right now?"
  },
  {
    name: "Body Scan",
    duration_seconds: 300,
    type: "grounding",
    instructions: [
      "Close your eyes and take a deep breath",
      "Notice sensations in your feet",
      "Move attention up through your legs",
      "Notice your torso, arms, shoulders",
      "Finally, your neck, face, and head",
      "Take another deep breath"
    ],
    voice_guidance: "Close your eyes. Let's scan through your body, starting at your feet. Notice any sensations without judgment."
  }
];

export const COGNITIVE_REFRAMES: StabilizationExercise[] = [
  {
    name: "Thought Challenge",
    duration_seconds: 300,
    type: "cognitive",
    instructions: [
      "What thought is causing distress?",
      "What evidence supports this thought?",
      "What evidence contradicts it?",
      "What would you tell a friend thinking this?",
      "What's a more balanced perspective?"
    ]
  },
  {
    name: "Worry Time-Box",
    duration_seconds: 600,
    type: "cognitive",
    instructions: [
      "Set a 10-minute timer",
      "Write down all your worries",
      "For each worry, ask: Can I control this?",
      "If yes, write one small action",
      "If no, practice letting go",
      "When timer ends, move on"
    ]
  }
];

export function getExerciseForEmotion(emotion: string, intensity: number): StabilizationExercise {
  const highIntensityEmotions = ["anxious", "stressed", "overwhelmed", "panicked"];
  const lowMoodEmotions = ["sad", "depressed", "hopeless", "lonely"];
  
  if (highIntensityEmotions.includes(emotion) || intensity > 0.8) {
    return BREATHING_EXERCISES[0]; // 4-7-8 for high anxiety
  }
  
  if (lowMoodEmotions.includes(emotion)) {
    return GROUNDING_EXERCISES[0]; // 5-4-3-2-1 for grounding
  }
  
  return BREATHING_EXERCISES[1]; // Default to box breathing
}

export async function generateSupportiveResponse(
  emotion: string,
  context: string,
  userName?: string
): Promise<string> {
  const prompt = `Generate a brief, warm, supportive response for someone feeling ${emotion}.

Context: ${context}
${userName ? `Their name is ${userName}.` : ""}

Guidelines:
- Be validating, not dismissive
- Acknowledge the emotion
- Offer gentle perspective without toxic positivity
- Keep it to 2-3 sentences
- Be warm but not patronizing

Response:`;

  return llmComplete(prompt, { temperature: 0.7 });
}

export async function generateCoachingMicroLesson(
  topic: string,
  userContext: string
): Promise<{
  title: string;
  key_insight: string;
  action_step: string;
  reflection_question: string;
}> {
  const prompt = `Create a micro-coaching lesson on: ${topic}

User context: ${userContext}

Return JSON:
{
  "title": "catchy 3-5 word title",
  "key_insight": "one key insight in 1-2 sentences",
  "action_step": "one small action they can take today",
  "reflection_question": "one question for self-reflection"
}`;

  return llmJson({ prompt });
}

export default {
  BREATHING_EXERCISES,
  GROUNDING_EXERCISES,
  COGNITIVE_REFRAMES,
  getExerciseForEmotion,
  generateSupportiveResponse,
  generateCoachingMicroLesson,
};