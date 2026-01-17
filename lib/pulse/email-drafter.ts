import { ActionData } from "@/lib/types/actions";
import { supabaseAdmin } from "@/lib/supabase";
import { DetectedAction, ScannedEmail } from "./email-intelligence";
import { getOpenAI } from "@/lib/llm/client";

// Removed global openai init

/**
 * Generate a smart email reply draft for an actionable email.
 */
export async function generateAutoDraft(
    userId: string,
    email: ScannedEmail,
    action: DetectedAction,
    personContext?: { name: string; relation?: string }
): Promise<{ id: string; content: string } | null> {

    try {
        console.log(`🤖 Generating auto-draft for ${email.fromEmail}...`);

        const prompt = `You are Pulse OS, an advanced AI Executive Assistant for ${personContext?.name || "the user"}.
        
        TASK: Write a draft reply to this email.
        
        CONTEXT:
        - Sender: ${email.fromName} (${email.fromEmail})
        - Action Detected: ${action.type} (${action.description})
        - Priority: ${action.priority}
        
        ORIGINAL EMAIL:
        Subject: ${email.subject}
        Body:
        ${email.body.substring(0, 1000)}
        
        INSTRUCTIONS:
        - Be professional, concise, and helpful.
        - Acknowledge the request (${action.description}).
        - If it's a 'Task', say I've added it to my list.
        - If 'Follow Up', suggest a continued conversation.
        - Do NOT use placeholders like [Insert Date]. Use generic terms like "soon" or "this week" if date is unknown.
        - Sign off as "Pulse AI (on behalf of User)".
        
        Return ONLY the body of the email.`;

        const openai = getOpenAI();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        const draftContent = completion.choices[0].message.content || "";
        if (!draftContent) return null;

        // Save to reply_drafts (Using Casting Escape Hatch due to missing types)
        // We link it to the email via meta or if we had an inbox_item_id. 
        // For now, we'll create a new "reply_draft" row.

        // First, check if there's an inbox item for this? Maybe not yet.
        // We will store the draft with reference to the messageId.

        const { data: draft, error } = await (supabaseAdmin as any)
            .from("reply_drafts")
            .insert({
                user_id_uuid: userId,
                subject: `Re: ${email.subject}`,
                to_email: email.fromEmail,
                body: draftContent,
                status: "draft",
                meta: {
                    source: "auto_drafter",
                    original_message_id: email.id,
                    action_type: action.type,
                    action_description: action.description
                }
            })
            .select()
            .single();

        if (error) {
            console.error("Failed to save draft:", error);
            return null;
        }

        console.log(`✅ Auto-draft created: ${draft.id}`);
        return { id: draft.id, content: draftContent };

    } catch (err) {
        console.error("Auto-drafter error:", err);
        return null;
    }
}
