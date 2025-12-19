// app/api/people/create/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolvePulseUserUuidFromClerk } from "@/lib/auth/resolvePulseUserUuid";

export const dynamic = "force-dynamic";

/**
 * IMPORTANT:
 * - Always return 200 with { ok: boolean } to avoid UI bug on non-200.
 * - DB schema for contacts uses: primary_email / primary_phone / company_name / job_title.
 */

function ok(data: any = {}) {
  return NextResponse.json({ ok: true, ...data }, { status: 200 });
}

function fail(error: string, extra: Record<string, any> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status: 200 });
}

const CreatePersonSchema = z.object({
  first_name: z.string().min(1, "first_name is required"),
  last_name: z.string().min(1, "last_name is required"),
  company_name: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  type: z.string().optional().default("Business"),
  tags: z.array(z.string()).optional().default([]),
  timezone: z.string().optional().nullable(),
});

function normalizeEmail(email: string | null | undefined) {
  if (!email) return null;
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length ? digits : null;
}

function normalizeFullName(first: string, last: string) {
  return `${first} ${last}`.trim().toLowerCase();
}

function parseExistingContactIdFromDetail(detail?: string | null): string | null {
  if (!detail) return null;
  const match = detail.match(/existing_contact_id=([0-9a-fA-F-]{36})/);
  return match?.[1] ?? null;
}

function isDedupGuardError(msg?: string | null): boolean {
  return !!msg && msg.startsWith("Duplicate contact blocked:");
}

function uniqStrings(arr: string[]) {
  return Array.from(new Set(arr.map(s => s.trim()).filter(Boolean)));
}

function mergeTags(existing: string[] | null | undefined, incoming: string[] | null | undefined) {
  const a = Array.isArray(existing) ? existing : [];
  const b = Array.isArray(incoming) ? incoming : [];
  return uniqStrings([...a, ...b]);
}

function isBlank(v: any) {
  return v === null || v === undefined || (typeof v === "string" && v.trim().length === 0);
}

type PersonPayload = {
  first_name: string;
  last_name: string;
  company_name?: string | null;
  job_title?: string | null;
  email?: string | null;
  phone?: string | null;
  type?: string | null;
  tags?: string[] | null;
  timezone?: string | null;
};

function computeImprovementPatch(existing: any, incoming: PersonPayload) {
  const patch: Record<string, any> = {};

  // Only fill blanks on existing contact (safe default)
  if (isBlank(existing.company_name) && !isBlank(incoming.company_name)) {
    patch.company_name = incoming.company_name;
  }

  // Prefer job_title; keep title in sync
  if (isBlank(existing.job_title) && !isBlank(incoming.job_title)) {
    patch.job_title = incoming.job_title;
  }
  if (isBlank(existing.title) && !isBlank(incoming.job_title)) {
    patch.title = incoming.job_title;
  }

  // Email/phone are "identity fields"; we only add if blank
  if (isBlank(existing.primary_email) && !isBlank(incoming.email)) {
    patch.primary_email = incoming.email;
  }
  if (isBlank(existing.primary_phone) && !isBlank(incoming.phone)) {
    patch.primary_phone = incoming.phone;
  }

  // Merge tags always (safe, non-destructive)
  if (incoming.tags && incoming.tags.length) {
    const merged = mergeTags(existing.tags, incoming.tags);
    if (JSON.stringify(merged) !== JSON.stringify(existing.tags ?? [])) {
      patch.tags = merged;
    }
  }

  // Type: only set if blank
  if (isBlank(existing.type) && !isBlank(incoming.type)) {
    patch.type = incoming.type;
  }

  // Timezone: only set if blank
  if (isBlank(existing.timezone) && !isBlank(incoming.timezone)) {
    patch.timezone = incoming.timezone;
  }

  return patch;
}

