export type RelationshipOracleRow = {
    contact_id: string;
    full_name: string | null;
    company: string | null;
    title: string | null;
    last_interaction_at: string | null;
    relationship_score: number | null;
    risk_level: string | null;
};

export async function fetchRelationshipOracle(limit = 25): Promise<RelationshipOracleRow[]> {
    const res = await fetch(`/api/crm/oracle?limit=${limit}`, { method: "GET" });
    if (!res.ok) throw new Error(`CRM oracle fetch failed: ${res.status}`);
    const json = await res.json();
    if (!json?.ok) throw new Error(json?.error ?? "CRM oracle fetch failed");
    return (json.rows ?? []) as RelationshipOracleRow[];
}
