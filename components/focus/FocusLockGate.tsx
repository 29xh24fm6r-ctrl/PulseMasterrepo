"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useFocusLock } from "@/lib/focus/useFocusLock";

const ALLOWLIST = new Set<string>(["/focus", "/time", "/home"]);

export function FocusLockGate() {
  const pathname = usePathname();
  const { lock, loading } = useFocusLock(10000);

  useEffect(() => {
    if (loading) return;
    if (!lock) return;

    // Allow /api is not a pathname here; this is only client routes.
    if (!ALLOWLIST.has(pathname)) {
      window.location.href = "/focus";
    }
  }, [lock, loading, pathname]);

  return null;
}

