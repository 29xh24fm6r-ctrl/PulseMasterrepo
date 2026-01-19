"use client";

import React, { useState, useEffect } from "react";
import { Activity, CheckCircle, XCircle, Play, Loader2, RotateCcw } from "lucide-react";

export function DevSmokePanel() {
    const [status, setStatus] = useState<"idle" | "running" | "pass" | "fail">("idle");
    const [logs, setLogs] = useState<string[]>([]);
    const [checks, setChecks] = useState<Record<string, boolean | null>>({
        "Health Endpoint": null,
        "WhoAmI Endpoint": null,
        "Bootstrap Endpoint": null,
        "Local Identity": null,
        "Reload Persisted": null
    });

    useEffect(() => {
        // Check for post-reload smoke continuation
        if (window.location.search.includes("smoke=1")) {
            const lastResult = sessionStorage.getItem("pulse.dev.smoke.lastResult");
            if (lastResult === "pending_reload") {
                finishSmokeTest();
            }
        }
    }, []);

    const log = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const runSmokeTest = async () => {
        setStatus("running");
        setLogs([]);
        setChecks(c => Object.fromEntries(Object.keys(c).map(k => [k, null])));

        try {
            log("Starting Smoke Test...");

            // 1. Health
            log("Checking /api/dev/health...");
            const healthRes = await fetch("/api/dev/health");
            if (!healthRes.ok) throw new Error(`Health failed: ${healthRes.status}`);
            const healthJson = await healthRes.json();
            if (!healthJson.ok) throw new Error("Health returned ok:false");
            setChecks(c => ({ ...c, "Health Endpoint": true }));
            log("Health PASS");

            // 2. WhoAmI
            log("Checking /api/dev/whoami...");
            const whoamiRes = await fetch("/api/dev/whoami");
            if (!whoamiRes.ok) throw new Error(`WhoAmI failed: ${whoamiRes.status}`);
            setChecks(c => ({ ...c, "WhoAmI Endpoint": true }));
            log("WhoAmI PASS");

            // 3. Bootstrap
            log("Testing Bootstrap...");
            const bootRes = await fetch("/api/dev/bootstrap", { method: "POST" });
            const bootJson = await bootRes.json();
            if (!bootJson.ok || !bootJson.pulse_owner_user_id) throw new Error("Bootstrap failed");
            setChecks(c => ({ ...c, "Bootstrap Endpoint": true }));
            log(`Bootstrap PASS (User: ${bootJson.pulse_owner_user_id.slice(0, 8)}...)`);

            // 4. Client Storage
            localStorage.setItem("pulse_owner_user_id", bootJson.pulse_owner_user_id);
            if (localStorage.getItem("pulse_owner_user_id") !== bootJson.pulse_owner_user_id) {
                throw new Error("LocalStorage write failed");
            }
            setChecks(c => ({ ...c, "Local Identity": true }));
            log("Local Storage PASS");

            // 5. Reload Triger
            log("Triggering reload to verify persistence...");
            sessionStorage.setItem("pulse.dev.smoke.lastResult", "pending_reload");
            window.location.assign(window.location.pathname + "?smoke=1");

        } catch (e: any) {
            console.error(e);
            log(`ERROR: ${e.message}`);
            setStatus("fail");
        }
    };

    const finishSmokeTest = () => {
        const userId = localStorage.getItem("pulse_owner_user_id");
        if (userId) {
            setChecks(c => ({
                "Health Endpoint": true,
                "WhoAmI Endpoint": true,
                "Bootstrap Endpoint": true,
                "Local Identity": true,
                "Reload Persisted": true
            }));
            setStatus("pass");
            sessionStorage.removeItem("pulse.dev.smoke.lastResult");
            log("Reload verified. Smoke Test COMPLETE: PASS");
            // Clean up URL
            window.history.replaceState({}, "", window.location.pathname);
        } else {
            setStatus("fail");
            log("FAIL: Identity lost after reload");
        }
    };

    // Visibility Logic:
    // 1. Visible by default in Dev
    // 2. Visible if NEXT_PUBLIC_DEV_PULSE_OWNER_USER_ID is set (Preview/CI)
    // 3. Visible if ?force_smoke=1 is present (Emergency override for Tests)
    const isDev = process.env.NODE_ENV !== "production";
    const [isVisible, setIsVisible] = useState(isDev);

    useEffect(() => {
        const hasDevIdentity = !!process.env.NEXT_PUBLIC_DEV_PULSE_OWNER_USER_ID;
        const force = window.location.search.includes("force_smoke=1");

        if (hasDevIdentity || force) {
            setIsVisible(true);
        }
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-black/90 text-white rounded-xl border border-white/20 shadow-2xl backdrop-blur-md overflow-hidden font-mono text-xs">
            <div className="bg-white/10 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold">Dev Smoke Harness</span>
                </div>
                {status !== "idle" && (
                    <button onClick={() => setStatus("idle")} className="hover:text-white/80"><RotateCcw className="w-3 h-3" /></button>
                )}
            </div>

            <div className="p-4 space-y-4">
                {/* Status List */}
                <div className="space-y-2">
                    {Object.entries(checks).map(([name, result]) => (
                        <div key={name} className="flex items-center justify-between">
                            <span className="text-white/70">{name}</span>
                            {result === true && <span className="text-emerald-400 font-bold flex gap-1 items-center"><CheckCircle className="w-3 h-3" /> PASS</span>}
                            {result === false && <span className="text-red-400 font-bold flex gap-1 items-center"><XCircle className="w-3 h-3" /> FAIL</span>}
                            {result === null && <span className="text-white/20">...</span>}
                        </div>
                    ))}
                </div>

                {/* Console */}
                {logs.length > 0 && (
                    <div className="h-24 overflow-y-auto bg-black/50 p-2 rounded border border-white/10 text-[10px] text-zinc-400">
                        {logs.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                )}

                {/* Actions */}
                {status !== "pass" && status !== "running" && (
                    <button
                        onClick={runSmokeTest}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded flex items-center justify-center gap-2 font-bold transition-colors"
                    >
                        <Play className="w-3 h-3" /> Run Smoke Test
                    </button>
                )}

                {status === "running" && (
                    <div className="w-full bg-white/5 text-white/50 py-2 rounded flex items-center justify-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Running...
                    </div>
                )}

                {status === "pass" && (
                    <div className="p-2 bg-emerald-500/20 border border-emerald-500/50 rounded text-center text-emerald-300 font-bold">
                        ALL SYSTEMS GREEN
                    </div>
                )}
            </div>
        </div>
    );
}
