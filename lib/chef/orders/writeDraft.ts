import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ChefOrderDraftItem } from "./types";

export async function createOrderDraft(args: {
    owner_user_id: string;
    vendor_id: string;
    items: ChefOrderDraftItem[];
}) {
    const sb = supabaseAdmin();

    const { data, error } = await sb
        .from("chef_order_drafts")
        .insert({
            owner_user_id: args.owner_user_id,
            vendor_id: args.vendor_id,
            items: args.items,
            estimated_total: null,
            eta_minutes: null,
            status: "draft",
        })
        .select("id, owner_user_id, vendor_id, items, estimated_total, eta_minutes, status, created_at")
        .single();

    if (error) throw error;
    return data;
}
