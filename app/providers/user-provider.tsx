"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      // Sync user to Supabase (fire and forget, don't block UI)
      fetch("/api/user/sync", { method: "POST" })
        .catch((err) => {
          // Silently handle errors - this is a background sync operation
          if (process.env.NODE_ENV === "development") {
            console.debug("[UserProvider] Sync error (non-blocking):", err);
          }
        });
    }
  }, [isSignedIn, user]);

  return <>{children}</>;
}