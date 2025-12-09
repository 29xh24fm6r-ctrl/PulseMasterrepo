// GET /api/comm/contact-lookup?phone=+14045551234
import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const SECOND_BRAIN_DB = process.env.NOTION_DATABASE_SECOND_BRAIN;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: "phone required" }, { status: 400 });
    }

    if (!SECOND_BRAIN_DB) {
      return NextResponse.json({ found: false, contact: null });
    }

    const cleaned = phone.replace(/\D/g, "");
    const variants = [
      cleaned,
      cleaned.length === 10 ? `1${cleaned}` : cleaned,
      cleaned.length === 11 && cleaned.startsWith("1") ? cleaned.slice(1) : cleaned,
    ];

    console.log(`🔍 Looking up: ${phone}`);

    const response = await notion.databases.query({
      database_id: SECOND_BRAIN_DB,
      page_size: 100,
    });

    for (const page of response.results) {
      if (!("properties" in page)) continue;
      const props = page.properties as any;
      
      let contactPhone = "";
      for (const propName of ["Phone", "phone", "Phone Number", "Mobile", "Cell"]) {
        if (props[propName]?.phone_number) {
          contactPhone = props[propName].phone_number;
          break;
        } else if (props[propName]?.rich_text?.[0]?.plain_text) {
          contactPhone = props[propName].rich_text[0].plain_text;
          break;
        }
      }

      if (!contactPhone) continue;

      const cleanedContact = contactPhone.replace(/\D/g, "");
      if (variants.some(v => cleanedContact.includes(v) || v.includes(cleanedContact))) {
        let name = "";
        for (const propName of ["Name", "name", "Full Name"]) {
          if (props[propName]?.title?.[0]?.plain_text) {
            name = props[propName].title[0].plain_text;
            break;
          }
        }

        let company = "";
        for (const propName of ["Company", "company", "Organization"]) {
          if (props[propName]?.rich_text?.[0]?.plain_text) {
            company = props[propName].rich_text[0].plain_text;
            break;
          } else if (props[propName]?.select?.name) {
            company = props[propName].select.name;
            break;
          }
        }

        console.log(`✅ Found: ${name}`);
        return NextResponse.json({
          found: true,
          contact: { id: page.id, name, company, phone: contactPhone, notionUrl: (page as any).url },
        });
      }
    }

    return NextResponse.json({ found: false, contact: null });

  } catch (error: any) {
    console.error("Lookup error:", error);
    return NextResponse.json({ found: false, contact: null });
  }
}
