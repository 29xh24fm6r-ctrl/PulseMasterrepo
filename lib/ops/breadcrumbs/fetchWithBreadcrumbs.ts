// src/lib/ops/breadcrumbs/fetchWithBreadcrumbs.ts
import "server-only";
import { addBreadcrumb } from "@/lib/ops/breadcrumbs/store";

type FetchOpts = RequestInit & { timeoutMs?: number };

function safeUrl(u: string) {
  // Avoid logging tokens in query strings
  try {
    const url = new URL(u);
    url.search = ""; // strip query
    return url.toString();
  } catch {
    return u.split("?")[0];
  }
}

export async function fetchWithBreadcrumbs(url: string, opts: FetchOpts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  const started = Date.now();

  // Note: do not record headers (they can contain secrets)
  addBreadcrumb({
    type: "http",
    name: `fetch ${method} ${safeUrl(url)}`,
    data: {
      url: safeUrl(url),
      method,
    },
  });

  const timeoutMs = typeof opts.timeoutMs === "number" ? opts.timeoutMs : 15_000;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    const ms = Date.now() - started;

    addBreadcrumb({
      type: "http",
      name: `fetch_done ${method} ${safeUrl(url)}`,
      data: {
        url: safeUrl(url),
        method,
        status: res.status,
        ok: res.ok,
        ms,
      },
    });

    return res;
  } catch (e: any) {
    const ms = Date.now() - started;
    addBreadcrumb({
      type: "http",
      name: `fetch_error ${method} ${safeUrl(url)}`,
      data: {
        url: safeUrl(url),
        method,
        ms,
        error: e?.name || "Error",
        message: String(e?.message || e),
      },
    });
    throw e;
  } finally {
    clearTimeout(t);
  }
}

