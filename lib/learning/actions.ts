'use server';

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { revalidatePath } from "next/cache";

export interface LearningArtifact {
    id: string;
    source_type: 'workflow_outcome' | 'delegation_result' | 'user_feedback';
    source_id: string;
    signal_type: 'success' | 'failure' | 'interruption' | 'override';
    confidence_delta: number;
    metadata_json: any;
    created_at: string;
}

export async function getPendingLearningArtifacts(limit = 10): Promise<LearningArtifact[]> {
    const { userId } = await auth();
    if (!userId) return [];

    const supabase = getSupabaseAdminRuntimeClient();

    // We fetch artifacts that haven't been processed yet. 
    // For now, we assume all visible artifacts are "pending" or we rely on UI to filter.
    // Ideally, we'd have a 'status' field (pending, accepted, rejected).
    // The migration didn't include a 'status' field, implying `learning_artifacts` are immutable logs.
    // User interaction might just log a NEW artifact (Feedback) or we simply hide them locally.
    // Or maybe we should have added a 'status' field?
    // The spec says: "Learning artifacts are **descriptive only**, never prescriptive."
    // It effectively acts as a feed. The "Accept" action implies changing the underlying score.

    // Let's assume we show the most recent ones.
    const { data, error } = await supabase
        .from('learning_artifacts')
        .select('*')
        .eq('owner_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error fetching learning artifacts:", error);
        return [];
    }

    return data as LearningArtifact[];
}

export async function acceptLearningSuggestion(artifactId: string, intentType: string) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdminRuntimeClient();

    // 1. Fetch the artifact to verify ownership and delta
    const { data: artifact, error: fetchError } = await supabase
        .from('learning_artifacts')
        .select('*')
        .eq('id', artifactId)
        .eq('owner_user_id', userId)
        .single();

    if (fetchError || !artifact) throw new Error("Artifact not found");

    // 2. Apply change to autonomy_scores
    // We need to fetch current score first or use an RPC if we want to be atomic.
    // For implementation grade, simple read-modify-write is okay if locked, but upsert is better.

    const { data: currentScore, error: scoreError } = await supabase
        .from('autonomy_scores')
        .select('*')
        .eq('owner_user_id', userId)
        .eq('intent_type', intentType)
        .single();

    let newConfidence = (currentScore?.confidence_score || 0) + artifact.confidence_delta;
    newConfidence = Math.max(0, Math.min(1, newConfidence)); // Bound between 0 and 1

    const { error: updateError } = await supabase
        .from('autonomy_scores')
        .upsert({
            owner_user_id: userId,
            intent_type: intentType,
            confidence_score: newConfidence,
            updated_at: new Date().toISOString()
        }, { onConflict: 'owner_user_id, intent_type' });

    if (updateError) throw new Error("Failed to update autonomy score");

    // 3. Log the "Acceptance" as a new Learning Artifact (User Feedback)
    // This maintains the "Learning from Delegation Outcomes" loop
    await supabase.from('learning_artifacts').insert({
        owner_user_id: userId,
        source_type: 'user_feedback',
        source_id: artifactId, // Reference the original artifact
        signal_type: 'success', // User approved
        confidence_delta: 0, // No further change, just logging the approval
        metadata_json: { action: 'accepted_tuning', original_delta: artifact.confidence_delta }
    });

    revalidatePath('/companion'); // Refresh UI
    return { success: true, newConfidence };
}

export async function rejectLearningSuggestion(artifactId: string) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdminRuntimeClient();

    // Log the rejection
    await supabase.from('learning_artifacts').insert({
        owner_user_id: userId,
        source_type: 'user_feedback',
        source_id: artifactId,
        signal_type: 'override',
        confidence_delta: 0,
        metadata_json: { action: 'rejected_tuning' }
    });

    revalidatePath('/companion');
    return { success: true };
}
