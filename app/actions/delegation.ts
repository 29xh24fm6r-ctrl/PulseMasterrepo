'use server';

import { createClient } from '@/lib/supabase/server';
import { acceptReadinessCandidate, dismissReadinessCandidate } from '@/lib/delegation/acceptReadiness';
import { getTopCandidate, generateReadinessCandidates } from '@/lib/delegation/readiness';

export async function acceptReadinessAction(readinessId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await acceptReadinessCandidate(user.id, readinessId);
    return { success: true };
}

export async function dismissReadinessAction(readinessId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await dismissReadinessCandidate(user.id, readinessId);
    return { success: true };
}

export async function fetchTopCandidateAction(contextPath: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Optional: Trigger generation on-demand (opportunistic) if cache miss logic desired, 
    // but typically generation is async. For now, we just fetch.
    // We might also trigger generation here for *next* time.

    // We can also trigger generation in background (fire and forget)
    // NOTE: In Next.js Server Actions, fire-and-forget isn't always reliable without `waitUntil` (Vercel specific) 
    // or just awaiting it. For this phase, we await or skip. 
    // For Verification Mock: we await to ensure we see it.

    // Get current principal (defaulting to user principal for now)
    const { data: principal } = await supabase.from('pulse_principals').select('id').eq('connected_user_id', user.id).single();
    if (principal) {
        // Opportunistic generation:
        await generateReadinessCandidates(user.id, contextPath, principal.id).catch(err => console.error("Generation error", err));
    }

    return await getTopCandidate(user.id, contextPath);
}

export async function markCandidateShownAction(readinessId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // We import the lib function to keep logic central
    const { markCandidateShown } = await import('@/lib/delegation/readiness');
    await markCandidateShown(user.id, readinessId);
}
