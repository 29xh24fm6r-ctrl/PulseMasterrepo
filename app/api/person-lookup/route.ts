import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export const dynamic = 'force-dynamic';

interface PersonResult {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  type?: string;
  relationshipStatus?: string;
  notes?: string;
  rawData?: string;
  winProbability?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    let queryBuilder = getSupabaseAdminRuntimeClient()
      .from("contacts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (query.length >= 1) {
      // Simple OR search on name or company
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,company.ilike.%${query}%`);
    }

    const { data: contacts, error } = await queryBuilder;

    if (error) throw error;

    const people: PersonResult[] = contacts.map((c: any) => ({
      id: c.id,
      name: c.name,
      company: c.company || '',
      email: c.email || '',
      phone: c.phone || '',
      type: 'Contact', // Standard type
      relationshipStatus: c.relationship || 'unknown',
      notes: c.notes || '',
      rawData: JSON.stringify(c.context || {}), // Flatten context for legacy frontend compat if needed
      winProbability: undefined
    }));

    return NextResponse.json({
      ok: true,
      people,
      count: people.length,
    });

  } catch (error: any) {
    console.error("Person lookup error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { personId } = await request.json();
    if (!personId) {
      return NextResponse.json({ ok: false, error: "personId required" }, { status: 400 });
    }

    const { data: contact, error } = await getSupabaseAdminRuntimeClient()
      .from("contacts")
      .select("*")
      .eq("id", personId)
      .eq("user_id", userId)
      .single();

    if (error || !contact) {
      return NextResponse.json({ ok: false, error: "Contact not found" }, { status: 404 });
    }

    const person: PersonResult = {
      id: contact.id,
      name: contact.name,
      company: contact.company || '',
      email: contact.email || '',
      phone: contact.phone || '',
      type: 'Contact',
      relationshipStatus: contact.relationship || 'unknown',
      notes: contact.notes || '',
      rawData: JSON.stringify(contact.context || {}),
      winProbability: undefined
    };

    return NextResponse.json({ ok: true, person });
  } catch (error: any) {
    console.error("Person detail error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
