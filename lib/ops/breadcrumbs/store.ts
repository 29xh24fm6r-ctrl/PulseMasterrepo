// src/lib/ops/breadcrumbs/store.ts
import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

export type BreadcrumbType = "http" | "db" | "auth" | "tenant" | "job" | "info";

export type Breadcrumb = {
  ts: string; // ISO timestamp
  type: BreadcrumbType;
  name: string; // short label
  data?: Record<string, any>; // safe JSON
};

type BreadcrumbContext = {
  requestId: string;
  route?: string | null;
  href?: string | null;
  userId?: string | null;
  breadcrumbs: Breadcrumb[];
  max: number;
};

const als = new AsyncLocalStorage<BreadcrumbContext>();

export function withBreadcrumbs<T>(
  ctx: { requestId: string; route?: string | null; href?: string | null; userId?: string | null; max?: number },
  fn: () => Promise<T> | T
): Promise<T> | T {
  const store: BreadcrumbContext = {
    requestId: ctx.requestId,
    route: ctx.route ?? null,
    href: ctx.href ?? null,
    userId: ctx.userId ?? null,
    breadcrumbs: [],
    max: ctx.max ?? 30,
  };
  return als.run(store, fn as any) as any;
}

export function addBreadcrumb(b: Omit<Breadcrumb, "ts">) {
  const store = als.getStore();
  if (!store) return;

  const bc: Breadcrumb = { ts: new Date().toISOString(), ...b };
  store.breadcrumbs.push(bc);

  // ring buffer
  if (store.breadcrumbs.length > store.max) {
    store.breadcrumbs.splice(0, store.breadcrumbs.length - store.max);
  }
}

export function getBreadcrumbContext() {
  return als.getStore() ?? null;
}

export function getBreadcrumbs(): Breadcrumb[] {
  return als.getStore()?.breadcrumbs ?? [];
}

