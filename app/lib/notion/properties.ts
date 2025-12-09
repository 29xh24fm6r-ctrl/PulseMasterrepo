/**
 * Safe Notion Property Readers
 * =============================
 * These utilities wrap Notion property access to prevent crashes when:
 * - A property is missing
 * - A property has a different type than expected (e.g., select vs status)
 * - A property was renamed
 * 
 * Usage:
 *   import { readTitle, readSelect, readNumber } from "@/app/lib/notion/properties";
 *   
 *   const props = page.properties;
 *   const name = readTitle(props, "Name", "Title", "Deal Name");
 *   const status = readSelect(props, "Status");
 *   const amount = readNumber(props, "Amount", "Value");
 */

// =============================================================================
// Types
// =============================================================================

// Notion property types (simplified for our use case)
export type NotionProperties = Record<string, any>;

export type NotionPage = {
  id: string;
  properties: NotionProperties;
  created_time?: string;
  last_edited_time?: string;
  url?: string;
};

// =============================================================================
// Warning Logger
// =============================================================================

const ENABLE_WARNINGS = process.env.NODE_ENV === "development";
const warnedProperties = new Set<string>();

/**
 * Log a warning when a property is missing or has unexpected type.
 * Only logs once per unique property to avoid spam.
 */
export function warnMissingProperty(
  context: string,
  propertyName: string,
  expected: string,
  actual: string | null
): void {
  if (!ENABLE_WARNINGS) return;
  
  const key = `${context}:${propertyName}`;
  if (warnedProperties.has(key)) return;
  
  warnedProperties.add(key);
  console.warn(
    `[Notion] ${context}: Property "${propertyName}" expected ${expected}, got ${actual || "undefined"}`
  );
}

/**
 * Get the actual type of a Notion property for debugging.
 */
function getPropertyType(prop: any): string | null {
  if (!prop) return null;
  if (prop.title) return "title";
  if (prop.rich_text) return "rich_text";
  if (prop.select) return "select";
  if (prop.status) return "status";
  if (prop.multi_select) return "multi_select";
  if (prop.number !== undefined) return "number";
  if (prop.checkbox !== undefined) return "checkbox";
  if (prop.date) return "date";
  if (prop.email) return "email";
  if (prop.url) return "url";
  if (prop.phone_number) return "phone_number";
  if (prop.relation) return "relation";
  if (prop.formula) return "formula";
  if (prop.rollup) return "rollup";
  if (prop.people) return "people";
  if (prop.files) return "files";
  if (prop.created_time) return "created_time";
  if (prop.last_edited_time) return "last_edited_time";
  if (prop.created_by) return "created_by";
  if (prop.last_edited_by) return "last_edited_by";
  return "unknown";
}

// =============================================================================
// Safe Readers
// =============================================================================

/**
 * Read a title property. Tries multiple field names in order.
 * @param props - The page.properties object
 * @param fieldNames - Field names to try, in order of preference
 * @returns The title string, or "Untitled" if not found
 * 
 * @example
 * const name = readTitle(props, "Name", "Title", "Deal Name");
 */
export function readTitle(
  props: NotionProperties,
  ...fieldNames: string[]
): string {
  for (const field of fieldNames) {
    const prop = props[field];
    if (prop?.title?.[0]?.plain_text) {
      return prop.title[0].plain_text;
    }
    // Sometimes title is stored as rich_text (rare but happens)
    if (prop?.rich_text?.[0]?.plain_text) {
      return prop.rich_text[0].plain_text;
    }
  }
  return "Untitled";
}

/**
 * Read rich text property as a plain string.
 * @param props - The page.properties object
 * @param fieldName - The property name
 * @returns The text content, or null if not found
 * 
 * @example
 * const notes = readRichText(props, "Notes") || "";
 */
export function readRichText(
  props: NotionProperties,
  fieldName: string
): string | null {
  const prop = props[fieldName];
  if (!prop) return null;
  
  // Handle rich_text array
  if (prop.rich_text && Array.isArray(prop.rich_text)) {
    return prop.rich_text.map((rt: any) => rt.plain_text || "").join("") || null;
  }
  
  // Handle title (in case someone uses this for a title field)
  if (prop.title && Array.isArray(prop.title)) {
    return prop.title.map((t: any) => t.plain_text || "").join("") || null;
  }
  
  return null;
}

