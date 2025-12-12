// Roleplay Masks API
// app/api/personas/masks/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listRoleplayMasks, seedRoleplayMasks } from "@/lib/personas/masks";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure masks are seeded
    await seedRoleplayMasks();

    // List all masks
    const masks = await listRoleplayMasks();

    return NextResponse.json({ masks });
  } catch (err: any) {
    console.error("[PersonasMasks] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to list masks" },
      { status: 500 }
    );
  }
}




