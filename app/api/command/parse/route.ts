// Command Parser API
// POST /api/command/parse
// app/api/command/parse/route.ts

import { NextRequest } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";

interface CommandContext {
  surface?: string;
  selected?: {
    type: string;
    id: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const body = await request.json();

    const { text, context }: { text: string; context?: CommandContext } = body;

    if (!text || !text.trim()) {
      return jsonOk({ error: "Text is required" }, { status: 400 });
    }

    // Simple intent detection (can be enhanced with NLP/LLM)
    const normalized = text.toLowerCase().trim();
    const plan: any[] = [];
    let intent = "UNKNOWN";

    // Meeting prep
    if (normalized.match(/prep.*meeting|prepare.*2pm|prep.*\d+pm/i)) {
      intent = "MEETING_PREP";
      const timeMatch = normalized.match(/(\d+)\s*(am|pm)/i);
      if (timeMatch) {
        plan.push({
          type: "OPEN_SURFACE",
          surface: "time",
        });
        plan.push({
          type: "GENERATE_PREP_PACKET",
          eventId: timeMatch[0], // In real implementation, resolve to actual event ID
        });
      } else {
        plan.push({
          type: "OPEN_SURFACE",
          surface: "time",
        });
      }
    }

    // Task creation
    else if (normalized.match(/create.*task|add.*task|new.*task/i)) {
      intent = "CREATE_TASK";
      const taskMatch = normalized.match(/task[:\s]+(.+)/i);
      if (taskMatch) {
        plan.push({
          type: "CREATE_TASK",
          payload: {
            title: taskMatch[1].trim(),
            status: "pending",
          },
        });
      } else {
        plan.push({
          type: "OPEN_SURFACE",
          surface: "workspace",
        });
      }
    }

    // Contact search
    else if (normalized.match(/find.*contact|search.*contact|show.*contact/i)) {
      intent = "FIND_CONTACT";
      const nameMatch = normalized.match(/contact[:\s]+(.+)/i);
      plan.push({
        type: "OPEN_SURFACE",
        surface: "people",
        query: nameMatch ? nameMatch[1].trim() : undefined,
      });
    }

    // Attention query
    else if (normalized.match(/what.*attention|what.*need|show.*attention|priority/i)) {
      intent = "SHOW_ATTENTION";
      plan.push({
        type: "OPEN_SURFACE",
        surface: "home",
        scrollTo: "leverage",
      });
    }

    // Time/schedule query
    else if (normalized.match(/my.*day|schedule|calendar|what.*time/i)) {
      intent = "SHOW_SCHEDULE";
      plan.push({
        type: "OPEN_SURFACE",
        surface: "time",
      });
    }

    // Focus query
    else if (normalized.match(/what.*focus|focus.*on|should.*focus/i)) {
      intent = "SHOW_FOCUS";
      plan.push({
        type: "OPEN_SURFACE",
        surface: "workspace",
        mode: "focus",
      });
    }

    // Default: search
    else {
      intent = "SEARCH";
      plan.push({
        type: "OPEN_SURFACE",
        surface: context?.surface || "home",
        query: text,
      });
    }

    return jsonOk({
      intent,
      plan,
      confidence: 0.8,
    });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

