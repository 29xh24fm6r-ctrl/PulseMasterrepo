import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const SECOND_BRAIN_DB = process.env.NOTION_DATABASE_SECOND_BRAIN;

export async function POST(req: NextRequest) {
  try {
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
    
    if (!SECOND_BRAIN_DB) {
      return NextResponse.json({ ok: false, error: "Second Brain database not configured" }, { status: 500 });
    }
    
    const dbId = SECOND_BRAIN_DB.replace(/-/g, "");
    
    // Check for duplicates by name or email
    console.log(`🔍 Checking for duplicates: ${name} / ${email}`);
    
    const existingByName = await notion.databases.query({
      database_id: dbId,
      filter: {
        property: "Name",
        title: { equals: name },
      },
    });
    
    if (existingByName.results.length > 0) {
      return NextResponse.json({
        ok: false,
        error: `Contact "${name}" already exists`,
        existingId: existingByName.results[0].id,
        duplicate: true,
      }, { status: 409 });
    }
    
    // Also check by email if provided
    if (email) {
      try {
        const existingByEmail = await notion.databases.query({
          database_id: dbId,
          filter: {
            property: "Email",
            email: { equals: email.toLowerCase() },
          },
        });
        
        if (existingByEmail.results.length > 0) {
          const existingName = (existingByEmail.results[0] as any).properties?.Name?.title?.[0]?.plain_text || "Unknown";
          return NextResponse.json({
            ok: false,
            error: `Email "${email}" already exists for contact "${existingName}"`,
            existingId: existingByEmail.results[0].id,
            duplicate: true,
          }, { status: 409 });
        }
      } catch {
        // Email property might not be email type, skip check
      }
    }
    
    console.log(`📇 Creating contact: ${name}`);
    
    const db = await notion.databases.retrieve({ database_id: dbId });
    const schema = (db as any).properties;
    
    const properties: any = {
      Name: { title: [{ text: { content: name } }] },
    };
    
    const addProperty = (propName: string, value: any) => {
      if (!value || !schema[propName]) return;
      
      const prop = schema[propName];
      const propType = prop.type;
      
      try {
        switch (propType) {
          case "email":
            properties[propName] = { email: value };
            break;
          case "phone_number":
            properties[propName] = { phone_number: value };
            break;
          case "url":
            properties[propName] = { url: value.startsWith("http") ? value : `https://${value}` };
            break;
          case "rich_text":
            properties[propName] = { rich_text: [{ text: { content: String(value) } }] };
            break;
          case "select":
            const selectOptions = prop.select?.options?.map((o: any) => o.name.toLowerCase()) || [];
            if (selectOptions.length === 0 || selectOptions.includes(value.toLowerCase())) {
              properties[propName] = { select: { name: value } };
            }
            break;
          case "status":
            const statusOptions = prop.status?.options?.map((o: any) => o.name.toLowerCase()) || [];
            if (statusOptions.includes(value.toLowerCase())) {
              properties[propName] = { status: { name: value } };
            }
            break;
          case "multi_select":
            if (Array.isArray(value)) {
              properties[propName] = { multi_select: value.map((v: string) => ({ name: v })) };
            }
            break;
          case "date":
            const dateStr = new Date(value).toISOString().split("T")[0];
            properties[propName] = { date: { start: dateStr } };
            break;
          case "number":
            properties[propName] = { number: Number(value) };
            break;
          case "checkbox":
            properties[propName] = { checkbox: Boolean(value) };
            break;
        }
      } catch (e) {
        console.log(`Skipping ${propName}: ${e}`);
      }
    };
    
    addProperty("Email", email?.toLowerCase());
    addProperty("Phone", phone);
    addProperty("Company", company);
    addProperty("Title", role);
    addProperty("Role", role);
    addProperty("Industry", industry);
    addProperty("LinkedIn", linkedIn);
    addProperty("Website", website);
    addProperty("Birthday", birthday);
    addProperty("Address", address);
    addProperty("City", city);
    addProperty("State", state);
    addProperty("Zip", zip);
    addProperty("Interests", interests);
    addProperty("Relationship", relationship);
    addProperty("Status", relationshipStrength);
    addProperty("How We Met", howWeMet);
    addProperty("Introduced By", introducedBy);
    addProperty("Notes", notes);
    addProperty("Last Contact", new Date().toISOString());
    addProperty("Tags", tags);
    
    const response = await notion.pages.create({
      parent: { database_id: dbId },
      properties,
    });
    
    await notion.blocks.children.append({
      block_id: response.id,
      children: [
        {
          object: "block",
          type: "heading_2",
          heading_2: { rich_text: [{ type: "text", text: { content: "📞 Interactions" } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Call logs and meeting notes will appear here." } }] },
        },
      ],
    });
    
    console.log(`✅ Contact created: ${response.id}`);
    
    return NextResponse.json({
      ok: true,
      contactId: response.id,
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
