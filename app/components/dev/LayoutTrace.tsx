"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function LayoutTrace({ name }: { name: string }) {
  const pathname = usePathname() || "";

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // eslint-disable-next-line no-console
    console.log(`[LayoutTrace] ${name} mounted on: ${pathname}`);
  }, [name, pathname]);

  return null;
}

