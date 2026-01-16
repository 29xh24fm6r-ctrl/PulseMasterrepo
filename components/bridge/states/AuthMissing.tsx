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
        // Directive 3: Server-side bootstrap (Manual Trigger)
        try {
            const userId = await bootstrapFromServer();
            localStorage.setItem(LS_KEY, userId);
            window.location.reload();
        } catch (e) {
            console.error("Bootstrap failed", e);
            alert("Failed to fix auth. Check console.");
        }
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

                <div className="pt-6">
                    <ActionButton
                        label="Set Dev User & Reload"
                        onClick={handleSetDevUser}
                        primary
                    />
                </div>

                <p className="text-xs text-slate-600 font-mono mt-4">
                    Server-Verified Dev Auth Required
                </p>
            </div>
        </NowCard>
    );
}
