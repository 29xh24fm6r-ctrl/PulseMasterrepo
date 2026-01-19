"use client";

export type DevBootstrapResponse =
    | { ok: true; userId: string }
    | { ok: false; error: string };

export async function bootstrapDevUserIdFromServer(): Promise<string> {
    const res = await fetch("/api/dev/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error(`Bootstrap failed: ${res.status}`);
    }

    const data: unknown = await res.json();

    if (
        !data ||
        typeof data !== "object" ||
        (data as any).ok !== true ||
        typeof (data as any).pulse_owner_user_id !== "string" ||
        (data as any).pulse_owner_user_id.length === 0
    ) {
        throw new Error("Bootstrap returned unexpected shape");
    }

    return (data as any).pulse_owner_user_id as string;
}
