import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getHabits, createHabit } from "@/lib/data/habits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const habits = await getHabits(userId);
    return NextResponse.json({ ok: true, habits });
}

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Habit name required" }, { status: 400 });

    const habit = await createHabit(userId, body.name);
    return NextResponse.json({ ok: true, habit });
}
