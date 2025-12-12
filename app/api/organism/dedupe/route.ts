// Deduplication API - Find and merge duplicates
// app/api/organism/dedupe/route.ts

import { NextRequest } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";
import { findDuplicateContacts, findDuplicateOrganizations, mergeDuplicateContacts } from "@/lib/organism/dedupe";

// GET - Find duplicates
export async function GET(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "all";

    const results: any = {};

    if (type === "contacts" || type === "all") {
      results.contacts = await findDuplicateContacts(userId);
    }

    if (type === "organizations" || type === "all") {
      results.organizations = await findDuplicateOrganizations(userId);
    }

    return jsonOk({
      duplicates: results,
      summary: {
        contact_duplicates: results.contacts?.length || 0,
        organization_duplicates: results.organizations?.length || 0,
      },
    });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

// POST - Merge duplicates (destructive operation)
export async function POST(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const body = await request.json();

    if (body.action !== "merge" || !body.duplicate) {
      return jsonOk({ error: "Invalid request. Expected { action: 'merge', duplicate: {...} }" }, { status: 400 });
    }

    if (body.duplicate.email) {
      // Merge contacts
      const result = await mergeDuplicateContacts(userId, body.duplicate);
      return jsonOk({
        success: true,
        message: `Merged ${result.merged_count} duplicate contacts into ${result.kept_id}`,
        kept_id: result.kept_id,
        merged_count: result.merged_count,
      });
    } else {
      return jsonOk({ error: "Only contact merging is implemented. Organizations coming soon." }, { status: 501 });
    }
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

