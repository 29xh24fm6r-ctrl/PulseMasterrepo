"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[BRIDGE_ERROR]", error);
    }, [error]);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center space-y-6 p-8">
            <div className="flex flex-col items-center space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    Bridge Encountered an Error
                </h2>
                <p className="text-slate-500 max-w-md">
                    Something went wrong while loading the Command Bridge. The application shell remains active.
                </p>
                {error.digest && (
                    <p className="text-xs font-mono text-slate-400">Ref: {error.digest}</p>
                )}
            </div>

            <button
                onClick={() => reset()}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-medium hover:opacity-90 transition-opacity"
            >
                <RefreshCw className="w-4 h-4" />
                Try again
            </button>
        </div>
    );
}
