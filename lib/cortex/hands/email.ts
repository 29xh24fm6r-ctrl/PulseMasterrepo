import { generateSalesEmail } from "@/lib/ai/email-generator";
import { createAutonomyAction } from "@/lib/autonomy/engine";

export interface DraftEmailInput {
    dealName: string;
    dealStage?: string;
    dealAmount?: number;
    personName?: string;
}

/**
 * THE SHADOW DRAFTER
 * Generates an email in the background and saves it as an Autonomy Action for review.
 */
export async function draftShadowEmail(
    userId: string,
    input: DraftEmailInput
) {
    console.log(`👻 [SHADOW WORK] Drafting email for deal: ${input.dealName}`);

    // 1. Generate the email using AI
    const draft = await generateSalesEmail(userId, {
        dealName: input.dealName,
        dealStage: input.dealStage,
        dealAmount: input.dealAmount,
        personName: input.personName,
        purpose: "Intro / Follow-up (Auto-Generated)"
    });

    // 2. Save as an "Autonomy Action" (The user sees this as a suggestion)
    // In God Mode, a higher level setting would auto-send this.
    // For now, we "Draft" it by creating a reviewable action.

    const formattedBody = `
SUBJECT: ${draft.subject}

${draft.body}

---
REASONING: ${draft.reasoning}
  `.trim();

    await createAutonomyAction({
        userId,
        type: "draft_review", // TODO: Add 'draft' type to autonomy engine
        title: `Review Draft: Email to ${draft.recipientName || "Contact"}`,
        description: formattedBody,
        scheduledFor: new Date() // Due now
    });

    console.log(`✅ [SHADOW WORK] Draft Saved: ${draft.subject}`);
}
