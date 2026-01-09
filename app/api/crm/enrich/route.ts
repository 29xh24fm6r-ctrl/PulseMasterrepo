
import { NextResponse } from "next/server";
import { enrichContactProfile } from "@/lib/intelligence/profile-scanner";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, company, location } = body;

        if (!name || !company) {
            return NextResponse.json(
                { ok: false, error: "Name and Company are required." },
                { status: 400 }
            );
        }

        const result = await enrichContactProfile(name, company, location);

        return NextResponse.json({
            ok: result.success,
            data: result.profile,
            logs: result.logs
        });

    } catch (err: any) {
        return NextResponse.json(
            { ok: false, error: err.message },
            { status: 500 }
        );
    }
}
