// Contact Interaction Playbook Generation
// lib/contacts/playbook.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";
import { ContactBehaviorProfile } from "./behavior";

export interface ContactPlaybook {
  summary: string; // "This person responds best to short, direct texts..."
  doList: string[]; // bullet points: "Do this"
  dontList: string[]; // bullet points: "Avoid this"
  channelGuidelines: string; // when to use email vs sms vs call
  toneGuidelines: string; // tone, pace, level of detail
  conflictStrategy: string; // how to handle tension/misunderstanding
  persuasionLevers: string; // what motivates them (safety, clarity, speed, etc.)
}

/**
 * Generate contact playbook from behavior profile
 */
export async function generateContactPlaybook(params: {
  userId: string;
  contactId: string;
}): Promise<ContactPlaybook> {
  const { userId, contactId } = params;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Load behavior profile
  const { data: profile } = await supabaseAdmin
    .from("contact_behavior_profiles")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("contact_id", contactId)
    .single();

  if (!profile) {
    // Return default playbook
    return {
      summary: "Not enough interaction data to generate a playbook yet.",
      doList: ["Be clear and direct", "Follow up if needed"],
      dontList: ["Don't assume they'll remember details"],
      channelGuidelines: "Use their preferred channel when possible.",
      toneGuidelines: "Maintain a professional, friendly tone.",
      conflictStrategy: "Address issues directly but respectfully.",
      persuasionLevers: "Focus on clarity and mutual benefit.",
    };
  }

  // 2. Load recent interaction events (sample)
  const { data: recentEvents } = await supabaseAdmin
    .from("contact_interaction_events")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("contact_id", contactId)
    .order("occurred_at", { ascending: false })
    .limit(20);

  // 3. Load contact info
  const { data: contact } = await supabaseAdmin
    .from("contacts")
    .select("name, email, phone")
    .eq("id", contactId)
    .single();

  // 4. Build LLM prompt
  const totalInteractions =
    profile.emails_sent +
    profile.emails_received +
    profile.sms_sent +
    profile.sms_received +
    profile.calls_count +
    profile.audio_conversations_count;

  const prompt = `You are Pulse, a high-end executive assistant helping someone communicate more effectively with a contact.

Contact: ${contact?.name || "Unknown"}
Total Interactions: ${totalInteractions}

Behavior Profile:
- Preferred Channel: ${profile.prefers_channel || "mixed"}
- Escalation Channel: ${profile.escalation_channel || "email"}
- Your Avg Response Time: ${profile.avg_response_minutes ? Math.round(profile.avg_response_minutes) + " minutes" : "unknown"}
- Their Avg Response Time: ${profile.their_avg_response_minutes ? Math.round(profile.their_avg_response_minutes) + " minutes" : "unknown"}
- Conflict Sensitivity: ${(profile.conflict_sensitivity * 100).toFixed(0)}% (higher = more sensitive)
- Reliability Score: ${(profile.reliability_score * 100).toFixed(0)}% (promise-keeping rate)
- Risk Score: ${(profile.risk_score * 100).toFixed(0)}% (relationship volatility)

Recent Interaction Sample:
${(recentEvents || [])
  .slice(0, 5)
  .map(
    (e) =>
      `- ${e.channel_type} (${e.direction}): ${e.emotion_label || "neutral"} sentiment, ${e.contains_conflict ? "conflict detected" : "no conflict"}`
  )
  .join("\n")}

Generate a personalized communication playbook. Return JSON:

{
  "summary": "2-3 sentence summary of how to best communicate with this person",
  "doList": ["3-5 specific DOs", "e.g., 'Use SMS for urgent matters'", "e.g., 'Keep messages brief and direct'"],
  "dontList": ["3-5 specific DON'Ts", "e.g., 'Avoid long emails'", "e.g., 'Don't assume they'll remember details'"],
  "channelGuidelines": "When to use email vs SMS vs call vs audio",
  "toneGuidelines": "Recommended tone, pace, level of detail",
  "conflictStrategy": "How to handle tension or misunderstandings with this person",
  "persuasionLevers": "What motivates them (safety, clarity, speed, relationship, etc.)"
}

Be specific, actionable, and based on the data provided. Return ONLY valid JSON, no markdown.`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 800,
    });

    const cleaned = response.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as ContactPlaybook;

    // Validate and normalize
    return {
      summary: parsed.summary || "Communication playbook generated.",
      doList: Array.isArray(parsed.doList) ? parsed.doList : [],
      dontList: Array.isArray(parsed.dontList) ? parsed.dontList : [],
      channelGuidelines: parsed.channelGuidelines || "Use their preferred channel when possible.",
      toneGuidelines: parsed.toneGuidelines || "Maintain appropriate tone.",
      conflictStrategy: parsed.conflictStrategy || "Address issues directly but respectfully.",
      persuasionLevers: parsed.persuasionLevers || "Focus on clarity and mutual benefit.",
    };
  } catch (err) {
    console.error("[ContactPlaybook] LLM generation failed:", err);
    // Return default playbook
    return {
      summary: "Generated playbook based on interaction patterns.",
      doList: ["Be clear and direct", "Use their preferred channel", "Follow up if needed"],
      dontList: ["Don't assume they'll remember details", "Avoid unnecessary complexity"],
      channelGuidelines: `Preferred: ${profile.prefers_channel || "mixed"}. Escalation: ${profile.escalation_channel || "email"}.`,
      toneGuidelines: "Maintain a professional, friendly tone.",
      conflictStrategy: "Address issues directly but respectfully.",
      persuasionLevers: "Focus on clarity and mutual benefit.",
    };
  }
}

/**
 * Get or generate playbook (with caching)
 */
export async function getContactPlaybook(params: {
  userId: string;
  contactId: string;
  forceRegenerate?: boolean;
}): Promise<ContactPlaybook> {
  const { userId, contactId, forceRegenerate = false } = params;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Check cache (if not forcing regenerate)
  if (!forceRegenerate) {
    const { data: cached } = await supabaseAdmin
      .from("contact_playbooks")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", contactId)
      .single();

    // Use cache if less than 7 days old
    if (cached) {
      const age = Date.now() - new Date(cached.generated_at).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (age < sevenDays) {
        return {
          summary: cached.summary || "",
          doList: cached.do_list || [],
          dontList: cached.dont_list || [],
          channelGuidelines: cached.channel_guidelines || "",
          toneGuidelines: cached.tone_guidelines || "",
          conflictStrategy: cached.conflict_strategy || "",
          persuasionLevers: cached.persuasion_levers || "",
        };
      }
    }
  }

  // Generate new playbook
  const playbook = await generateContactPlaybook({ userId, contactId });

  // Cache it
  await supabaseAdmin
    .from("contact_playbooks")
    .upsert(
      {
        user_id: dbUserId,
        contact_id: contactId,
        summary: playbook.summary,
        do_list: playbook.doList,
        dont_list: playbook.dontList,
        channel_guidelines: playbook.channelGuidelines,
        tone_guidelines: playbook.toneGuidelines,
        conflict_strategy: playbook.conflictStrategy,
        persuasion_levers: playbook.persuasionLevers,
        generated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,contact_id",
      }
    );

  return playbook;
}

