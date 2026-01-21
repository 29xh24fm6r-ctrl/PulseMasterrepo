"use client";

import { useEffect } from "react";
import { presenceSendError } from "./publisher";

export function usePresenceErrorCapture() {
    useEffect(() => {
        const onError = (event: ErrorEvent) => {
            presenceSendError({
                ts: Date.now(),
                message: event.message || "Unknown error",
                stack: event.error?.stack,
                source: "window.onerror",
            });
        };

        const onRejection = (event: PromiseRejectionEvent) => {
            const err = event.reason;
            presenceSendError({
                ts: Date.now(),
                message: typeof err === "string" ? err : err?.message || "Unhandled rejection",
                stack: err?.stack,
                source: "unhandledrejection",
            });
        };

        window.addEventListener("error", onError);
        window.addEventListener("unhandledrejection", onRejection);

        return () => {
            window.removeEventListener("error", onError);
            window.removeEventListener("unhandledrejection", onRejection);
        };
    }, []);
}
