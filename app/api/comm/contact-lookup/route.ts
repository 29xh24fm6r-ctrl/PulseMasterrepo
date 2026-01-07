import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    // Allow unauthenticated lookup? Probably not for security, but maybe internal webhook?
    // The original didn't check auth but relied on Env vars. Now we rely on RLS/userId.
    // If this is called by internal system, we might need a bypass, but usually it's client side.
    if (!userId) {
      // Fail safe
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const phone = url.searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: "phone required" }, { status: 400 });
    }

    const cleaned = phone.replace(/\D/g, "");

    console.log(`🔍 Looking up: ${phone}`);

    // Fetch all contacts with phone numbers for this user (optimization: filter by not null phone)
    // Since phone formatting varies, we fetch all and check in JS, or use a broad ilike if possible.
    // Given the small scale of contacts usually (<10k), fetching id, name, phone is fine.

    const { data: contacts, error } = await (supabaseAdmin as any)
      .from("contacts")
      .select("id, name, company, phone")
      .eq("user_id", userId)
      .not("phone", "is", null);

    if (error) throw error;

    const variants = [
      cleaned,
      cleaned.length === 10 ? `1${cleaned}` : cleaned,
      cleaned.length === 11 && cleaned.startsWith("1") ? cleaned.slice(1) : cleaned,
    ];

    for (const contact of contacts) {
      if (!contact.phone) continue;
      const contactCleaned = contact.phone.replace(/\D/g, "");

      if (variants.some(v => contactCleaned.includes(v) || v.includes(contactCleaned))) {
        console.log(`✅ Found: ${contact.name}`);
        return NextResponse.json({
          found: true,
          contact: {
            id: contact.id,
            name: contact.name,
            company: contact.company,
            phone: contact.phone,
            // notionUrl no longer exists, maybe link to app route?
          },
        });
      }
    }

    return NextResponse.json({ found: false, contact: null });

  } catch (error: any) {
    console.error("Lookup error:", error);
    return NextResponse.json({ found: false, contact: null });
  }
}
