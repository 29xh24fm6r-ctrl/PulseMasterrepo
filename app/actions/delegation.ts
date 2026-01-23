'use server';

type Candidate = {
    id: string;
    scope: string;
    reason: string;
    confidence: number;
};

export async function fetchTopCandidateAction(contextPath: string): Promise<Candidate | null> {
    // Stub
    return null;
}

export async function acceptReadinessAction(id: string): Promise<void> {
    // Stub
}

export async function dismissReadinessAction(id: string): Promise<void> {
    // Stub
}

export async function markCandidateShownAction(id: string): Promise<void> {
    // Stub
}