/**
 * Read a select, status, or multi_select property.
 * Automatically handles all three types.
 * 
 * @param props - The page.properties object
 * @param fieldNames - Field names to try, in order of preference
 * @returns The selected value name, or null if not found
 * 
 * @example
 * const status = readSelect(props, "Status") || "Pending";
 * const stage = readSelect(props, "Stage", "Status");
 */
export function readSelect(
  props: NotionProperties,
  ...fieldNames: string[]
): string | null {
  for (const field of fieldNames) {
    const prop = props[field];
    if (!prop) continue;
    
    // Try select
    if (prop.select?.name) {
      return prop.select.name;
    }
    
    // Try status (Notion's native status type)
    if (prop.status?.name) {
      return prop.status.name;
    }
    
    // Try multi_select (return first item)
    if (prop.multi_select?.[0]?.name) {
      return prop.multi_select[0].name;
    }
  }
  
  return null;
}

/**
 * Read all values from a multi_select property.
 * @param props - The page.properties object
 * @param fieldName - The property name
 * @returns Array of selected value names, or empty array if not found
 * 
 * @example
 * const tags = readMultiSelect(props, "Tags");
 */
export function readMultiSelect(
  props: NotionProperties,
  fieldName: string
): string[] {
  const prop = props[fieldName];
  if (!prop) return [];
  
  if (prop.multi_select && Array.isArray(prop.multi_select)) {
    return prop.multi_select.map((item: any) => item.name).filter(Boolean);
  }
  
  // Handle case where someone used select instead of multi_select
  if (prop.select?.name) {
    return [prop.select.name];
  }
  
  return [];
}

/**
 * Read a number property.
 * @param props - The page.properties object
 * @param fieldNames - Field names to try, in order of preference
 * @returns The number value, or null if not found
 * 
 * @example
 * const amount = readNumber(props, "Amount", "Value") ?? 0;
 * const xp = readNumber(props, "XP") ?? 0;
 */
export function readNumber(
  props: NotionProperties,
  ...fieldNames: string[]
): number | null {
  for (const field of fieldNames) {
    const prop = props[field];
    if (!prop) continue;
    
    // Direct number
    if (typeof prop.number === "number") {
      return prop.number;
    }
    
    // Formula that returns a number
    if (prop.formula?.type === "number" && typeof prop.formula.number === "number") {
      return prop.formula.number;
    }
    
    // Rollup that returns a number
    if (prop.rollup?.type === "number" && typeof prop.rollup.number === "number") {
      return prop.rollup.number;
    }
  }
  
  return null;
}

/**
 * Read a checkbox property.
 * @param props - The page.properties object
 * @param fieldName - The property name
 * @returns The boolean value, or false if not found
 * 
 * @example
 * const isActive = readCheckbox(props, "Active");
 */
export function readCheckbox(
  props: NotionProperties,
  fieldName: string
): boolean {
  const prop = props[fieldName];
  if (!prop) return false;
  
  if (typeof prop.checkbox === "boolean") {
    return prop.checkbox;
  }
  
  // Formula that returns boolean
  if (prop.formula?.type === "boolean") {
    return prop.formula.boolean ?? false;
  }
  
  return false;
}

/**
 * Read a date property.
 * @param props - The page.properties object
 * @param fieldNames - Field names to try, in order of preference
 * @returns Object with start and end dates, or null if not found
 * 
 * @example
 * const dueDate = readDate(props, "Due Date", "DueDate")?.start;
 */
export function readDate(
  props: NotionProperties,
  ...fieldNames: string[]
): { start: string; end: string | null } | null {
  for (const field of fieldNames) {
    const prop = props[field];
    if (!prop) continue;
    
    if (prop.date?.start) {
      return {
        start: prop.date.start,
        end: prop.date.end || null,
      };
    }
    
    // Formula that returns a date
    if (prop.formula?.type === "date" && prop.formula.date?.start) {
      return {
        start: prop.formula.date.start,
        end: prop.formula.date.end || null,
      };
    }
  }
  
  return null;
}

