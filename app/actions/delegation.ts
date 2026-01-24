'use server';

import { auth } from "@clerk/nextjs/server";
import { getTopCandidate, markCandidateShown } from "@/lib/delegation/readiness";
import { acceptReadinessCandidate, dismissReadinessCandidate } from "@/lib/delegation/acceptReadiness";

function requireUserId() {
    const { userId } = auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }
    return userId;
}

export async function fetchTopCandidateAction(contextPath: string) {
    const userId = requireUserId();
    return await getTopCandidate(userId, contextPath);
}

export async function markCandidateShownAction(readinessId: string) {
    const userId = requireUserId();
    await markCandidateShown(userId, readinessId);
}

export async function acceptReadinessAction(readinessId: string) {
    const userId = requireUserId();
    await acceptReadinessCandidate(userId, readinessId);
}

export async function dismissReadinessAction(readinessId: string) {
    const userId = requireUserId();
    await dismissReadinessCandidate(userId, readinessId);
}
