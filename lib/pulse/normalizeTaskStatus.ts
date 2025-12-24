// lib/pulse/normalizeTaskStatus.ts

export type UiTaskStatus = "Todo" | "In Progress" | "Done";
export type DbTaskStatus = "todo" | "in_progress" | "done";

/** UI → DB */
export function uiToDbTaskStatus(input: string | null): DbTaskStatus | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();

  if (s === "done") return "done";
  if (s.includes("progress")) return "in_progress";
  if (s === "todo" || s === "to do" || s === "to-do") return "todo";

  // If UI accidentally passes db values, accept them.
  if (s === "in_progress") return "in_progress";
  if (s === "todo") return "todo";

  return null;
}

/** DB → UI */
export function dbToUiTaskStatus(db: string): UiTaskStatus {
  if (db === "done") return "Done";
  if (db === "in_progress") return "In Progress";
  return "Todo";
}

