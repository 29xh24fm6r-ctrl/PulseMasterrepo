"use client";

import { usePathname } from "next/navigation";
import { GlobalNavEnhanced } from "@/components/GlobalNavEnhanced";

/**
 * RootNavGate - Conditionally renders GlobalNavEnhanced
 * 
 * Hides GlobalNavEnhanced on Pulse shell routes (which have their own sidebar + topbar).
 * Prevents navigation duplication and visual conflicts.
 */
const HIDE_ON_PREFIXES = [
  "/home",
  "/workspace",
  "/people",
  "/time",
  "/brain",
  "/decisions",
  "/loops",
  "/coaches",
  "/crm",
  "/productivity",
];

export function RootNavGate() {
  const pathname = usePathname() || "";

  // Hide GlobalNavEnhanced on all Pulse shell routes
  // The Pulse shell (app/(pulse)/layout.tsx) provides its own navigation
  const shouldHide = HIDE_ON_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (shouldHide) return null;

  return <GlobalNavEnhanced />;
}

