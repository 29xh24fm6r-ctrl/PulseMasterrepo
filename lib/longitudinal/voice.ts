// Longitudinal Modeling Voice Commands
import { LongitudinalModeling } from "./index";

export const LONGITUDINAL_VOICE_TOOLS = [
  {
    type: "function",
    name: "start_life_chapter",
    description: "Start a new chapter in the user's life story",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title for this chapter" },
        focus: {
          type: "string",
          enum: ["career", "health", "relationship", "growth", "family", "creativity", "adventure"],
          description: "Primary focus"
        },
        themes: { type: "array", items: { type: "string" }, description: "Key themes" }
      },
      required: ["title"]
    }
  },
  {
    type: "function",
    name: "record_milestone",
    description: "Record a significant milestone or achievement",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the milestone" },
        type: { type: "string", enum: ["achievement", "transition", "insight", "decision", "event"], description: "Type" },
        description: { type: "string", description: "Description" },
        significance: { type: "number", description: "0-1 scale" }
      },
      required: ["title", "type"]
    }
  },
  {
    type: "function",
    name: "update_growth_trajectory",
    description: "Track progress on a skill or attribute",
    parameters: {
      type: "object",
      properties: {
        attribute: { type: "string", description: "The skill being tracked" },
        level: { type: "number", description: "Current level 0-10" },
        note: { type: "string", description: "Optional note" }
      },
      required: ["attribute", "level"]
    }
  },
  {
    type: "function",
    name: "get_life_snapshot",
    description: "Generate a snapshot summary of recent life metrics",
    parameters: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["weekly", "monthly", "quarterly"], description: "Time period" }
      }
    }
  },
  {
    type: "function",
    name: "get_current_chapter",
    description: "Get information about the current life chapter",
    parameters: { type: "object", properties: {} }
  },
  {
    type: "function",
    name: "detect_life_trends",
    description: "Analyze long-term trends in emotional, productivity, and energy patterns",
    parameters: { type: "object", properties: {} }
  }
];

export async function handleLongitudinalVoiceCommand(
  functionName: string,
  args: Record<string, any>,
  userId: string
): Promise<string> {
  switch (functionName) {
    case "start_life_chapter": {
      const chapter = await LongitudinalModeling.startChapter(userId, args.title, args.focus, args.themes);
      return `🎬 **New Chapter Started: "${chapter.chapter_title}"**\n\nFocus: ${chapter.primary_focus || "General"}\nStarted: ${chapter.start_date}`;
    }

    case "record_milestone": {
      const milestone = await LongitudinalModeling.recordMilestone(userId, {
        type: args.type, title: args.title, description: args.description, significance: args.significance
      });
      const stars = "⭐".repeat(Math.round((milestone.significance_score || 0.5) * 5));
      return `🏆 **Milestone Recorded: "${milestone.title}"**\n\nType: ${milestone.milestone_type}\nSignificance: ${stars}`;
    }

    case "update_growth_trajectory": {
      const trajectory = await LongitudinalModeling.updateTrajectory(userId, args.attribute, args.level, args.note);
      const bar = "█".repeat(args.level) + "░".repeat(10 - args.level);
      return `📊 **${args.attribute}** Updated\n\nLevel: [${bar}] ${args.level}/10`;
    }

    case "get_life_snapshot": {
      const snapshot = await LongitudinalModeling.createSnapshot(userId, args.period || "weekly");
      return `📸 **${args.period || "Weekly"} Snapshot**\n\nDominant emotions: ${snapshot.dominant_emotions?.join(", ") || "N/A"}\nTasks completed: ${snapshot.tasks_completed}\n\n${snapshot.narrative_summary || ""}`;
    }

    case "get_current_chapter": {
      const chapter = await LongitudinalModeling.getCurrentChapter(userId);
      if (!chapter) return "No active chapter. Say 'Start a new chapter called [title]'";
      return `📖 **Current Chapter: "${chapter.chapter_title}"**\n\nFocus: ${chapter.primary_focus || "General"}\nStarted: ${chapter.start_date}`;
    }

    case "detect_life_trends": {
      const trends = await LongitudinalModeling.detectTrends(userId);
      if (!trends?.length) return "Need more data to detect trends. Keep logging!";
      return `🔮 **Life Trends**\n\n${trends.map((t: any) => `• ${t.metric_name}: ${t.description}`).join("\n")}`;
    }

    default:
      return "Unknown command";
  }
}

export default { LONGITUDINAL_VOICE_TOOLS, handleLongitudinalVoiceCommand };