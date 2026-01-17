import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

function readIp(req: Request) {
    // best-effort (vercel / proxies)
    return (
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        null
    );
}

export async function logOpsAudit(params: {
    req: Request;

    actorUserId: string;
    actorIsAdmin: boolean;

    targetUserId?: string | null;

    action: string;
    resourceType?: string | null;
    resourceId?: string | null;

    meta?: Record<string, any>;
}) {
    const {
        req,
        actorUserId,
        actorIsAdmin,
        targetUserId = null,
        action,
        resourceType = null,
        resourceId = null,
        meta = {},
    } = params;

    try {
        await getSupabaseAdminRuntimeClient().rpc("rpc_ops_audit_insert", {
            p_actor_user_id: actorUserId,
            p_actor_is_admin: actorIsAdmin,
            p_target_user_id: targetUserId,
            p_action: action,
            p_resource_type: resourceType,
            p_resource_id: resourceId,
            p_meta: meta,
            p_ip: readIp(req),
            p_user_agent: req.headers.get("user-agent"),
        });
    } catch {
        // best-effort: never block ops on audit failure
    }
}
