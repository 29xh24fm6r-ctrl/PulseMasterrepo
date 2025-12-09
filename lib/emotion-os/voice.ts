// Emotion OS Voice Functions
// Voice integration for emotional awareness

import { EmotionOS } from "./index";
import { EmotionType, InterventionType } from "./index";

// Voice function definitions for OpenAI
export const EMOTION_VOICE_TOOLS = [
  {
    type: "function",
    name: "detect_emotion",
    description: "Detect the user's current emotional state from what they just said",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "What the user said" },
        context: { type: "string", description: "Additional context about the situation" },
      },
      required: ["text"],
    },
  },
  {
    type: "function",
    name: "emotion_checkin",
    description: "Record how the user is feeling when they explicitly share their emotional state",
    parameters: {
      type: "object",
      properties: {
        emotion: {
          type: "string",
          enum: ["calm", "stressed", "overwhelmed", "anxious", "angry", "sad", "motivated", "confident", "excited", "frustrated", "neutral", "happy", "tired"],
        },
        intensity: { type: "number", description: "0-1 how strongly they feel it" },
        energy_level: { type: "number", description: "0-1 their energy level" },
        notes: { type: "string", description: "Any additional context they shared" },
      },
      required: ["emotion", "intensity"],
    },
  },
  {
    type: "function",
    name: "get_emotional_state",
    description: "Get the user's current emotional state and recent trends",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    type: "function",
    name: "suggest_intervention",
    description: "Suggest an intervention to help with their current emotional state",
    parameters: {
      type: "object",
      properties: {
        emotion: { type: "string", description: "The emotion they want help with" },
      },
      required: [],
    },
  },
  {
    type: "function",
    name: "log_intervention_result",
    description: "Log whether an intervention helped the user",
    parameters: {
      type: "object",
      properties: {
        intervention_type: {
          type: "string",
          enum: ["breathing", "movement", "journaling", "social", "rest", "reframe", "action", "distraction", "nature", "music", "meditation"],
        },
        intervention_name: { type: "string", description: "What they did" },
        was_effective: { type: "boolean", description: "Did it help?" },
        notes: { type: "string", description: "Any notes about the experience" },
      },
      required: ["intervention_type", "intervention_name", "was_effective"],
    },
  },
  {
    type: "function",
    name: "get_emotion_trend",
    description: "Get the user's emotional trends over time",
    parameters: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["day", "week", "month"], description: "Time period to analyze" },
      },
      required: [],
    },
  },
];

