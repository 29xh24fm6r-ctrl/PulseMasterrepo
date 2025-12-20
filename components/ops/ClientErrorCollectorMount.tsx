// src/components/ops/ClientErrorCollectorMount.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { installClientErrorCollector } from "@/lib/ops/incidents/clientErrorCollector";
import { installClientFetchBreadcrumbs, getClientBreadcrumbs } from "@/lib/ops/incidents/clientBreadcrumbs";

export default function ClientErrorCollectorMount() {
  const pathname = usePathname();

  useEffect(() => {
    installClientFetchBreadcrumbs();

    // Patch collector to attach client breadcrumbs on report
    installClientErrorCollector({
      route: pathname || null,
      getBreadcrumbs: () => getClientBreadcrumbs(),
    } as any);
  }, [pathname]);

  return null;
}
