
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

interface DelegationNode {
    id: string; // Edge ID
    from_principal_id: string;
    to_principal_id: string;
    scope: string;
    revoked_at: string | null;
}

/**
 * Checks if 'actorId' is authorized to perform action 'scope' on behalf of 'targetId'
 * via the delegation graph.
 * 
 * Max Depth: 3 (prevent infinite potential)
 */
export async function checkDelegation(
    actorPrincipalId: string,
    targetPrincipalId: string,
    requiredScope: string
): Promise<boolean> {
    // 1. Direct Identity: If acting as self, always true
    if (actorPrincipalId === targetPrincipalId) return true;

    const supabase = getSupabaseAdminRuntimeClient();

    // 2. Fetch all edges relevant to traversal
    // Optimization: In a real system, we'd use a Recursive CTE in SQL.
    // For Phase 13, doing a limited depth search in app logic is acceptable and safer to debug.

    let currentLayerIds = [targetPrincipalId]; // We start from the Target (who gave authority?)
    // Actually, we are looking for a path FROM target TO actor.
    // "Target delegated to X, who delegated to Actor"
    // So edges direction: From -> To
    // Path: Target -> ... -> Actor

    const MAX_DEPTH = 3;
    let depth = 0;

    const visited = new Set<string>();
    visited.add(targetPrincipalId);

    while (depth < MAX_DEPTH) {
        // Find edges where 'from' is in currentLayer
        const { data: edges, error } = await supabase
            .from('delegation_edges')
            .select('*')
            .in('from_principal_id', currentLayerIds)
            .is('revoked_at', null) // Must be active
            .eq('scope', requiredScope); // For simplicity, exact scope match. Hierarchical scope is Phase 13+

        if (error || !edges || edges.length === 0) return false;

        const nextLayerIds: string[] = [];

        for (const edge of edges) {
            if (edge.to_principal_id === actorPrincipalId) {
                // Found a path!
                return true;
            }

            if (!visited.has(edge.to_principal_id)) {
                visited.add(edge.to_principal_id);
                nextLayerIds.push(edge.to_principal_id);
            }
        }

        if (nextLayerIds.length === 0) return false; // Dead end
        currentLayerIds = nextLayerIds;
        depth++;
    }

    return false;
}