export async function POST(req: Request) {
  try {
    const clerkUserId = await requireClerkUserId();

    const body = await req.json().catch(() => null);
    if (!body) return fail("Invalid JSON body");

    const parsed = CreatePersonSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Validation failed", { issues: parsed.error.issues });
    }

    const p = parsed.data;
    const fullName = `${p.first_name} ${p.last_name}`.trim();

    // ✅ canonical Pulse UUID from profiles.id
    let pulseUserUuid: string;
    try {
      pulseUserUuid = await resolvePulseUserUuidFromClerk(clerkUserId);
    } catch (err: any) {
      console.error("[CreatePerson] Failed to resolve Pulse UUID:", err);
      return fail("User account not found. Please ensure you are properly authenticated.", {
        details: err.message || "No user mapping found for Clerk ID",
      });
    }


    // ✅ MUST MATCH crm_contacts columns exactly
    const insertRow = {
      user_id: pulseUserUuid,       // uuid NOT NULL
      owner_user_id: clerkUserId,   // text (clerk id string)

      first_name: p.first_name,
      last_name: p.last_name,
      full_name: fullName,
      display_name: fullName,

      company_name: p.company_name ?? null,

      // keep both until you deprecate one
      job_title: p.job_title ?? null,
      title: p.job_title ?? null,

      primary_email: p.email ?? null,
      primary_phone: p.phone ?? null,

      type: p.type ?? "Business",
      tags: p.tags ?? [],

      timezone: p.timezone ?? null,

      normalized_email: normalizeEmail(p.email),
      normalized_phone: normalizePhone(p.phone),
      normalized_full_name: normalizeFullName(p.first_name, p.last_name),
    };

    console.log("[CreatePerson] clerk:", clerkUserId);
    console.log("[CreatePerson] pulseUserUuid:", pulseUserUuid);
    console.log("[CreatePerson] insert keys:", Object.keys(insertRow));

    const { data, error } = await supabaseAdmin
      .from("crm_contacts")
      .insert(insertRow)
      .select("*")
      .single();

    if (error) {
      console.error("[CreatePerson] Supabase error:", error);

      if (isDedupGuardError(error.message)) {
        const detail = (error as any).details ?? (error as any).detail ?? null;
        const existingId = parseExistingContactIdFromDetail(detail);

        if (!existingId) {
          return NextResponse.json(
            {
              ok: false,
              code: "DUPLICATE_CONTACT",
              error: "Contact already exists.",
              existing_contact_id: null,
              dedup_reason: error.message,
            },
            { status: 200 }
          );
        }

        // Fetch existing record
        const { data: existing, error: readErr } = await supabaseAdmin
          .from("crm_contacts")
          .select("*")
          .eq("id", existingId)
          .single();

        if (readErr || !existing) {
          return NextResponse.json(
            {
              ok: false,
              code: "DUPLICATE_CONTACT",
              error: "Contact already exists. (Could not load existing record.)",
              existing_contact_id: existingId,
              dedup_reason: error.message,
            },
            { status: 200 }
          );
        }

        // Compute improvement patch from incoming payload
        const improvementPatch = computeImprovementPatch(existing, p as any);

        // Feature flag: auto-apply safe improvements immediately
        const AUTO_APPLY_DUPLICATE_IMPROVEMENTS =
          process.env.PULSE_AUTO_APPLY_DUPLICATE_IMPROVEMENTS === "true";

        let applied = false;
        let updatedExisting: any = existing;

        if (AUTO_APPLY_DUPLICATE_IMPROVEMENTS && Object.keys(improvementPatch).length > 0) {
          const { data: updated, error: updErr } = await supabaseAdmin
            .from("crm_contacts")
            .update(improvementPatch)
            .eq("id", existingId)
            .select("*")
            .single();

          if (!updErr && updated) {
            applied = true;
            updatedExisting = updated;
          } else {
            console.error("[CreatePerson] duplicate auto-apply failed:", updErr);
          }
        }

        return NextResponse.json(
          {
            ok: false,
            code: "DUPLICATE_CONTACT",
            error: applied
              ? "Contact already existed — we updated it with your new info."
              : "Contact already exists — opening the existing record.",
            existing_contact_id: existingId,
            dedup_reason: error.message,
            // "Pulse Brain payload"
            existing_person: updatedExisting,
            // If not auto-applied, frontend can offer one-click apply
            improvement_patch: applied ? null : improvementPatch,
            improvement_count: applied ? 0 : Object.keys(improvementPatch).length,
            auto_applied: applied,
          },
          { status: 200 }
        );
      }

      // Default failure path (still 200)
      return NextResponse.json(
        {
          ok: false,
          code: "DB_INSERT_FAILED",
          error: "Database insert failed",
          supabase: {
            code: error.code,
            message: error.message,
            details: (error as any).details ?? (error as any).detail ?? null,
            hint: error.hint,
          },
        },
        { status: 200 }
      );
    }

    return ok({ person: data });
  } catch (err: any) {
    console.error("[CreatePerson] fatal:", err);
    return fail("Internal error while creating person", {
      message: err?.message || String(err),
    });
  }
}
