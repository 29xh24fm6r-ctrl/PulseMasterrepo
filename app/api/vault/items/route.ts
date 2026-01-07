import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST - Save encrypted note (server stores ciphertext only)
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { item_type, item_name, encrypted_data, encryption_iv, key_derivation_salt, tags, metadata } = await req.json();

  if (!item_name || !encrypted_data || !encryption_iv || !key_derivation_salt) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Server NEVER decrypts - only stores ciphertext
  const { data, error } = await supabase
    .from("vault_items")
    .insert({
      user_id_uuid: userId,
      item_type: item_type || "secret",
      item_name,
      encrypted_data, // Ciphertext only
      encryption_iv,
      key_derivation_salt,
      tags: tags || [],
      metadata: metadata || {},
    })
    .select("id, item_type, item_name, tags, created_at")
    .single();

  if (error) {
    console.error("Vault insert failed:", error);
    return NextResponse.json({ error: "Failed to save item" }, { status: 500 });
  }

  return NextResponse.json({ success: true, item: data });
}

// GET - List metadata only (no ciphertext)
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  // Return metadata only - NOT the encrypted data
  const { data, error } = await supabase
    .from("vault_items")
    .select("id, item_type, item_name, tags, metadata, created_at, updated_at")
    .eq("user_id_uuid", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Vault list failed:", error);
    return NextResponse.json({ error: "Failed to list items" }, { status: 500 });
  }

  return NextResponse.json({ items: data });
}