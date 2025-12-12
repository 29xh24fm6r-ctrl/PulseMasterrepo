// Daily Rhythm LLM Rendering
// lib/rhythm/llm.ts

import { llmComplete } from "@/lib/llm/client";
import {
  MorningBriefingData,
  MiddayCheckinData,
  EveningDebriefData,
} from "./types";

/**
 * Render morning briefing text
 */
export async function renderMorningBriefingText(
  data: MorningBriefingData
): Promise<string> {
  const prompt = `You are Pulse, a high-end executive assistant and life OS.

Create a concise, energizing morning briefing from this data:

Date: ${data.date}
Top Risks: ${JSON.stringify(data.topRisks)}
Key Events: ${JSON.stringify(data.keyEvents)}
Identity Focus: ${data.identityFocus ? JSON.stringify(data.identityFocus) : "None"}
Suggested Coaches: ${JSON.stringify(data.suggestedCoaches)}
Email Owed: ${data.emailOwedCount || 0} replies
Top Email Followups: ${JSON.stringify(data.topEmailFollowups || [])}
Attention Score: ${data.attentionScore?.score || 0}/100 (${data.attentionScore?.riskLevel || "Low"} risk)
Broken Promises: ${JSON.stringify(data.brokenPromises || [])}
Comms Breakdown: ${data.attentionScore?.comms ? JSON.stringify(data.attentionScore.comms) : "None"}
Audio Obligations: ${data.audioObligationsCount || 0}

Write a 2-3 paragraph briefing that:
1. Sets the tone for the day
2. Highlights the top 1-2 risks to watch
3. Mentions key events if any
4. References identity focus if present
5. Mentions email followups if any (e.g., "You owe ${data.emailOwedCount || 0} important replies this morning, including ${data.topEmailFollowups?.[0]?.from || ""} (${data.topEmailFollowups?.[0]?.subject || ""}).")
6. Mentions communication risk level if high (e.g., "Communication risk is ${data.attentionScore?.riskLevel || "Low"} today: ${data.attentionScore?.score || 0}/100 attention score. ${data.brokenPromises && data.brokenPromises.length > 0 ? `${data.brokenPromises.length} promise${data.brokenPromises.length > 1 ? "s" : ""} past due across email${data.attentionScore?.comms && (data.attentionScore.comms.smsPromisesOpen > 0 || data.attentionScore.comms.callPromisesOpen > 0) ? ", SMS, and calls" : ""}.` : ""}${data.audioObligationsCount && data.audioObligationsCount > 0 ? ` You have ${data.audioObligationsCount} obligation${data.audioObligationsCount > 1 ? "s" : ""} from recent audio recordings.` : ""}")
7. Mentions audio commitments if any (e.g., "Yesterday you verbally promised to send financials to Tom. I've added the task and marked it as due today.")
8. Suggests which coach to engage with

Be concise, actionable, and supportive. Use a confident but warm tone.`;

  try {
    const summary = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 300,
    });

    return summary || generateFallbackBriefing(data);
  } catch (err) {
    console.error("[RhythmLLM] Failed to render briefing:", err);
    return generateFallbackBriefing(data);
  }
}

function generateFallbackBriefing(data: MorningBriefingData): string {
  let text = `Good morning. Today is ${new Date(data.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.\n\n`;

  if (data.topRisks.length > 0) {
    text += `Watch out for ${data.topRisks[0].risk_type.replace("_", " ")} around ${data.topRisks[0].time}.\n\n`;
  }

  if (data.identityFocus) {
    text += `${data.identityFocus.message}\n\n`;
  }

  if (data.suggestedCoaches.length > 0) {
    text += `Consider starting with ${data.suggestedCoaches[0].coachId} Coach: ${data.suggestedCoaches[0].reason}`;
  }

  return text;
}

/**
 * Render midday check-in text
 */
export async function renderMiddayCheckinText(
  data: MiddayCheckinData
): Promise<string> {
  const prompt = `You are Pulse, a high-end executive assistant and life OS.

Create a brief midday check-in from this data:

Date: ${data.date}
Sessions Completed: ${data.completedSessions}
MXP Earned: ${data.mxpEarned}
Emotion Trend: ${data.emotionTrend.stressCount} stress events, ${data.emotionTrend.calmCount} calm events
Nudges: ${JSON.stringify(data.nudges)}

Write a 1-2 paragraph check-in that:
1. Acknowledges progress so far
2. Notes emotional state
3. Highlights 1-2 key nudges

Be brief, supportive, and actionable.`;

  try {
    const summary = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 200,
    });

    return summary || generateFallbackCheckin(data);
  } catch (err) {
    console.error("[RhythmLLM] Failed to render check-in:", err);
    return generateFallbackCheckin(data);
  }
}

function generateFallbackCheckin(data: MiddayCheckinData): string {
  let text = `Midday check-in: You've completed ${data.completedSessions} session${data.completedSessions !== 1 ? "s" : ""} and earned ${data.mxpEarned} MXP so far.\n\n`;

  if (data.emotionTrend.stressCount > data.emotionTrend.calmCount) {
    text += `You've had more stress than calm today. `;
  } else if (data.emotionTrend.calmCount > 0) {
    text += `You've maintained good emotional balance. `;
  }

  if (data.nudges.length > 0) {
    text += data.nudges[0];
  }

  return text;
}

/**
 * Render evening debrief text
 */
export async function renderEveningDebriefText(
  data: EveningDebriefData
): Promise<string> {
  const prompt = `You are Pulse, a high-end executive assistant and life OS.

Create a reflective evening debrief from this data:

Date: ${data.date}
Wins: ${JSON.stringify(data.wins)}
Struggles: ${JSON.stringify(data.struggles)}
MXP Earned: ${data.mxpEarned}
Identity Progress: ${JSON.stringify(data.identityProgress)}

Write a 2-3 paragraph debrief that:
1. Celebrates wins
2. Normalizes struggles
3. Highlights identity growth
4. Points to tomorrow with optimism

Be warm, reflective, and forward-looking.`;

  try {
    const summary = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 300,
    });

    return summary || generateFallbackDebrief(data);
  } catch (err) {
    console.error("[RhythmLLM] Failed to render debrief:", err);
    return generateFallbackDebrief(data);
  }
}

function generateFallbackDebrief(data: EveningDebriefData): string {
  let text = `Evening debrief for ${new Date(data.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.\n\n`;

  if (data.wins.length > 0) {
    text += `Wins today:\n${data.wins.map((w) => `• ${w}`).join("\n")}\n\n`;
  }

  if (data.struggles.length > 0) {
    text += `Areas to watch:\n${data.struggles.map((s) => `• ${s}`).join("\n")}\n\n`;
  }

  text += `You earned ${data.mxpEarned} MXP today. Rest well and prepare for tomorrow.`;

  return text;
}

