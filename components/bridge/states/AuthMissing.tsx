import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { NowCard, PrimaryFocusTitle, StatusText, ActionButton } from '../atoms';
import { NowResult } from '@/lib/now-engine/types';

interface AuthMissingProps {
    result: Extract<NowResult, { status: "auth_missing" }>;
}

export default function AuthMissing({ result }: AuthMissingProps) {
    const handleSetDevUser = () => {
        // Only in dev/preview
        const envUserId = process.env.NEXT_PUBLIC_DEV_PULSE_OWNER_USER_ID;
        if (envUserId) {
            localStorage.setItem('pulse_owner_user_id', envUserId);
            window.location.reload();
        } else {
            alert("No NEXT_PUBLIC_DEV_PULSE_OWNER_USER_ID found in env.");
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
                    localStorage.pulse_owner_user_id is undefined
                </p>
            </div>
        </NowCard>
    );
}
