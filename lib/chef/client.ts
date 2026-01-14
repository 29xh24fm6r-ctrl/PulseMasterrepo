type ChefNextResponse =
    | { ok: true; mode: "none" }
    | {
        ok: true;
        mode: "plan";
        plan: any;
        go_time: boolean;
        starts_in_minutes: number | null;
        eat_in_minutes: number | null;
        recipe_steps: any | null;
    }
    | { ok: true; mode: "active"; active_execution: any }
    | { ok: false; error: string };

type ChefNotificationsResponse =
    | { ok: true; notifications: any[] }
    | { ok: false; error: string };

function requireOwnerUserId(): string {
    // TEMP: dev-only. Replace with your real auth (Clerk) later.
    const v =
        (typeof window !== "undefined" &&
            window.localStorage.getItem("pulse_owner_user_id")) ||
        "";
    if (!v) throw new Error("Missing pulse_owner_user_id in localStorage (dev auth)");
    return v;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: {
            ...(init?.headers || {}),
            "x-owner-user-id": requireOwnerUserId(),
        },
        cache: "no-store",
    });
    return res.json();
}

export const chefClient = {
    next(): Promise<ChefNextResponse> {
        return fetchJSON("/api/chef/execute/next");
    },

    start(cook_plan_id: string) {
        return fetchJSON("/api/chef/execute/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cook_plan_id }),
        });
    },

    step(execution_id: string, op: "next" | "prev" | "set", value?: number) {
        return fetchJSON("/api/chef/execute/step", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ execution_id, op, value }),
        });
    },

    timerStart(execution_id: string, label: string, seconds: number) {
        return fetchJSON("/api/chef/execute/timer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ execution_id, op: "start", label, seconds }),
        });
    },

    timerStop(execution_id: string) {
        return fetchJSON("/api/chef/execute/timer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ execution_id, op: "stop" }),
        });
    },

    finish(
        execution_id: string,
        cook_plan_id: string,
        status: "completed" | "cancelled" = "completed"
    ) {
        return fetchJSON("/api/chef/execute/finish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ execution_id, cook_plan_id, status }),
        });
    },

    // ---- Phase 6.5 additions ----
    notifications(unread_only = true, limit = 10): Promise<ChefNotificationsResponse> {
        const qs = new URLSearchParams();
        qs.set("unread_only", String(unread_only));
        qs.set("limit", String(limit));
        return fetchJSON(`/api/chef/notifications?${qs.toString()}`);
    },

    markNotificationsRead(ids: string[]) {
        return fetchJSON("/api/chef/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
        });
    },

    suggestions(execution_id: string) {
        const qs = new URLSearchParams();
        qs.set("execution_id", execution_id);
        return fetchJSON(`/api/chef/execute/suggestions?${qs.toString()}`);
    },
};
