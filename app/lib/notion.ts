/**
 * Notion Utilities - Main Entry Point
 * =====================================
 * 
 * This file re-exports all Notion utilities for easy importing.
 * 
 * Usage:
 *   import { notion, readTitle, readSelect, normalizeDatabaseId } from "@/app/lib/notion";
 */

import { Client } from "@notionhq/client";

// Re-export all property readers
export * from "./notion/properties";

// =============================================================================
// Shared Notion Client
// =============================================================================

const NOTION_API_KEY = process.env.NOTION_API_KEY;

if (!NOTION_API_KEY) {
  console.warn("[Notion] NOTION_API_KEY is not set. Notion features will not work.");
}

/**
 * Shared Notion client instance.
 * Use this instead of creating new Client instances in each route.
 * 
 * @example
 * import { notion } from "@/app/lib/notion";
 * const response = await notion.databases.query({ database_id: "..." });
 */
export const notion = new Client({ 
  auth: NOTION_API_KEY || "missing-api-key" 
});

// =============================================================================
// Database ID Environment Variables
// =============================================================================

/**
 * All Notion database IDs from environment, normalized.
 * Returns null if not set (allows graceful degradation).
 */
export const NotionDatabases = {
  tasks: process.env.NOTION_DATABASE_TASKS 
    ? process.env.NOTION_DATABASE_TASKS.replace(/-/g, "") 
    : null,
  habits: process.env.NOTION_DATABASE_HABITS 
    ? process.env.NOTION_DATABASE_HABITS.replace(/-/g, "") 
    : null,
  deals: process.env.NOTION_DATABASE_DEALS 
    ? process.env.NOTION_DATABASE_DEALS.replace(/-/g, "") 
    : null,
  followUps: process.env.NOTION_DATABASE_FOLLOW_UPS 
    ? process.env.NOTION_DATABASE_FOLLOW_UPS.replace(/-/g, "") 
    : null,
  contacts: process.env.NOTION_DATABASE_CONTACTS 
    ? process.env.NOTION_DATABASE_CONTACTS.replace(/-/g, "") 
    : null,
  secondBrain: process.env.NOTION_DATABASE_SECOND_BRAIN 
    ? process.env.NOTION_DATABASE_SECOND_BRAIN.replace(/-/g, "") 
    : null,
  xp: process.env.NOTION_DATABASE_XP 
    ? process.env.NOTION_DATABASE_XP.replace(/-/g, "") 
    : null,
  identity: process.env.NOTION_DATABASE_IDENTITY 
    ? process.env.NOTION_DATABASE_IDENTITY.replace(/-/g, "") 
    : null,
  journal: process.env.NOTION_DATABASE_JOURNAL 
    ? process.env.NOTION_DATABASE_JOURNAL.replace(/-/g, "") 
    : null,
} as const;

/**
 * Check if a database is configured.
 * @param db - Key from NotionDatabases
 * @returns true if the database ID is set
 */
export function isDatabaseConfigured(db: keyof typeof NotionDatabases): boolean {
  return NotionDatabases[db] !== null;
}