// lib/runtime/runtimeResponse.ts
import { runtimeHeaders, PulseAuthHeader } from "./runtimeHeaders";

export function runtimeResponse(
    body: unknown,
    status: number,
    auth: PulseAuthHeader
) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            ...runtimeHeaders({ auth }),
        },
    });
}
