// Onboarding Guard - Redirects to onboarding if not completed
// app/components/onboarding/OnboardingGuard.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoadingState } from "@/components/ui/LoadingState";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    checkOnboardingState();
  }, [pathname]);

  async function checkOnboardingState() {
    // Skip check if already on onboarding pages
    if (pathname?.startsWith("/onboarding")) {
      setChecking(false);
      return;
    }

    try {
      const res = await fetch("/api/onboarding/state");
      if (res.ok) {
        const data = await res.json();
        if (!data.hasCompletedCore) {
          setShouldRedirect(true);
          router.push("/onboarding/welcome");
        }
      }
    } catch (err) {
      console.error("Failed to check onboarding state:", err);
    } finally {
      setChecking(false);
    }
  }

  if (checking || shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Loading..." />
      </div>
    );
  }

  return <>{children}</>;
}




