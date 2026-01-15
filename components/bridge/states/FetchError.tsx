import React from 'react';
import { AlertCircle } from 'lucide-react';
import { NowCard, PrimaryFocusTitle, StatusText, TertiaryButton } from '../atoms';
import { NowResult } from '@/lib/now-engine/types';

interface FetchErrorProps {
    result: Extract<NowResult, { status: "fetch_error" }>;
}

export default function FetchError({ result }: FetchErrorProps) {
    const handleRetry = () => {
        window.location.reload(); // Simple retry for now
    };

    return (
        <NowCard>
            <div className="flex flex-col items-center justify-center space-y-6 text-amber-500 animate-in zoom-in-95 duration-500">
                <AlertCircle className="w-16 h-16 opacity-80" />

                <div className="space-y-2 text-center">
                    <PrimaryFocusTitle>
                        <span className="text-amber-400">Connection Error</span>
                    </PrimaryFocusTitle>
                    <StatusText>{result.message}</StatusText>
                </div>

                {result.retryable && (
                    <div className="pt-6">
                        <TertiaryButton onClick={handleRetry}>
                            Retry Connection
                        </TertiaryButton>
                    </div>
                )}
            </div>
        </NowCard>
    );
}
