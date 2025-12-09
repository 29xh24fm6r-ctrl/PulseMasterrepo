import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const TASKS_DB = process.env.NOTION_DATABASE_TASKS;
const FOLLOW_UPS_DB = process.env.NOTION_DATABASE_FOLLOW_UPS;

if (!NOTION_API_KEY) {
  throw new Error("Missing NOTION_API_KEY");
}

const notion = new Client({ auth: NOTION_API_KEY });

function normalizeDatabaseId(id: string): string {
  return id.replace(/-/g, "");
}

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

const namePrefixes: Record<ActionType, string> = {
  task: "📋",
  commitment: "📤",
  follow_up: "📅",
  waiting_on: "⏳",
};

const typeLabels: Record<ActionType, string> = {
  task: "Task",
  commitment: "Commitment",
  follow_up: "Follow-up",
  waiting_on: "Check-in",
};

export async function POST(req: NextRequest) {
  try {
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

    // Determine the database to use
    const isTaskType = action.type === "task" || action.type === "commitment";
    const targetDb = isTaskType ? (TASKS_DB || FOLLOW_UPS_DB) : FOLLOW_UPS_DB;

    if (!targetDb) {
      return NextResponse.json(
        { ok: false, error: "No database configured. Set NOTION_DATABASE_FOLLOW_UPS in .env.local" },
        { status: 500 }
      );
    }

    // Get name prefix and type label
    const namePrefix = namePrefixes[action.type] || "📌";
    const itemName = `${namePrefix} ${action.description}`;
    const typeLabel = typeLabels[action.type] || "Follow-up";

    // Build properties
    const properties: Record<string, unknown> = {
      Name: {
        title: [{ text: { content: itemName } }],
      },
    };

    // Add Status
    properties["Status"] = { select: { name: "Pending" } };

    // Add Priority
    const priorityLabel = action.priority.charAt(0).toUpperCase() + action.priority.slice(1);
    properties["Priority"] = { select: { name: priorityLabel } };

    // Add Due Date
    properties["Due Date"] = { date: { start: dueDate } };

    // Add Type
    properties["Type"] = { select: { name: typeLabel } };

    // Add Channel
    properties["Channel"] = { select: { name: "Email" } };

    // Add Context/Notes
    properties["Context"] = { rich_text: [{ text: { content: contextNote } }] };

    // Create the page
    try {
      const response = await notion.pages.create({
        parent: { database_id: normalizeDatabaseId(targetDb) },
        properties: properties as Parameters<typeof notion.pages.create>[0]["properties"],
      });

      console.log(`✅ Created: ${response.id}`);

      // Try to add a callout block with more context
      try {
        await notion.blocks.children.append({
          block_id: response.id,
          children: [
            {
              object: "block",
              type: "callout",
              callout: {
                icon: { emoji: "📧" },
                rich_text: [{ type: "text", text: { content: contextNote } }],
              },
            },
          ],
        });
      } catch {
        // Not critical if this fails
      }

      return NextResponse.json({
        ok: true,
        id: response.id,
        type: action.type,
        name: itemName,
        dueDate,
        database: isTaskType && TASKS_DB ? "tasks" : "follow-ups",
      });
    } catch (err: unknown) {
      console.error("Notion API error:", err);

      // If it failed due to property issues, try with minimal properties
      try {
        const minimalProperties = {
          Name: {
            title: [{ text: { content: itemName } }],
          },
        };

        const response = await notion.pages.create({
          parent: { database_id: normalizeDatabaseId(targetDb) },
          properties: minimalProperties,
        });

        console.log(`✅ Created with minimal props: ${response.id}`);

        return NextResponse.json({
          ok: true,
          id: response.id,
          type: action.type,
          name: itemName,
          dueDate,
          note: "Created with minimal properties",
        });
      } catch (retryErr: unknown) {
        throw retryErr;
      }
    }
  } catch (err: unknown) {
    console.error("❌ Create action error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to create action";
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}