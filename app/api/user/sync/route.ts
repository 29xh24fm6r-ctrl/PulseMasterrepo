import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .upsert({
        clerk_id: userId,
        email: user.emailAddresses[0]?.emailAddress,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        phone: user.phoneNumbers[0]?.phoneNumber,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "clerk_id",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, user: data });
  } catch (err: any) {
    console.error("User sync error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}