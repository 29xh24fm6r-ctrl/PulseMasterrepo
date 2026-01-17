// lib/memory/captureAttentionArtifact.ts
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function captureAttentionArtifact(args: {
    owner_user_id: string;
    source: "voice" | "ui" | "system";
    artifact_type: string;
    content: string;
    context?: any;
    confidence?: number;
}) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("attention_artifacts").insert({
        owner_user_id: args.owner_user_id,
        source: args.source,
        artifact_type: args.artifact_type,
        content: args.content,
        context: args.context ?? {},
        confidence: args.confidence ?? null,
    });

    if (error) throw error;
}
