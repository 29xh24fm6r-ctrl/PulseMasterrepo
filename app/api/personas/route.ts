/**
 * Personas API
 * GET /api/personas - List personas & templates
 * POST /api/personas - Create/update persona
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getPersonas,
  getActivePersona,
  createPersona,
  createPersonaFromTemplate,
  updatePersona,
  setActivePersona,
  deletePersona,
  initializeDefaultPersonas,
  PERSONA_TEMPLATES,
} from "@/lib/personas/engine";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mode = req.nextUrl.searchParams.get("mode");

    if (mode === "templates") {
      return NextResponse.json({ templates: PERSONA_TEMPLATES });
    }

    if (mode === "active") {
      await initializeDefaultPersonas(userId);
      const persona = await getActivePersona(userId);
      return NextResponse.json({ persona });
    }

    await initializeDefaultPersonas(userId);
    const personas = await getPersonas(userId);
    return NextResponse.json({ personas });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "activate") {
      const success = await setActivePersona(userId, body.personaId);
      return NextResponse.json({ success });
    }

    if (action === "delete") {
      const success = await deletePersona(userId, body.personaId);
      return NextResponse.json({ success });
    }

    if (action === "update") {
      const persona = await updatePersona(userId, body.personaId, body.updates);
      return NextResponse.json({ persona });
    }

    // Create
    let persona;
    if (body.templateId) {
      persona = await createPersonaFromTemplate(userId, body.templateId, body);
    } else {
      persona = await createPersona(userId, body);
    }

    return NextResponse.json({ persona });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}