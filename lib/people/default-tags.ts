import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

const DEFAULT_TAGS = [
  // Personal
  { name: "Friend", category: "Personal", color: "#3b82f6" },
  { name: "Family", category: "Personal", color: "#8b5cf6" },
  { name: "Partner", category: "Personal", color: "#ec4899" },
  { name: "Dating", category: "Personal", color: "#f59e0b" },
  // Work
  { name: "Client", category: "Work", color: "#10b981" },
  { name: "Prospect", category: "Work", color: "#06b6d4" },
  { name: "Team", category: "Work", color: "#6366f1" },
  { name: "Vendor", category: "Work", color: "#84cc16" },
  // Services
  { name: "Doctor", category: "Services", color: "#ef4444" },
  { name: "Dentist", category: "Services", color: "#f97316" },
  { name: "Exterminator", category: "Services", color: "#14b8a6" },
  { name: "Mechanic", category: "Services", color: "#64748b" },
  // Other
  { name: "VIP", category: "Other", color: "#fbbf24" },
  { name: "Priority", category: "Other", color: "#dc2626" },
];

export async function ensureDefaultContactTags(dbUserId: string): Promise<void> {
  try {
    // Get existing tags for user
    const { data: existingTags } = await supabaseAdmin
      .from("contact_tags")
      .select("name")
      .eq("user_id", dbUserId);

    const existingNames = new Set((existingTags || []).map((t) => t.name.toLowerCase()));

    // Insert missing default tags
    const tagsToInsert = DEFAULT_TAGS.filter(
      (tag) => !existingNames.has(tag.name.toLowerCase())
    );

    if (tagsToInsert.length > 0) {
      await supabaseAdmin.from("contact_tags").insert(
        tagsToInsert.map((tag) => ({
          user_id: dbUserId,
          name: tag.name,
          category: tag.category,
          color: tag.color,
        }))
      );
    }
  } catch (err) {
    console.error("[ensureDefaultTags] Error:", err);
    // Fail soft - don't throw
  }
}

