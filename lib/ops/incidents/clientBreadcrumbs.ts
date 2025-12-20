// src/lib/ops/incidents/clientBreadcrumbs.ts
"use client";

type ClientCrumb = {
  ts: string;
  type: "http" | "info";
  name: string;
  data?: Record<string, any>;
};

let ring: ClientCrumb[] = [];
const MAX = 20;

function push(c: Omit<ClientCrumb, "ts">) {
  ring.push({ ts: new Date().toISOString(), ...c });
  if (ring.length > MAX) ring.splice(0, ring.length - MAX);
}

export function getClientBreadcrumbs() {
  return ring.slice();
}

export function installClientFetchBreadcrumbs() {
  const w = window as any;
  if (w.__clientFetchBreadcrumbsInstalled) return;
  w.__clientFetchBreadcrumbsInstalled = true;

  const orig = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : (input as any)?.url || String(input);
    const method = (init?.method || "GET").toUpperCase();
    const safe = url.split("?")[0];

    const start = performance.now();
    push({ type: "http", name: `fetch ${method} ${safe}`, data: { url: safe, method } });

    try {
      const res = await orig(input as any, init);
      push({
        type: "http",
        name: `fetch_done ${method} ${safe}`,
        data: { url: safe, method, status: res.status, ok: res.ok, ms: Math.round(performance.now() - start) },
      });
      return res;
    } catch (e: any) {
      push({
        type: "http",
        name: `fetch_error ${method} ${safe}`,
        data: { url: safe, method, ms: Math.round(performance.now() - start), message: String(e?.message || e) },
      });
      throw e;
    }
  };
}

