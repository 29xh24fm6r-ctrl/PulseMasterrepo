// lib/oracles/registry.ts

export type OracleDef = {
    oracle_id: string;
    title: string;
    steps: Array<{ step: string }>;
};

export function getOracle(oracleId: string): OracleDef | null {
    if (oracleId === "contact_oracle_v1") {
        return {
            oracle_id: "contact_oracle_v1",
            title: "Contact Oracle",
            steps: [{ step: "validate" }, { step: "create_lead_stub" }, { step: "done" }],
        };
    }
    return null;
}
