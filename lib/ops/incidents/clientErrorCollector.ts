// src/lib/ops/incidents/clientErrorCollector.ts
"use client";

let installed = false;

async function postError(payload: any) {
  try {
    await fetch("/api/ops/incidents/app-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // swallow
  }
}

export function installClientErrorCollector(opts?: { route?: string | null; getBreadcrumbs?: () => any[] }) {
  if (installed) return;
  installed = true;

  const crumbs = () => {
    try {
      return opts?.getBreadcrumbs ? opts.getBreadcrumbs() : [];
    } catch {
      return [];
    }
  };

  window.addEventListener("error", (ev) => {
    const err = (ev as any)?.error;
    postError({
      runtime: "client",
      route: opts?.route || null,
      href: window.location?.href || null,
      name: err?.name || null,
      message: err?.message || ev.message || "window.error",
      stack: err?.stack || null,
      meta: {
        filename: (ev as any)?.filename || null,
        lineno: (ev as any)?.lineno || null,
        colno: (ev as any)?.colno || null,
        breadcrumbs: crumbs(),
      },
    });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    const r: any = (ev as any)?.reason;
    postError({
      runtime: "client",
      route: opts?.route || null,
      href: window.location?.href || null,
      name: r?.name || null,
      message: r?.message || String(r || "unhandledrejection"),
      stack: r?.stack || null,
      meta: { type: "unhandledrejection", breadcrumbs: crumbs() },
    });
  });
}
