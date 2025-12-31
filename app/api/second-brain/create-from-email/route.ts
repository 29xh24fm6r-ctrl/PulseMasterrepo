import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createContact, getContactByEmail, type Contact } from "@/lib/data/journal";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name, email, phone,
      company, role, industry, linkedIn, website,
      birthday, address, city, state, zip,
      relationship, relationshipStrength, howWeMet, introducedBy,
      interests, notes, tags,
    } = body;

    if (!name) {
      return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
    }

    // Check for duplicates by email if provided
    if (email) {
      const existing = await getContactByEmail(userId, email);
      if (existing) {
        return NextResponse.json({
          ok: false,
          error: `Contact with email "${email}" already exists`,
          existingId: existing.id,
          duplicate: true,
        }, { status: 409 });
      }
    }

    console.log(`📇 Creating contact: ${name}`);

    // Map fields
    const contextMap: Record<string, any> = {};
    if (website) contextMap.website = website;
    if (birthday) contextMap.birthday = birthday;
    if (address) contextMap.address = address;
    if (city) contextMap.city = city;
    if (state) contextMap.state = state;
    if (zip) contextMap.zip = zip;
    if (relationshipStrength) contextMap.relationshipStrength = relationshipStrength;
    if (howWeMet) contextMap.howWeMet = howWeMet;
    if (introducedBy) contextMap.introducedBy = introducedBy;
    if (interests) contextMap.interests = interests;
    if (tags) contextMap.tags = tags;

    const contactInput: Omit<Contact, "id" | "user_id"> = {
      name,
      email: email || undefined,
      phone: phone || undefined,
      company: company || undefined,
      title: role || undefined, // mapping role to title
      industry: industry || undefined,
      linkedin_url: linkedIn || undefined,
      relationship: relationship || "New Contact",
      notes: notes || undefined,
      context: contextMap,
    };

    const newContact = await createContact(userId, contactInput);

    console.log(`✅ Contact created: ${newContact.id}`);

    return NextResponse.json({
      ok: true,
      contactId: newContact.id,
      message: "Contact created successfully",
    });

  } catch (err: any) {
    console.error("❌ Error creating contact:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to create contact" },
      { status: 500 }
    );
  }
}
