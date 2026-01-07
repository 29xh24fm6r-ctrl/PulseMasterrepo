
import { ProposedAction } from "./engine";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function executeAction(action: ProposedAction): Promise<boolean> {
    console.log(`[Cortex Executor] Executing action: ${action.title} (${action.type})`);

    try {
        switch (action.type) {
            case 'draft_reply':
                // For draft_reply, "execution" might mean sending it, 
                // OR just confirming it's in the drafts folder (which it already is).
                // If the user approved it, we might want to actually SEND it.
                // For now, let's assume we move it to a 'scheduled' or 'sent' state in the email system.
                // But logically, 'draft_reply' just creates the draft.
                // If the action was "Send Reply", that's different.
                // Let's assume the proposed action is "Send the draft".

                // Mock execution for now
                console.log(`[Email] Sending draft ${action.payload?.draftId} to ${action.payload?.to}`);
                // TODO: Integration with Gmail API to send.
                break;

            case 'schedule_meeting':
                console.log(`[Calendar] Scheduling meeting: ${action.payload?.summary} at ${action.payload?.startTime}`);
                break;

            default:
                console.warn(`[Cortex Executor] Unknown action type: ${action.type}`);
                return false;
        }

        // Update status in DB
        const { error } = await supabaseAdmin
            .from('proposed_actions')
            .update({ status: 'executed', updated_at: new Date().toISOString() })
            .eq('id', action.id);

        if (error) throw error;

        return true;

    } catch (error) {
        console.error(`[Cortex Executor] Failed to execute ${action.id}:`, error);
        return false;
    }
}
