import { NextResponse } from "next/server";
import { z } from "zod";
import { detectIngredientsFromImages } from "@/lib/chef/vision/openaiVision";
import { writeInventoryScan } from "@/lib/chef/inventory/writeScan";

// TODO: Replace with your real auth getter (Clerk/etc)
function requireOwnerUserId(req: Request): string {
    // V1: accept header for local testing; wire Clerk in your stack as you do elsewhere.
    const owner = req.headers.get("x-owner-user-id");
    if (!owner) throw new Error("Missing x-owner-user-id (temporary dev auth)");
    return owner;
}

const QuerySchema = z.object({
    location: z.enum(["fridge", "pantry"]),
});

export const runtime = "nodejs"; // needs Buffer; keep server-side

export async function POST(req: Request) {
    try {
        const owner_user_id = requireOwnerUserId(req);

        const url = new URL(req.url);
        const location = QuerySchema.parse({
            location: url.searchParams.get("location") || "fridge",
        }).location;

        const form = await req.formData();
        const files = form.getAll("images");

        if (!files.length) {
            return NextResponse.json(
                { ok: false, error: "No images provided. Use multipart/form-data with images[]=..." },
                { status: 400 }
            );
        }

        const base64s: string[] = [];

        for (const f of files) {
            if (!(f instanceof File)) continue;

            // Limit: keep sane
            if (f.size > 6 * 1024 * 1024) {
                return NextResponse.json(
                    { ok: false, error: `Image too large (${f.size}). Max 6MB per image.` },
                    { status: 413 }
                );
            }

            const buf = Buffer.from(await f.arrayBuffer());
            base64s.push(buf.toString("base64"));
        }

        const vision = await detectIngredientsFromImages({
            location,
            imagesBase64: base64s,
        });

        const write = await writeInventoryScan({
            owner_user_id,
            location,
            source: "photo",
            detected: vision.items,
        });

        return NextResponse.json({
            ok: true,
            location,
            detected_count: vision.items.length,
            ...write,
            detected_preview: vision.items.slice(0, 25),
        });
    } catch (err: any) {
        console.error("Scan error:", err);
        return NextResponse.json(
            { ok: false, error: err?.message || "Unknown error" },
            { status: 500 }
        );
    }
}
