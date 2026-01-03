"use client";

import * as React from "react";

type ToastKind = "success" | "error" | "info";
type Toast = {
    id: string;
    kind: ToastKind;
    title?: string;
    message: string;
    ttlMs: number;
};

type ToastContextValue = {
    toast: (t: Omit<Toast, "id">) => void;
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

function uid() {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<Toast[]>([]);

    const remove = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = React.useCallback((t: Omit<Toast, "id">) => {
        const id = uid();
        const toastObj: Toast = { id, ...t };
        setToasts((prev) => [toastObj, ...prev].slice(0, 3));

        window.setTimeout(() => remove(id), toastObj.ttlMs);
    }, [remove]);

    const api = React.useMemo<ToastContextValue>(() => ({
        toast,
        success: (message, title) => toast({ kind: "success", message, title, ttlMs: 2200 }),
        error: (message, title) => toast({ kind: "error", message, title, ttlMs: 3200 }),
        info: (message, title) => toast({ kind: "info", message, title, ttlMs: 2400 }),
    }), [toast]);

    return (
        <ToastContext.Provider value={api}>
            {children}

            {/* Toast Stack */}
            <div className="fixed right-4 top-4 z-[1000] flex w-[360px] max-w-[90vw] flex-col gap-2">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className="rounded-2xl border bg-white/95 shadow-lg backdrop-blur p-3 dark:bg-black/95 dark:border-gray-800"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={[
                                            "h-2.5 w-2.5 rounded-full",
                                            t.kind === "success" ? "bg-green-500" : "",
                                            t.kind === "error" ? "bg-red-500" : "",
                                            t.kind === "info" ? "bg-blue-500" : "",
                                        ].join(" ")}
                                    />
                                    <div className="text-sm font-semibold text-black dark:text-white">
                                        {t.title ?? (t.kind === "success" ? "Success" : t.kind === "error" ? "Error" : "Info")}
                                    </div>
                                </div>
                                <div className="mt-1 text-sm opacity-80 break-words text-black dark:text-gray-300">{t.message}</div>
                            </div>

                            <button
                                className="text-xs opacity-60 hover:opacity-100 dark:text-white"
                                onClick={() => remove(t.id)}
                                aria-label="Dismiss toast"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = React.useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within <ToastProvider />");
    return ctx;
}
