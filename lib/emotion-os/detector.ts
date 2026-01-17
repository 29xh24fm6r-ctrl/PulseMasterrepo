// Emotion OS - Text-based emotion detection
import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { llmJson } from "../llm/client";

function getSupabase() {
  return getSupabaseAdminRuntimeClient();
}

interface EmotionDetection {
  detected_emotion: string;
  intensity: number; // 0-1
  valence: number; // -1 to 1
  triggers: string[];
  confidence: number;
}

const EMOTION_SCHEMA = {
  detected_emotion: "string (happy, sad, anxious, stressed, calm, excited, frustrated, neutral, tired, motivated, confident, hopeful)",
  intensity: "number 0-1",
  valence: "number -1 to 1 (negative to positive)",
  triggers: "array of strings identifying what caused this emotion",
  confidence: "number 0-1"
};

export async function detectEmotion(
  text: string,
  userId: string,
  source: string = "unknown",
  sourceId?: string
): Promise<EmotionDetection | null> {
  if (!text || text.length < 10) return null;

  const prompt = `Analyze the emotional content of this text and detect the primary emotion.

Text: "${text}"

Return JSON with:
- detected_emotion: primary emotion (happy, sad, anxious, stressed, calm, excited, frustrated, neutral, tired, motivated, confident, hopeful)
- intensity: 0-1 scale of how strong the emotion is
- valence: -1 to 1 scale (negative emotions = negative, positive = positive)
- triggers: array of words/phrases that indicate this emotion
- confidence: 0-1 how confident you are in this detection`;

  try {
    const detection = await llmJson({ prompt, schema: EMOTION_SCHEMA });
    
    const supabase = getSupabase();
    
    // Store in emo_states
    const { data, error } = await supabase.from("emo_states").insert({
      user_id: userId,
      detected_emotion: detection.detected_emotion,
      intensity: detection.intensity,
      valence: detection.valence,
      triggers: detection.triggers,
      confidence: detection.confidence,
      source_type: source,
      source_id: sourceId,
      raw_text: text.substring(0, 500), // Truncate for storage
      occurred_at: new Date().toISOString(),
    }).select().single();

    if (error) {
      console.error("Failed to store emotion state:", error);
    }

    // Log mc_event (non-critical)
    try {
      await supabase.from("mc_events").insert({
        user_id: userId,
        event_type: "emotion_detected",
        event_data: {
          emotion: detection.detected_emotion,
          intensity: detection.intensity,
          source,
        },
      });
    } catch {
      // Non-critical, ignore errors
    }

    return detection;
  } catch (error) {
    console.error("Emotion detection failed:", error);
    return null;
  }
}

export async function detectEmotionsFromRecentFragments(userId: string): Promise<number> {
  const supabase = getSupabase();
  
  // Get fragments from last 10 minutes without emotion detection
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  const { data: fragments } = await supabase
    .from("tb_memory_fragments")
    .select("id, content, created_at")
    .eq("user_id", userId)
    .gte("created_at", tenMinutesAgo)
    .is("emotion_detected", null)
    .limit(20);

  if (!fragments || fragments.length === 0) return 0;

  let detected = 0;
  for (const fragment of fragments) {
    const result = await detectEmotion(fragment.content, userId, "memory_fragment", fragment.id);
    if (result) {
      detected++;
      // Mark fragment as processed
      await supabase
        .from("tb_memory_fragments")
        .update({ emotion_detected: true })
        .eq("id", fragment.id);
    }
  }

  return detected;
}

export async function runEmotionDetectionCron(): Promise<{ usersProcessed: number; emotionsDetected: number }> {
  const supabase = getSupabase();
  
  // Get active users with recent activity
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  const { data: activeUsers } = await supabase
    .from("tb_memory_fragments")
    .select("user_id")
    .gte("created_at", tenMinutesAgo)
    .limit(100);

  const uniqueUsers = [...new Set(activeUsers?.map(u => u.user_id) || [])];
  
  let totalDetected = 0;
  for (const userId of uniqueUsers) {
    const count = await detectEmotionsFromRecentFragments(userId);
    totalDetected += count;
  }

  return { usersProcessed: uniqueUsers.length, emotionsDetected: totalDetected };
}

export default { detectEmotion, detectEmotionsFromRecentFragments, runEmotionDetectionCron };