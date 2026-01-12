import { NextResponse } from "next/server";
import { CreateDraftBodySchema } from "@/lib/chef/orders/types";
import { pickVendor } from "@/lib/chef/orders/vendorSelect";
import { buildDraftItemsFromMatch, normalizeManualItems } from "@/lib/chef/orders/buildDraft";
import { createOrderDraft } from "@/lib/chef/orders/writeDraft";

function requireOwnerUserId(req: Request): string {
    const owner = req.headers.get("x-owner-user-id");
    if (!owner) throw new Error("Missing x-owner-user-id (temporary dev auth)");
    return owner;
}

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const owner_user_id = requireOwnerUserId(req);
        const body = CreateDraftBodySchema.parse(await req.json());

        const vendor = await pickVendor({ vendor_name: body.vendor_name });

        let items: any[] = [];
        let notes: string[] = [];

        if (body.mode === "from_match") {
            if (!body.match) {
                return NextResponse.json({ ok: false, error: "mode=from_match requires match" }, { status: 400 });
            }

            const built = buildDraftItemsFromMatch({
                missing_required: body.match.missing_required,
                missing_optional: body.match.missing_optional ?? [],
                include_optional: body.match.include_optional ?? false,
                title: body.match.title,
            });

            items = built.items;
            notes = built.notes;
        } else {
            if (!body.items?.length) {
                return NextResponse.json({ ok: false, error: "mode=manual requires items[]" }, { status: 400 });
            }
            items = normalizeManualItems(body.items);
            notes = ["Draft built from manual list."];
        }

        if (!items.length) {
            return NextResponse.json({ ok: false, error: "No items to draft." }, { status: 400 });
        }

        const draft = await createOrderDraft({
            owner_user_id,
            vendor_id: vendor.id,
            items,
        });

        return NextResponse.json({
            ok: true,
            vendor,
            draft,
            notes,
        });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
    }
}
