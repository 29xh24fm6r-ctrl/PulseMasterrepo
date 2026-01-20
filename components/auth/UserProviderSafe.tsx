"use client";

import React from "react";
import { WithAuthEnabled } from "@/components/auth/WithAuthEnabled";
import { UserProvider } from "@/app/providers/user-provider";

export function UserProviderSafe({ children }: { children: React.ReactNode }) {
    return (
        <WithAuthEnabled
            enabled={<UserProvider>{children}</UserProvider>}
            disabled={<>{children}</>}
        />
    );
}
