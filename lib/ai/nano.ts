import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Type definitions for the experimental window.ai API
declare global {
    interface Window {
        ai?: {
            canCreateTextSession: () => Promise<"readily" | "after-download" | "no">;
            createTextSession: (options?: { systemPrompt?: string }) => Promise<any>;
        };
    }
}

export type PulseContext = {
    tasks: string[];
    nextEvent: string | null;
    habitScore: number;
    criticalAlerts: string[];
    activeDeals: string[];
};

/**
 * Checks if Gemini Nano is available in the browser.
 */
export async function checkNanoAvailability(): Promise<boolean> {
    if (typeof window === "undefined" || !window.ai) return false;
    try {
        const status = await window.ai.canCreateTextSession();
        return status === "readily";
    } catch (e) {
        console.warn("Pulse Nano Check Failed", e);
        return false;
    }
}

/**
 * Generates an Immediate Insight using Gemini Nano (if available) or Fallback.
 */
export async function generateInsight(context: PulseContext): Promise<string> {
    // 1. Try Local Nano first (Zero Latency, High Privacy)
    const isNanoAvailable = await checkNanoAvailability();

    if (isNanoAvailable && window.ai) {
        try {
            const session = await window.ai.createTextSession({
                systemPrompt: "You are Pulse, a superhuman digital butler. Your goal is to provide a SINGLE, crisp, confidence-inducing sentence that summarizes the user's current state and effectively tells them the 'One Thing' they need to know right now. Be authoritative, concise, and inspiring. Do not use 'Hello' or greetings. Just the insight."
            });

            const prompt = `
        Context:
        - Priority Tasks: ${context.tasks.join(", ")}
        - Next Event: ${context.nextEvent || "None"}
        - Habit Performance: ${context.habitScore}%
        - Critical Alerts: ${context.criticalAlerts.join(", ") || "None"}
        - Active Deals: ${context.activeDeals.join(", ")}

        Based on this, what is the single most important thing I need to know?
      `;

            return await session.prompt(prompt);
        } catch (error) {
            console.warn("Pulse Nano Generation Failed, falling back...", error);
        }
    }

    // 2. Fallback: Simple Deterministic Logic (Pre-computation or fast heuristic)
    // We do NOT want to call a server LLM here if possible to avoid latency, 
    // but if Nano fails, we need *something*. 
    // For now, return a deterministic high-value template to ensure speed.

    if (context.criticalAlerts.length > 0) {
        return `Attention Required: ${context.criticalAlerts[0]}`;
    }

    if (context.nextEvent) {
        return `Your focus is required for ${context.nextEvent}.`;
    }

    if (context.tasks.length > 0) {
        return `Priority One: ${context.tasks[0]}`;
    }

    return "All systems stable. Ready for deep work.";
}
