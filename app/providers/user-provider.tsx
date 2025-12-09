"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      // Sync user to Supabase
      fetch("/api/user/sync", { method: "POST" }).catch(console.error);
    }
  }, [isSignedIn, user]);

  return <>{children}</>;
}