// Voice function handlers
export async function handleEmotionVoiceFunction(
  userId: string,
  functionName: string,
  args: any
): Promise<any> {
  switch (functionName) {
    case "detect_emotion": {
      const { text, context } = args;
      const state = await EmotionOS.detectAndStoreEmotion(userId, {
        text,
        source: "voice",
        additional_context: context,
      });

      return {
        emotion: state.detected_emotion,
        intensity: Math.round(state.intensity * 100) + "%",
        confidence: Math.round(state.confidence * 100) + "%",
        context: state.context_summary,
        message: getEmotionMessage(state.detected_emotion, state.intensity),
      };
    }

    case "emotion_checkin": {
      const { emotion, intensity, energy_level, notes } = args;
      
      const checkin = await EmotionOS.recordCheckin(userId, {
        emotion,
        intensity,
        energy_level,
        notes,
        checkin_type: "manual",
      });

      return {
        recorded: true,
        emotion: checkin.emotion,
        intensity: Math.round(intensity * 100) + "%",
        message: `Got it, you're feeling ${emotion} at ${Math.round(intensity * 100)}% intensity.`,
      };
    }

    case "get_emotional_state": {
      const context = await EmotionOS.getEmotionContext(userId);
      
      if (!context.current_state) {
        return {
          message: "I don't have a recent read on your emotional state. How are you feeling?",
          has_data: false,
        };
      }

      return {
        current_emotion: context.current_state.detected_emotion,
        intensity: Math.round(context.current_state.intensity * 100) + "%",
        trend: context.trend?.dominant_emotion || "unknown",
        volatility: context.trend?.volatility
          ? context.trend.volatility > 0.3
            ? "high"
            : "stable"
          : "unknown",
        message: `You're currently feeling ${context.current_state.detected_emotion} at ${Math.round(context.current_state.intensity * 100)}% intensity. Your overall trend this week is ${context.trend?.dominant_emotion || "neutral"}.`,
      };
    }

    case "suggest_intervention": {
      const { emotion } = args;
      
      // Get current state if emotion not specified
      let targetEmotion = emotion as EmotionType;
      if (!targetEmotion) {
        const current = await EmotionOS.getCurrentEmotionState(userId);
        targetEmotion = current?.detected_emotion || "stressed";
      }

      // Get effective interventions for this emotion
      const effective = await EmotionOS.getEffectiveInterventions(userId, targetEmotion);

      if (effective.length > 0) {
        const top = effective[0];
        return {
          intervention_type: top.intervention_type,
          intervention_name: top.intervention_name,
          effectiveness: Math.round((top.effectiveness_score || 0) * 100) + "%",
          message: `Based on what's worked for you before, I'd suggest ${top.intervention_name}. It's been effective ${Math.round((top.effectiveness_score || 0) * 100)}% of the time.`,
        };
      }

      // Suggest based on emotion type
      const suggestions = getDefaultInterventions(targetEmotion);
      return {
        suggestions,
        message: `For ${targetEmotion}, you might try: ${suggestions.join(", ")}. Let me know which one you try and whether it helps!`,
      };
    }

    case "log_intervention_result": {
      const { intervention_type, intervention_name, was_effective, notes } = args;

      // Get current emotion for context
      const current = await EmotionOS.getCurrentEmotionState(userId);

      const intervention = await EmotionOS.logIntervention(userId, {
        intervention_type,
        intervention_name,
        was_effective,
        emotion_before: current?.detected_emotion,
        intensity_before: current?.intensity,
        notes,
      });

      return {
        logged: true,
        effectiveness: Math.round((intervention.effectiveness_score || 0) * 100) + "%",
        times_used: intervention.times_used,
        message: was_effective
          ? `Great! I've logged that ${intervention_name} helped. It's now at ${Math.round((intervention.effectiveness_score || 0) * 100)}% effectiveness for you.`
          : `Got it, ${intervention_name} didn't help this time. I'll factor that into future suggestions.`,
      };
    }

    case "get_emotion_trend": {
      const { period = "week" } = args;
      const trend = await EmotionOS.getEmotionTrend(userId, period);

      return {
        period,
        dominant_emotion: trend.dominant_emotion,
        average_intensity: Math.round(trend.average_intensity * 100) + "%",
        volatility: trend.volatility > 0.3 ? "high" : trend.volatility > 0.15 ? "moderate" : "low",
        valence: trend.average_valence > 0.2 ? "positive" : trend.average_valence < -0.2 ? "negative" : "neutral",
        patterns: trend.notable_patterns,
        message: `Over the past ${period}, your dominant emotion has been ${trend.dominant_emotion} at ${Math.round(trend.average_intensity * 100)}% average intensity. Your emotional volatility is ${trend.volatility > 0.3 ? "high - lots of ups and downs" : "relatively stable"}.`,
      };
    }

    default:
      return { error: `Unknown emotion function: ${functionName}` };
  }
}

// Helper functions
function getEmotionMessage(emotion: EmotionType, intensity: number): string {
  const intensityWord = intensity > 0.7 ? "very" : intensity > 0.4 ? "somewhat" : "slightly";
  
  const responses: Record<string, string[]> = {
    stressed: [
      "I can sense you're under pressure.",
      "Sounds like things are a bit heavy right now.",
    ],
    overwhelmed: [
      "That's a lot to handle.",
      "It sounds like there's a lot on your plate.",
    ],
    anxious: [
      "I hear some worry in what you're sharing.",
      "That uncertainty sounds uncomfortable.",
    ],
    sad: [
      "I'm sorry you're going through this.",
      "That sounds really hard.",
    ],
    happy: [
      "That's wonderful to hear!",
      "Your positive energy is coming through.",
    ],
    motivated: [
      "Love that energy!",
      "You're fired up and ready to go.",
    ],
    calm: [
      "You sound centered.",
      "That's a peaceful place to be.",
    ],
    tired: [
      "Sounds like you need some rest.",
      "Energy's running low, huh?",
    ],
  };

  const emotionResponses = responses[emotion] || ["I'm picking up on how you're feeling."];
  return emotionResponses[Math.floor(Math.random() * emotionResponses.length)];
}

function getDefaultInterventions(emotion: EmotionType): string[] {
  const interventions: Record<string, string[]> = {
    stressed: ["deep breathing", "a short walk", "writing down what's on your mind"],
    overwhelmed: ["brain dump on paper", "pick ONE thing to focus on", "5-minute break"],
    anxious: ["box breathing (4-4-4-4)", "grounding exercise", "talk to someone"],
    sad: ["reach out to a friend", "gentle movement", "journaling"],
    angry: ["physical exercise", "step away for 10 minutes", "cold water on face"],
    frustrated: ["take a break", "change your environment", "reframe the problem"],
    tired: ["power nap", "get some fresh air", "have a snack"],
    bored: ["try something new", "switch tasks", "take a learning break"],
  };

  return interventions[emotion] || ["take a few deep breaths", "step outside briefly", "talk to someone"];
}

export default {
  EMOTION_VOICE_TOOLS,
  handleEmotionVoiceFunction,
};