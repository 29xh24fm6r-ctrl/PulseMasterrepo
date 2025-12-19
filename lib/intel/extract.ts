/**
 * HTML Text Extraction Utilities
 * Best-effort extraction with timeouts and bounds
 */

import "server-only";

const MAX_EXTRACTED_CHARS = 20000; // 20k chars max
const EXTRACT_TIMEOUT_MS = 10000; // 10 second timeout
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB max response

export interface ExtractedContent {
  title?: string;
  text?: string;
  author?: string;
  publishedAt?: string;
}

/**
 * Extract readable text from a URL
 * Fail-soft: returns snippet if extraction fails
 */
export async function extractReadableText(
  url: string,
  snippet?: string
): Promise<ExtractedContent> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PulseOS/1.0; +https://pulseos.ai/bot)",
          "Accept": "text/html,application/xhtml+xml",
        },
        // @ts-ignore - Next.js fetch cache
        next: { revalidate: 3600 }, // Cache for 1 hour
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Check content size
      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
        throw new Error("Response too large");
      }

      const html = await response.text();

      if (html.length > MAX_RESPONSE_SIZE) {
        throw new Error("Response too large");
      }

      return extractFromHTML(html, url);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error("Extraction timeout");
      }
      throw err;
    }
  } catch (err) {
    console.warn(`[Extract] Failed to extract from ${url}:`, err);
    // Return snippet as fallback
    return {
      text: snippet ? truncateText(snippet, MAX_EXTRACTED_CHARS) : undefined,
    };
  }
}

/**
 * Extract readable content from HTML
 * Strips scripts, styles, and navigation elements
 */
function extractFromHTML(html: string, url: string): ExtractedContent {
  // Simple text extraction - remove scripts, styles, and common navigation
  let text = html
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove style tags and content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    // Remove comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Remove common navigation/header/footer patterns
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
    // Convert common block elements to newlines
    .replace(/<\/?(p|div|h[1-6]|li|br|article|section)[^>]*>/gi, "\n")
    // Remove remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();

  // Extract title (try multiple methods)
  const titleMatch =
    html.match(/<title[^>]*>([^<]+)<\/title>/i) ||
    html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<h1[^>]*>([^<]+)<\/h1>/i);

  const title = titleMatch ? titleMatch[1].trim() : undefined;

  // Extract author (try meta tags)
  const authorMatch =
    html.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+property=["']article:author["']\s+content=["']([^"']+)["']/i);

  const author = authorMatch ? authorMatch[1].trim() : undefined;

  // Extract published date (try meta tags)
  const publishedMatch =
    html.match(/<meta\s+property=["']article:published_time["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+name=["']publish-date["']\s+content=["']([^"']+)["']/i);

  const publishedAt = publishedMatch ? publishedMatch[1] : undefined;

  // Truncate text to max length
  text = truncateText(text, MAX_EXTRACTED_CHARS);

  return {
    title,
    text: text || undefined,
    author,
    publishedAt,
  };
}

/**
 * Truncate text to max characters, preserving word boundaries
 */
function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  // Truncate at word boundary
  const truncated = text.substring(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxChars * 0.9) {
    // Use word boundary if it's close
    return truncated.substring(0, lastSpace) + "...";
  }

  return truncated + "...";
}

