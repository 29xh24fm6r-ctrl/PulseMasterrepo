import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";

function getSupabase() {
  return getSupabaseAdminRuntimeClient();
}

// GET - Retrieve ciphertext for client-side decryption
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("vault_items")
    .select("id, item_type, item_name, encrypted_data, encryption_iv, key_derivation_salt, tags, metadata, created_at")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item: data });
}

// DELETE - Remove vault item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabase();

  const { error } = await supabase
    .from("vault_items")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Vault delete failed:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH - Update metadata (not encrypted data)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { item_name, tags, metadata } = await req.json();
  const supabase = getSupabase();

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (item_name) updates.item_name = item_name;
  if (tags) updates.tags = tags;
  if (metadata) updates.metadata = metadata;

  const { data, error } = await supabase
    .from("vault_items")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, item_type, item_name, tags, metadata, updated_at")
    .single();

  if (error) {
    console.error("Vault update failed:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}