import "server-only";
import { notionDisabled } from "@/lib/notion-disabled";

// Add exported names here only if the build complains.
// Default: everything errors if called.
export function notionPropertiesDisabled(): never {
  return notionDisabled();
}

