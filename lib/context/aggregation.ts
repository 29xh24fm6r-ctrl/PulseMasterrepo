import { PulseContext } from "@/lib/ai/nano";

// Mock Aggreagtion for V1 (To be wired to real data points)
// In a real implementation, this would call your Supabase helpers or API routes.
// Speed is critical, so we might want to cache this in localStorage or sessionStorage.

export async function getDeepContext(): Promise<PulseContext> {
    // TODO: Replace with real data fetching
    // verify if we can fetch this client side or need a server action

    // Simulating data fetch
    const now = new Date();
    const currentHour = now.getHours();

    let nextEvent = null;
    if (currentHour < 10) nextEvent = "Daily Standup at 10:00 AM";
    else if (currentHour < 14) nextEvent = "Strategy Review with Sarah at 2:00 PM";

    return {
        tasks: ["Finish Q1 Report", "Review Q4 Metrics", "Email Board"],
        nextEvent: nextEvent,
        habitScore: 92,
        criticalAlerts: currentHour > 14 ? ["Q1 Strategic Review is overdue"] : [],
        activeDeals: ["Acme Corp ($50k)", "Globex ($120k)"]
    };
}
