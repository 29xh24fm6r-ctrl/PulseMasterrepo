import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const SECOND_BRAIN_DB = process.env.NOTION_DATABASE_SECOND_BRAIN;

function readTitle(props: any, ...keys: string[]): string {
  for (const key of keys) {
    if (props[key]?.title?.[0]?.plain_text) {
      return props[key].title[0].plain_text;
    }
  }
  return "";
}

function readRichText(props: any, ...keys: string[]): string {
  for (const key of keys) {
    if (props[key]?.rich_text?.[0]?.plain_text) {
      return props[key].rich_text[0].plain_text;
    }
  }
  return "";
}

function readSelect(props: any, key: string): string {
  return props[key]?.select?.name || "";
}

function readStatus(props: any, key: string): string {
  return props[key]?.status?.name || "";
}

function readEmail(props: any, key: string): string {
  return props[key]?.email || "";
}

function readPhone(props: any, key: string): string {
  return props[key]?.phone_number || "";
}

function readUrl(props: any, key: string): string {
  return props[key]?.url || "";
}

function readDate(props: any, key: string): string {
  return props[key]?.date?.start || "";
}

function readMultiSelect(props: any, key: string): string[] {
  return props[key]?.multi_select?.map((s: any) => s.name) || [];
}

export async function GET() {
  try {
    if (!SECOND_BRAIN_DB) {
      return NextResponse.json({ ok: true, contacts: [] });
    }

    const response = await notion.databases.query({
      database_id: SECOND_BRAIN_DB.replace(/-/g, ""),
      sorts: [{ property: "Name", direction: "ascending" }],
    });

    const contacts = response.results.map((page: any) => {
      const props = page.properties || {};
      
      return {
        id: page.id,
        notionUrl: page.url,
        
        // Core
        name: readTitle(props, "Name"),
        email: readEmail(props, "Email") || readRichText(props, "Email"),
        phone: readPhone(props, "Phone") || readRichText(props, "Phone"),
        
        // Professional
        company: readRichText(props, "Company"),
        title: readRichText(props, "Title", "Role"),
        industry: readSelect(props, "Industry"),
        linkedIn: readUrl(props, "LinkedIn") || readRichText(props, "LinkedIn"),
        website: readUrl(props, "Website") || readRichText(props, "Website"),
        
        // Personal
        birthday: readDate(props, "Birthday"),
        address: readRichText(props, "Address"),
        city: readRichText(props, "City"),
        state: readRichText(props, "State"),
        zip: readRichText(props, "Zip"),
        interests: readRichText(props, "Interests"),
        
        // Relationship
        relationship: readSelect(props, "Relationship") || readRichText(props, "Relationship"),
        status: readStatus(props, "Status") || readSelect(props, "Status"),
        howWeMet: readRichText(props, "How We Met"),
        introducedBy: readRichText(props, "Introduced By"),
        
        // Tracking
        lastContact: readDate(props, "Last Contact"),
        tags: readMultiSelect(props, "Tags"),
        notes: readRichText(props, "Notes"),
      };
    });

    return NextResponse.json({ ok: true, contacts });
  } catch (err: any) {
    console.error("Second Brain pull error:", err);
    return NextResponse.json({ ok: false, error: err.message, contacts: [] }, { status: 500 });
  }
}
