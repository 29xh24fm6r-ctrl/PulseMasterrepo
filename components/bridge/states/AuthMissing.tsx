import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { NowCard, PrimaryFocusTitle, StatusText, ActionButton } from '../atoms';
import { NowResult } from '@/lib/now-engine/types';

import { bootstrapDevUserIdFromServer } from "@/lib/auth/bootstrapClient";

interface AuthMissingProps {
    result: Extract<NowResult, { status: "auth_missing" }>;
}

const LS_KEY = "pulse_owner_user_id";

// Cleaned up: implementation moved to lib/auth/bootstrapClient.ts
const bootstrapFromServer = bootstrapDevUserIdFromServer;

export default function AuthMissing({ result }: AuthMissingProps) {
    const handleSetDevUser = async () => {
        // CANON BOOTSTRAP: Direct fetch to /api/dev/bootstrap
        try {
            const res = await fetch("/api/dev/bootstrap", { method: "POST" });
            const json = await res.json();

            if (!res.ok || !json?.pulse_owner_user_id) {
                console.error("Dev bootstrap failed", res.status, json);
                alert(`Bootstrap failed: ${json?.error || res.status}`);
                return;
            }

            localStorage.setItem(LS_KEY, json.pulse_owner_user_id);
            window.location.reload();
        } catch (e) {
            console.error("Bootstrap network error", e);
            alert("Failed to reach bootstrap endpoint");
        }
    };

    const handleResetIdentity = () => {
        localStorage.removeItem(LS_KEY);
        window.location.reload();
    };

    return (
        <NowCard>
            <div className="flex flex-col items-center justify-center space-y-6 text-red-400 animate-in zoom-in-95 duration-500">
                <ShieldAlert className="w-16 h-16 opacity-80" />

                <div className="space-y-2 text-center">
                    <PrimaryFocusTitle>
                        <span className="text-red-300">Auth Missing</span>
                    </PrimaryFocusTitle>
                    <StatusText>{result.message}</StatusText>
                </div>

                <div className="pt-6 flex flex-col gap-3 w-full">
                    <ActionButton
                        label="Set Dev User & Reload"
                        onClick={handleSetDevUser}
                        primary
                    />

                    <button
                        onClick={handleResetIdentity}
                        className="text-xs text-red-400/60 hover:text-red-400 underline decoration-red-400/30 underline-offset-4 transition-colors p-2"
                    >
                        Reset Dev Identity (Failsafe)
                    </button>
                </div>

                <p className="text-xs text-slate-600 font-mono mt-4">
                    Server-Verified Dev Auth Required
                </p>
            </div>
        </NowCard>
    );
}