/**
 * Read just the start date as a string (most common use case).
 * @param props - The page.properties object
 * @param fieldNames - Field names to try, in order of preference
 * @returns The start date string (ISO format), or null if not found
 * 
 * @example
 * const dueDate = readDateStart(props, "Due Date") || null;
 */
export function readDateStart(
  props: NotionProperties,
  ...fieldNames: string[]
): string | null {
  return readDate(props, ...fieldNames)?.start ?? null;
}

/**
 * Read an email property.
 * @param props - The page.properties object
 * @param fieldName - The property name
 * @returns The email string, or null if not found
 * 
 * @example
 * const email = readEmail(props, "Email") || "";
 */
export function readEmail(
  props: NotionProperties,
  fieldName: string
): string | null {
  const prop = props[fieldName];
  if (!prop) return null;
  
  if (typeof prop.email === "string") {
    return prop.email;
  }
  
  return null;
}

/**
 * Read a URL property.
 * @param props - The page.properties object
 * @param fieldName - The property name
 * @returns The URL string, or null if not found
 * 
 * @example
 * const website = readUrl(props, "Website");
 */
export function readUrl(
  props: NotionProperties,
  fieldName: string
): string | null {
  const prop = props[fieldName];
  if (!prop) return null;
  
  if (typeof prop.url === "string") {
    return prop.url;
  }
  
  return null;
}

/**
 * Read a phone number property.
 * @param props - The page.properties object
 * @param fieldName - The property name
 * @returns The phone string, or null if not found
 */
export function readPhone(
  props: NotionProperties,
  fieldName: string
): string | null {
  const prop = props[fieldName];
  if (!prop) return null;
  
  if (typeof prop.phone_number === "string") {
    return prop.phone_number;
  }
  
  return null;
}

/**
 * Read a relation property (returns array of page IDs).
 * @param props - The page.properties object
 * @param fieldName - The property name
 * @returns Array of related page IDs, or empty array if not found
 * 
 * @example
 * const contactIds = readRelation(props, "Contacts");
 */
export function readRelation(
  props: NotionProperties,
  fieldName: string
): string[] {
  const prop = props[fieldName];
  if (!prop) return [];
  
  if (prop.relation && Array.isArray(prop.relation)) {
    return prop.relation.map((rel: any) => rel.id).filter(Boolean);
  }
  
  return [];
}

/**
 * Read a formula property (can return string, number, boolean, or date).
 * @param props - The page.properties object
 * @param fieldName - The property name
 * @returns The formula result, or null if not found
 * 
 * @example
 * const score = readFormula(props, "Score") as number;
 */
export function readFormula(
  props: NotionProperties,
  fieldName: string
): string | number | boolean | null {
  const prop = props[fieldName];
  if (!prop?.formula) return null;
  
  const formula = prop.formula;
  
  switch (formula.type) {
    case "string":
      return formula.string;
    case "number":
      return formula.number;
    case "boolean":
      return formula.boolean;
    case "date":
      return formula.date?.start || null;
    default:
      return null;
  }
}

/**
 * Read people property (returns array of user objects with id and name).
 * @param props - The page.properties object
 * @param fieldName - The property name
 * @returns Array of user objects, or empty array if not found
 */
export function readPeople(
  props: NotionProperties,
  fieldName: string
): Array<{ id: string; name: string | null; email: string | null }> {
  const prop = props[fieldName];
  if (!prop?.people) return [];
  
  return prop.people.map((person: any) => ({
    id: person.id,
    name: person.name || null,
    email: person.person?.email || null,
  }));
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Normalize a Notion database ID by removing dashes.
 * (Centralized here to avoid duplication across routes)
 */
export function normalizeDatabaseId(raw: string): string {
  return raw.replace(/-/g, "");
}

/**
 * Extract common page metadata from a Notion page object.
 * @param page - The Notion page object from API response
 */
export function extractPageMeta(page: any): {
  id: string;
  createdAt: string;
  lastEditedAt: string;
  url: string;
} {
  return {
    id: page.id,
    createdAt: page.created_time,
    lastEditedAt: page.last_edited_time,
    url: page.url,
  };
}
