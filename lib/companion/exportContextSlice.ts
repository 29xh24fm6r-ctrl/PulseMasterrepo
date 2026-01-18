import { PulsePresenceState } from "./presenceState";
import { getContextLabel } from "./contextLabels";

export type ContextSlice = {
    context: any;
    presenceState: PulsePresenceState;
    lastContextTime: number;
    recentActions: Array<{ type: string; label: string; ts: number }>;
    systemStatus: {
        activeRunId: string | null;
        latestIntentType: string | undefined;
        insightCount: number;
        hasActiveProposal: boolean;
    };
};

export function exportContextSlice(slice: ContextSlice): string {
    const { context, presenceState, lastContextTime, recentActions, systemStatus } = slice;
    const now = Date.now();
    const contextDate = new Date(lastContextTime).toLocaleString();
    const label = getContextLabel(context?.route);

    let output = `Pulse Context Snapshot\n`;
    output += `----------------------\n`;
    output += `Viewing: ${label.replace("Viewing: ", "")}\n`;
    output += `Route: ${context?.route ?? "Unknown"}\n`;
    output += `Presence: ${presenceState.charAt(0).toUpperCase() + presenceState.slice(1)}\n`;
    output += `Time: ${new Date().toLocaleString()}\n`;
    output += `Last Context Update: ${contextDate} (${Math.round((now - lastContextTime) / 1000)}s ago)\n\n`;

    output += `Recent Actions:\n`;
    if (recentActions.length === 0) {
        output += `(No recent actions recorded)\n`;
    } else {
        // Show newest first
        [...recentActions].reverse().forEach((action, i) => {
            const ago = Math.round((now - action.ts) / 1000);
            output += `${i + 1}. [${action.type}] ${action.label} – ${ago}s ago\n`;
        });
    }
    output += `\n`;

    output += `System Response:\n`;
    if (systemStatus.activeRunId) {
        output += `- Active Run: ${systemStatus.activeRunId}\n`;
    } else {
        output += `- No active run\n`;
    }

    if (systemStatus.latestIntentType) {
        output += `- Latest Intent: ${systemStatus.latestIntentType}\n`;
    }

    if (systemStatus.hasActiveProposal) {
        output += `- Awaiting User Consent (Proposal Active)\n`;
    }

    if (systemStatus.insightCount > 0) {
        output += `- Insights Available: ${systemStatus.insightCount}\n`;
    } else {
        output += `- No pending insights\n`;
    }

    // Add hints if available
    if (context?.hints?.length) {
        output += `- Active Hints: ${context.hints.join(", ")}\n`;
    }

    return output;
}
