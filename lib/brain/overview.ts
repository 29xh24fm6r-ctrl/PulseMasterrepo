import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emptyOverview } from "@/lib/shared/overview";

export async function getBrainOverview(clerkUserId: string) {
  try {
    // Resolve Clerk ID to database UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .single();

    const dbUserId = userRow?.id || clerkUserId;

    // Get recent memory fragments
    const { data: fragments } = await supabaseAdmin
      .from("tb_memory_fragments")
      .select("id, content, created_at")
      .eq("user_id", dbUserId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get total nodes count
    const { count: nodesCount } = await supabaseAdmin
      .from("tb_nodes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", dbUserId);

    // Get total edges count
    const { count: edgesCount } = await supabaseAdmin
      .from("tb_edges")
      .select("*", { count: "exact", head: true })
      .eq("user_id", dbUserId);

    const recentInsights = fragments?.length || 0;
    const totalNodes = nodesCount || 0;
    const totalEdges = edgesCount || 0;
    const memoryHealth = totalNodes > 0 && totalEdges > 0 ? "good" : totalNodes > 0 ? "warn" : "empty";

    return {
      ok: true,
      module: "brain",
      summary: `${totalNodes} nodes, ${totalEdges} connections | ${recentInsights} recent insights`,
      cards: [
        {
          title: "Recent Insights",
          value: recentInsights,
          subtitle: "Memory fragments added",
          state: recentInsights > 0 ? "good" : "empty",
        },
        {
          title: "Memory Health",
          value: `${totalNodes} nodes`,
          subtitle: `${totalEdges} connections`,
          state: memoryHealth,
        },
        {
          title: "Search Memory",
          subtitle: "Query your knowledge graph",
          state: "empty",
          cta: { label: "Search", href: "/brain" },
        },
      ],
      items: fragments?.slice(0, 5) || [],
      meta: { totalNodes, totalEdges, recentInsights },
    };
  } catch (err) {
    console.error("[BrainOverview] Error:", err);
    return emptyOverview("brain", "Brain data unavailable");
  }
}

