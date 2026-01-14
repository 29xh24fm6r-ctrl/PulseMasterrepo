import { supabaseAdmin } from "@/lib/supabase/admin";

export async function pickVendor(args: { vendor_name?: string }) {
    const sb = supabaseAdmin();

    if (args.vendor_name) {
        const { data, error } = await sb
            .from("chef_grocery_vendors")
            .select("id,name,supports_deeplink,supports_autoplace")
            .ilike("name", args.vendor_name)
            .limit(1);

        if (error) throw error;
        if (data?.[0]) return data[0];
    }

    // V1 default vendor: first alphabetically (stable)
    const { data, error } = await sb
        .from("chef_grocery_vendors")
        .select("id,name,supports_deeplink,supports_autoplace")
        .order("name", { ascending: true })
        .limit(1);

    if (error) throw error;
    if (!data?.[0]) throw new Error("No grocery vendors found. Run seed vendors migration.");

    return data[0];
}
