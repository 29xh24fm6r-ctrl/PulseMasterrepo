import * as Sentry from "@sentry/nextjs";

export function setObsContext(input: {
    userId?: string | null;
    orgId?: string | null;
    workspaceId?: string | null;
    area?: string; // "ops" | "tasks" | "quests" | "portal" etc.
    feature?: string; // "claim" | "triage" | "send_email" etc.
    requestId?: string | null;
}) {
    const { userId, orgId, workspaceId, area, feature, requestId } = input;

    if (userId) {
        Sentry.setUser({ id: userId });
    }

    Sentry.setTags({
        area: area ?? "unknown",
        feature: feature ?? "unknown",
        org_id: orgId ?? "unknown",
        workspace_id: workspaceId ?? "unknown",
        request_id: requestId ?? "unknown",
        release: process.env.NEXT_PUBLIC_PULSE_RELEASE ?? "unknown",
        env: process.env.NODE_ENV ?? "unknown",
    });
}
