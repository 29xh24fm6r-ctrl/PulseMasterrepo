import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ensureDefaultContactTags } from "@/lib/people/default-tags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve user UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Ensure default tags exist (fail silently if table doesn't exist yet)
    try {
      await ensureDefaultContactTags(dbUserId);
    } catch (err) {
      console.error("[GetTags] Error ensuring default tags:", err);
      // Continue - might be missing migration
    }

    // Get all tags for user
    let tags: any[] = [];
    let error: any = null;
    
    try {
      const result = await supabaseAdmin
        .from("contact_tags")
        .select("*")
        .eq("user_id", dbUserId)
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      
      tags = result.data || [];
      error = result.error;
    } catch (err: any) {
      // Catch table doesn't exist errors
      const errorMessage = err?.message || String(err);
      const errorCode = err?.code;
      
      if (
        errorCode === "42P01" || 
        errorCode === "PGRST116" ||
        errorCode === "PGRST205" ||
        errorMessage?.includes("does not exist") ||
        (errorMessage?.includes("could not find") && errorMessage?.includes("table")) ||
        errorMessage?.includes("relation") ||
        (errorMessage?.includes("table") && errorMessage?.includes("not found"))
      ) {
        console.warn("[GetTags] contact_tags table does not exist - run migration first");
        return NextResponse.json({ ok: true, tags: [] }, {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        });
      }
      
      console.error("[GetTags] Unexpected error:", err);
      return NextResponse.json({ 
        ok: false,
        error: "Failed to fetch tags",
        details: errorMessage 
      }, { status: 500 });
    }

    if (error) {
      // Check if table doesn't exist (42P01 is PostgreSQL table doesn't exist error)
      const errorMessage = error.message || String(error);
      const errorCode = error.code;
      
      if (
        errorCode === "42P01" || 
        errorCode === "PGRST116" ||
        errorCode === "PGRST205" ||
        errorMessage?.includes("does not exist") ||
        errorMessage?.includes("could not find") && errorMessage?.includes("table") ||
        errorMessage?.includes("relation") ||
        (errorMessage?.includes("table") && errorMessage?.includes("not found")) ||
        error.details?.includes("Could not find the table")
      ) {
        console.warn("[GetTags] contact_tags table does not exist - run migration first");
        return NextResponse.json({ ok: true, tags: [] }, {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        });
      }
      console.error("[GetTags] Supabase error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, null, 2),
      });
      return NextResponse.json({ 
        ok: false,
        error: "Failed to fetch tags",
        details: errorMessage,
        code: errorCode 
      }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, tags: tags || [] },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GetTags] Unexpected error:", {
      error: err,
      message,
      stack: err instanceof Error ? err.stack : undefined,
    });
    
    // Check if it's a table-not-exists error in the catch block too
    const errorStr = String(err).toLowerCase();
    if (
      errorStr.includes("does not exist") ||
      errorStr.includes("relation") ||
      errorStr.includes("table") && errorStr.includes("not found")
    ) {
      console.warn("[GetTags] contact_tags table does not exist - run migration first");
      return NextResponse.json({ ok: true, tags: [] }, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      });
    }
    
    return NextResponse.json({ 
      ok: false,
      error: "Failed to fetch tags",
      details: message 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, category, color } = body;

    if (!name || typeof name !== "string" || name.length === 0) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    // Resolve user UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Check if tag already exists
    let existing = null;
    let checkError = null;
    
    try {
      const result = await supabaseAdmin
        .from("contact_tags")
        .select("id")
        .eq("user_id", dbUserId)
        .eq("name", name.trim())
        .maybeSingle();
      
      existing = result.data;
      checkError = result.error;
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      if (
        err?.code === "PGRST205" ||
        errorMessage?.includes("Could not find the table") ||
        errorMessage?.includes("does not exist")
      ) {
        return NextResponse.json({ 
          ok: false,
          error: "Tags feature not available yet. Please run the database migration first.",
          migration_required: true 
        }, { status: 503 });
      }
    }

    if (checkError) {
      const errorMsg = checkError.message || String(checkError);
      const errorCode = checkError.code || "";
      
      if (
        errorCode === "PGRST205" ||
        errorMsg.includes("Could not find the table") ||
        errorMsg.includes("does not exist")
      ) {
        return NextResponse.json({ 
          ok: false,
          error: "Tags feature not available yet. Please run the database migration first.",
          migration_required: true 
        }, { status: 503 });
      }
    }

    if (existing) {
      return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
    }

    // Create tag
    const { data: tag, error } = await supabaseAdmin
      .from("contact_tags")
      .insert({
        user_id: dbUserId,
        name: name.trim(),
        category: category || null,
        color: color || null,
      })
      .select()
      .single();

    if (error) {
      const errorMsg = error.message || String(error);
      const errorCode = error.code || "";
      
      console.error("[CreateTag] Supabase error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      if (
        errorCode === "PGRST205" ||
        errorMsg.includes("Could not find the table") ||
        errorMsg.includes("does not exist")
      ) {
        return NextResponse.json({ 
          ok: false,
          error: "Tags feature not available yet. Please run the database migration first.",
          migration_required: true,
          details: errorMsg 
        }, { status: 503 });
      }

      return NextResponse.json({ 
        ok: false,
        error: "Failed to create tag",
        details: errorMsg,
        code: errorCode 
      }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, tag },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[CreateTag] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

