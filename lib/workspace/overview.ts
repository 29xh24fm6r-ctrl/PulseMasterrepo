import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emptyOverview } from "@/lib/shared/overview";

export async function getWorkspaceOverview(clerkUserId: string) {
  try {
    // Resolve Clerk ID to database UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .single();

    const dbUserId = userRow?.id || clerkUserId;

    // Get today's workspace state
    const today = new Date().toISOString().split("T")[0];
    const { data: workspaceState } = await supabaseAdmin
      .from("workspace_state")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("state_date", today)
      .maybeSingle();

    // Get active threads
    const { data: threads } = await supabaseAdmin
      .from("workspace_threads")
      .select("id, title, status, priority")
      .eq("user_id", dbUserId)
      .eq("status", "active")
      .order("priority", { ascending: false })
      .limit(10);

    // Get tasks for today
    const { data: tasks } = await supabaseAdmin
      .from("quantum_tasks")
      .select("id, title, status, priority")
      .eq("user_id", dbUserId)
      .in("status", ["pending", "in_progress"])
      .order("priority", { ascending: false })
      .limit(10);

    const focusMode = workspaceState?.focus_mode || "normal";
    const focusTheme = workspaceState?.focus_theme || "No focus theme set";
    const activeThreadsCount = threads?.length || 0;
    const openActionsCount = tasks?.length || 0;

    return {
      ok: true,
      module: "workspace",
      summary: `Focus: ${focusMode} | ${activeThreadsCount} active threads, ${openActionsCount} open actions`,
      cards: [
        {
          title: "Today's Focus",
          value: focusTheme,
          subtitle: `Mode: ${focusMode}`,
          state: focusMode === "deep_work" ? "good" : focusMode === "fire_fighting" ? "bad" : "warn",
        },
        {
          title: "Open Actions",
          value: openActionsCount,
          subtitle: `${activeThreadsCount} active threads`,
          state: openActionsCount > 0 ? "warn" : "good",
          cta: openActionsCount > 0 ? { label: "View Tasks", href: "/workspace" } : undefined,
        },
        {
          title: "Quick Capture",
          subtitle: "Capture a thought or action",
          state: "empty",
          cta: { label: "Capture", href: "/workspace" },
        },
      ],
      items: threads || [],
      meta: { workspaceState, threadsCount: activeThreadsCount, tasksCount: openActionsCount },
    };
  } catch (err) {
    console.error("[WorkspaceOverview] Error:", err);
    return emptyOverview("workspace", "Workspace data unavailable");
  }
}

