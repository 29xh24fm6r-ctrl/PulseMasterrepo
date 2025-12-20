import "server-only";
import { notionDisabled } from "@/lib/notion-disabled";

// Export shapes that existing code expects, but route to a hard failure.
// Keep this minimal; expand only if build complains about missing exports.

export function getNotionClient(): never {
  return notionDisabled();
}

export const notion = new Proxy(
  {},
  {
    get() {
      return notionDisabled();
    },
  }
) as any;

