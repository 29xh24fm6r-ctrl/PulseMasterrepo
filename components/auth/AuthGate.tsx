"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AuthGate({
    authed,
    children,
}: {
    authed: boolean;
    children: React.ReactNode;
}) {
    const router = useRouter();

    useEffect(() => {
        if (!authed) {
            router.replace("/sign-in");
        }
    }, [authed, router]);

    if (!authed) {
        // Render nothing or a loader, BUT do not conditionally skip hooks
        // This is safe because this component has no other hooks that would be skipped.
        return null;
    }

    return <>{children}</>;
}
