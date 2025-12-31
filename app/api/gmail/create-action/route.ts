import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createTask } from "@/lib/data/tasks";
import { createFollowUp } from "@/lib/data/followups";

function calculateDueDate(dateStr: string | null, priority: string): string {
  if (dateStr) return dateStr;

  const now = new Date();
  switch (priority) {
    case "high":
      now.setDate(now.getDate() + 1);
      break;
    case "medium":
      now.setDate(now.getDate() + 3);
      break;
    case "low":
      now.setDate(now.getDate() + 7);
      break;
    default:
      now.setDate(now.getDate() + 3);
  }
  return now.toISOString().split("T")[0];
}

// Type definitions
type ActionType = "task" | "follow_up" | "commitment" | "waiting_on";

interface ActionData {
  type: ActionType;
  priority: string;
  description: string;
  dueDate: string | null;
  context?: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  personId?: string;
}

const typeLabels: Record<ActionType, string> = {
  task: "Task",
  commitment: "Commitment",
  follow_up: "Follow-up",
  waiting_on: "Check-in",
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body as { action: ActionData };

    if (!action) {
      return NextResponse.json(
        { ok: false, error: "Missing action data" },
        { status: 400 }
      );
    }

    console.log(`📝 Creating ${action.type} from email...`);

    const dueDate = calculateDueDate(action.dueDate, action.priority);

    // Build context note
    const contextNote = `From: ${action.fromName} (${action.fromEmail})
Subject: ${action.subject}
Context: ${action.context || "N/A"}
Source: Email Intelligence Scanner`;

    const itemName = `${typeLabels[action.type]}: ${action.description}`;

    let resultId = "";
    const isTaskType = action.type === "task" || action.type === "commitment";

    if (isTaskType) {
      const task = await createTask(userId, {
        title: itemName,
        status: "pending",
        priority: action.priority.charAt(0).toUpperCase() + action.priority.slice(1),
        due_at: dueDate,
        description: contextNote,
        // Could map 'waiting_on' to a specific tag or status if needed
      });
      resultId = task.id;
    } else {
      // Follow Up
      const followUp = await createFollowUp(userId, {
        name: itemName,
        status: "pending",
        priority: action.priority.charAt(0).toUpperCase() + action.priority.slice(1),
        due_date: dueDate,
        type: action.type === 'waiting_on' ? 'waiting_on' : 'general',
        person_name: action.fromName, // Best guess
        // notes: contextNote // If followups schema has notes? It doesn't yet.
      });
      resultId = followUp.id;
      // Ideally we'd store contextNote somewhere. For now, it's lost for followups unless I add a column.
      // Or I append it to the name?
    }

    return NextResponse.json({
      ok: true,
      id: resultId,
      type: action.type,
      name: itemName,
      dueDate,
      database: isTaskType ? "tasks" : "follow-ups",
    });

  } catch (err: unknown) {
    console.error("❌ Create action error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to create action";
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}