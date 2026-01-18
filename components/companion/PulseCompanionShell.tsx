// components/companion/PulseCompanionShell.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { QuickTalkButton } from "@/components/companion/QuickTalkButton";
import { RunEventFeed } from "@/components/companion/RunEventFeed";
import { IntentProposalCard } from "@/components/companion/IntentProposalCard";
import { PatternsPanel } from "@/components/companion/PatternsPanel";
import { subscribeToContextBus } from "@/lib/companion/contextBus";
import { InsightCard } from "@/components/companion/InsightCard";
import { ConsentCard } from "@/components/companion/ConsentCard";
import { PurchaseProposalCard } from "@/components/companion/PurchaseProposalCard";
import { LiveRunsPanel } from "@/components/companion/LiveRunsPanel";
import { PendingActionsQueue } from "@/components/companion/PendingActionsQueue";
import { AutonomyDashboard } from "@/components/companion/AutonomyDashboard";
import { PulseAvatar } from "@/components/companion/PulseAvatar"; // Phase 13
import { useOpeningSignals } from "@/lib/companion/openings"; // Phase 14
import { PreDelegationReadyCard } from "@/components/companion/PreDelegationReadyCard"; // Phase 14

type PulseIntent =
    | { type: "RUN_ORACLE"; confidence: number; oracle_id: string; args?: Record<string, any> }
    | { type: "NAVIGATE"; confidence: number; path: string }
    | { type: "CREATE_REMINDER"; confidence: number; content: string; when?: string }
    | { type: "PURCHASE_PREPARE"; confidence: number; merchant_key: string; category: string; amount_cents?: number }
    | { type: "COMMERCE_REQUEST"; confidence: number; request_text: string; }
    | { type: "UNKNOWN"; confidence: number; reason?: string };

type SimpleInsight = { summary: string; confidence: number };
type ConsentProposal = { consent_type: string; summary: string; scope: any };

import { getContextLabel } from "@/lib/companion/contextLabels";
import { usePulsePresenceState } from "@/lib/companion/presenceState";

export function PulseCompanionShell(props: { ownerUserId: string }) {
    const [context, setContext] = useState<any>({});
    const [activeRunId, setActiveRunId] = useState<string | null>(null);
    const [latestIntent, setLatestIntent] = useState<PulseIntent | null>(null);
    const [insights, setInsights] = useState<SimpleInsight[]>([]);
    const [activeProposal, setActiveProposal] = useState<ConsentProposal | null>(null);
    const [lastContextTime, setLastContextTime] = useState<number>(0);
    const [showDetails, setShowDetails] = useState(false); // Phase 13
    const [copyFeedback, setCopyFeedback] = useState(false); // Phase 13

    // Presence Logic
    const isGenerating = !!activeRunId || latestIntent?.type === "COMMERCE_REQUEST";
    const { state: presenceState, recordInteraction } = usePulsePresenceState(lastContextTime, isGenerating);
    const contextLabel = getContextLabel(context?.route);
    const currentUrl = context?.route || "/";

    // Phase 14: Opening Signals
    const { hasOpening, openingType } = useOpeningSignals(
        !!activeRunId, // QuickTalk active implies focus/interaction
        copyFeedback,  // Help copy recent
        showDetails    // Builder open
    );

    useEffect(() => {
        const unsub = subscribeToContextBus((frame) => {
            setContext(frame);
            setLastContextTime(Date.now());
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        generateInsights();
    }, []);

    async function generateInsights() {
        try {
            const res = await fetch("/api/insights/generate", {
                method: "POST",
                headers: { "x-owner-user-id": props.ownerUserId },
            });
            if (!res.ok) return;
            const json = await res.json();
            if (json.run_id && !activeRunId) {
                setActiveRunId(json.run_id);
            }
        } catch { }
    }

    async function triggerConsentProposal(insight: any) {
        try {
            const res = await fetch("/api/anticipation/propose", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-owner-user-id": props.ownerUserId
                },
                body: JSON.stringify({ insight }),
            });
            if (!res.ok) return;
            const json = await res.json();
            if (json.run_id) {
                setActiveRunId(json.run_id);
            }
        } catch { }
    }

    async function handleConsent(granted: boolean) {
        if (!activeProposal) return;
        try {
            await fetch("/api/consent/set", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-owner-user-id": props.ownerUserId
                },
                body: JSON.stringify({
                    consent_type: activeProposal.consent_type,
                    scope: activeProposal.scope,
                    granted
                })
            });
        } catch { }
        setActiveProposal(null);
    }

    const pageActions = useMemo(() => (Array.isArray(context?.actions) ? context.actions : []), [context]);

    function onDismissProposal() {
        setLatestIntent(null);
    }

    async function runOracle(oracleId: string, args?: Record<string, any>) {
        const res = await fetch(`/api/oracles/${oracleId}/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-owner-user-id": props.ownerUserId,
            },
            body: JSON.stringify({ input: args ?? {}, context }),
        });

        if (!res.ok) return;
        const json = await res.json();
        if (json?.run_id) {
            setActiveRunId(json.run_id);
        }
    }

    async function executePurchase() {
        if (!latestIntent || latestIntent.type !== "PURCHASE_PREPARE") return;

        // Start the execution run
        const res = await fetch("/api/purchases/execute", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-owner-user-id": props.ownerUserId,
            },
            body: JSON.stringify({
                merchant_key: latestIntent.merchant_key,
                category: latestIntent.category,
                amount_cents: latestIntent.amount_cents ?? 0,
                context
            })
        });

        if (!res.ok) return;
        const json = await res.json();
        if (json.run_id) setActiveRunId(json.run_id);
        setLatestIntent(null); // Clear proposal since we are now running
    }

    useEffect(() => {
        if (latestIntent?.type === "COMMERCE_REQUEST") {
            executeCommerce(latestIntent.request_text);
            setLatestIntent(null);
        }
    }, [latestIntent]);

    async function executeCommerce(request_text: string) {
        try {
            const res = await fetch("/api/commerce/execute", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-owner-user-id": props.ownerUserId,
                },
                body: JSON.stringify({ request_text })
            });
            if (!res.ok) return;
            const json = await res.json();
            if (json.run_id) setActiveRunId(json.run_id);
        } catch { }
    }

    function navigateTo(path: string) {
        window.location.href = path;
    }

    function handleShare() {
        // Phase 13 "Copy for help" logic could go here or imported
        recordInteraction("USER_ACTION", "Copy for help");
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
        // Mock copy logic for now or real implementation if clipboard API available
        // navigator.clipboard.writeText(...)
    }

    // Dynamic Subtitle & Status (Phase 13 Polish)
    const subtitle = presenceState === "active" ? "Thinking" :
        presenceState === "engaged" ? "Listening" :
            "Here with you";

    const polishedContextLabel = contextLabel.replace("Viewing: ", "On: ");

    const shellClasses = `
        pointer-events-auto h-full w-full rounded-2xl flex flex-col transition-all duration-500
        ${presenceState === 'active' ? 'border-cyan-500/30 bg-black/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]' :
            presenceState === 'engaged' ? 'border-white/20 bg-black/10 shadow-lg' :
                'border-white/5 bg-black/5 shadow-none hover:border-white/10'}
        backdrop-blur-xl
    `;

    return (
        <div
            className={shellClasses}
            onMouseEnter={() => recordInteraction()}
            onFocus={() => recordInteraction()}
            onClick={() => recordInteraction()}
        >
            {/* Companion Identity Header (Phase 13) */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent rounded-t-2xl shrink-0">
                <div className="flex items-center gap-3">
                    <PulseAvatar size="md" state={presenceState} />
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white tracking-tight leading-none">Pulse</span>
                        <span className="text-[10px] text-white/50 font-medium tracking-wide mt-0.5 flex items-center gap-1.5">
                            {subtitle}
                            {/* Tiny status dot (no text) */}
                            <div className={`w-1 h-1 rounded-full ${lastContextTime > 0 ? "bg-emerald-400" : "bg-white/10"} opacity-50`} />
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleShare(); }}
                        className="text-[10px] uppercase tracking-wider font-medium text-white/30 hover:text-white/80 transition-colors px-2 py-1 rounded-md hover:bg-white/5"
                        title="Copy context to share"
                    >
                        {copyFeedback ? "Copied" : "Copy for help"}
                    </button>
                    <button
                        className="w-6 h-6 flex items-center justify-center rounded-full text-white/20 hover:text-white hover:bg-white/10 transition-colors"
                        onClick={() => window.open("/pulse/companion", "pulse_companion", "width=420,height=760")}
                        title="Pop out"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </button>
                </div>
            </div>

            {/* Context Reflection (Passive - Softened) */}
            <div className="px-4 py-1.5 border-b border-white/5 bg-black/10 flex items-center justify-between shrink-0">
                <span className="text-[9px] uppercase tracking-widest text-white/30 font-medium truncate max-w-[200px]">
                    {polishedContextLabel}
                </span>
                {context?.hints?.length ? (
                    <span className="text-[9px] text-emerald-400/40 font-medium">
                        {context.hints.length} hints
                    </span>
                ) : null}
            </div>

            {/* Main Scroll Area */}
            <div className="p-4 space-y-3 flex-1 overflow-y-auto scrollbar-hide">

                {/* Phase 14: Predicitve Readiness (Calm) */}
                <PreDelegationReadyCard
                    contextPath={currentUrl}
                    hasOpening={hasOpening}
                    openingType={openingType}
                />

                {/* Hints are visual suggestions now, very subtle */}
                {context?.hints?.length ? (
                    <div className="flex flex-wrap gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                        {context.hints.slice(0, 3).map((h: string) => (
                            <span key={h} className="cursor-default text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:border-white/20 transition-colors">
                                {h}
                            </span>
                        ))}
                    </div>
                ) : null}

                <QuickTalkButton
                    ownerUserId={props.ownerUserId}
                    context={context}
                    onRunId={(id) => {
                        setActiveRunId(id);
                        setLatestIntent(null);
                        setInsights([]);
                        setActiveProposal(null);
                        recordInteraction("USER_COMMAND", "Quick Talk Triggered");
                    }}
                />

                <RunEventFeed
                    runId={activeRunId}
                    ownerUserId={props.ownerUserId}
                    onRunDoneExtractIntent={(intent) => {
                        setLatestIntent(intent);
                        recordInteraction("SYSTEM_EVENT", `Extracted Intent: ${intent.type}`);
                    }}
                    onRunDoneExtractInsights={(newInsights) => {
                        if (newInsights && newInsights.length > 0) {
                            setInsights(newInsights);
                            if (!activeProposal) {
                                triggerConsentProposal(newInsights[0]);
                            }
                        }
                    }}
                    onRunDoneExtractProposal={(prop) => setActiveProposal(prop)}
                />

                {activeProposal ? (
                    <ConsentCard
                        proposal={activeProposal}
                        onGrant={() => handleConsent(true)}
                        onDecline={() => handleConsent(false)}
                    />
                ) : null}

                {insights.map((insight, i) => (
                    <InsightCard
                        key={i}
                        insight={insight}
                        onDismiss={() => {
                            setInsights(prev => prev.filter((_, idx) => idx !== i));
                            recordInteraction("USER_ACTION", "Dismissed Insight");
                        }}
                    />
                ))}

                {latestIntent?.type === "PURCHASE_PREPARE" ? (
                    <PurchaseProposalCard
                        proposal={{
                            merchant_key: latestIntent.merchant_key,
                            category: latestIntent.category,
                            amount_cents: latestIntent.amount_cents
                        }}
                        onPay={executePurchase}
                        onDismiss={onDismissProposal}
                    />
                ) : latestIntent?.type === "COMMERCE_REQUEST" ? (
                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4 animate-pulse flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin"></div>
                        <div className="text-xs font-medium text-indigo-200">Processing...</div>
                    </div>
                ) : (
                    <IntentProposalCard
                        intent={latestIntent}
                        pageActions={pageActions}
                        onRunOracle={runOracle}
                        onNavigate={navigateTo}
                        onDismiss={onDismissProposal}
                    />
                )}

                <PatternsPanel ownerUserId={props.ownerUserId} context={context} />

                {/* Collapsed Technical Details (Phase 13) */}
                <div className="mt-6 pt-4 border-t border-white/5">
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="w-full text-center text-[10px] text-white/20 hover:text-white/40 transition-colors pb-2"
                    >
                        {showDetails ? "Hide System Details" : "Behind the scenes"}
                    </button>

                    {showDetails && (
                        <div className="bg-black/20 rounded-lg p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                            <LiveRunsPanel ownerUserId={props.ownerUserId} />
                            <PendingActionsQueue />
                            <AutonomyDashboard ownerUserId={props.ownerUserId} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
export default PulseCompanionShell;
type PulseIntent =
    | { type: "RUN_ORACLE"; confidence: number; oracle_id: string; args?: Record<string, any> }
    | { type: "NAVIGATE"; confidence: number; path: string }
    | { type: "CREATE_REMINDER"; confidence: number; content: string; when?: string }
    | { type: "PURCHASE_PREPARE"; confidence: number; merchant_key: string; category: string; amount_cents?: number }
    | { type: "COMMERCE_REQUEST"; confidence: number; request_text: string; }
    | { type: "UNKNOWN"; confidence: number; reason?: string };

type SimpleInsight = { summary: string; confidence: number };
type ConsentProposal = { consent_type: string; summary: string; scope: any };

import { getContextLabel } from "@/lib/companion/contextLabels";
import { usePulsePresenceState } from "@/lib/companion/presenceState";

export function PulseCompanionShell(props: { ownerUserId: string }) {
    const [context, setContext] = useState<any>({});
    const [activeRunId, setActiveRunId] = useState<string | null>(null);
    const [latestIntent, setLatestIntent] = useState<PulseIntent | null>(null);
    const [insights, setInsights] = useState<SimpleInsight[]>([]);
    const [activeProposal, setActiveProposal] = useState<ConsentProposal | null>(null);
    const [lastContextTime, setLastContextTime] = useState<number>(0);

    // Presence Logic
    const isGenerating = !!activeRunId || latestIntent?.type === "COMMERCE_REQUEST";
    const { state: presenceState, recordInteraction } = usePulsePresenceState(lastContextTime, isGenerating);
    const isConnected = lastContextTime > 0 && (Date.now() - lastContextTime < 60000);
    const contextLabel = getContextLabel(context?.route);

    useEffect(() => {
        const unsub = subscribeToContextBus((frame) => {
            setContext(frame);
            setLastContextTime(Date.now());
        });
        return () => unsub();
    }, []);

    // ... (keep generateInsights, triggerConsentProposal, handleConsent unchanged)

    useEffect(() => {
        generateInsights();
    }, []);

    async function generateInsights() {
        try {
            const res = await fetch("/api/insights/generate", {
                method: "POST",
                headers: { "x-owner-user-id": props.ownerUserId },
            });
            if (!res.ok) return;
            const json = await res.json();
            if (json.run_id && !activeRunId) {
                setActiveRunId(json.run_id);
            }
        } catch { }
    }

    async function triggerConsentProposal(insight: any) {
        try {
            const res = await fetch("/api/anticipation/propose", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-owner-user-id": props.ownerUserId
                },
                body: JSON.stringify({ insight }),
            });
            if (!res.ok) return;
            const json = await res.json();
            if (json.run_id) {
                setActiveRunId(json.run_id);
            }
        } catch { }
    }

    async function handleConsent(granted: boolean) {
        if (!activeProposal) return;
        try {
            await fetch("/api/consent/set", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-owner-user-id": props.ownerUserId
                },
                body: JSON.stringify({
                    consent_type: activeProposal.consent_type,
                    scope: activeProposal.scope,
                    granted
                })
            });
        } catch { }
        setActiveProposal(null);
    }

    const pageActions = useMemo(() => (Array.isArray(context?.actions) ? context.actions : []), [context]);

    function onDismissProposal() {
        setLatestIntent(null);
    }

    // ... (keep runOracle, executePurchase, executeCommerce, navigateTo unchanged)

    async function runOracle(oracleId: string, args?: Record<string, any>) {
        const res = await fetch(`/api/oracles/${oracleId}/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-owner-user-id": props.ownerUserId,
            },
            body: JSON.stringify({ input: args ?? {}, context }),
        });

        if (!res.ok) return;
        const json = await res.json();
        if (json?.run_id) {
            setActiveRunId(json.run_id);
        }
    }

    async function executePurchase() {
        if (!latestIntent || latestIntent.type !== "PURCHASE_PREPARE") return;

        // Start the execution run
        const res = await fetch("/api/purchases/execute", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-owner-user-id": props.ownerUserId,
            },
            body: JSON.stringify({
                merchant_key: latestIntent.merchant_key,
                category: latestIntent.category,
                amount_cents: latestIntent.amount_cents ?? 0,
                context
            })
        });

        if (!res.ok) return;
        const json = await res.json();
        if (json.run_id) setActiveRunId(json.run_id);
        setLatestIntent(null); // Clear proposal since we are now running
    }

    useEffect(() => {
        if (latestIntent?.type === "COMMERCE_REQUEST") {
            executeCommerce(latestIntent.request_text);
            setLatestIntent(null);
        }
    }, [latestIntent]);

    async function executeCommerce(request_text: string) {
        try {
            const res = await fetch("/api/commerce/execute", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-owner-user-id": props.ownerUserId,
                },
                body: JSON.stringify({ request_text })
            });
            if (!res.ok) return;
            const json = await res.json();
            if (json.run_id) setActiveRunId(json.run_id);
        } catch { }
    }

    function navigateTo(path: string) {
        window.location.href = path;
    }

    // Visual State Calculation
    // Idle = low opacity border, neutral
    // Engaged = brighter border, slightly higher backdrop opacity
    // Active = accent border color, subtle pulse
    const shellClasses = `
        pointer-events-auto h-full w-full rounded-2xl flex flex-col transition-all duration-500
        ${presenceState === 'active' ? 'border-cyan-500/30 bg-black/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]' :
            presenceState === 'engaged' ? 'border-white/20 bg-black/10 shadow-lg' :
                'border-white/5 bg-black/5 shadow-none hover:border-white/10'}
        backdrop-blur-xl
    `;

    return (
        <div
            className={shellClasses}
            onMouseEnter={recordInteraction}
            onFocus={recordInteraction}
            onClick={recordInteraction}
        >
            {/* Header Area */}
            <div className="flex flex-col border-b border-white/5 bg-black/10 rounded-t-2xl">
                <div className="flex items-center justify-between px-4 py-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-white tracking-tight">Pulse</div>
                        <div className={`w-1.5 h-1.5 rounded-full transition-all duration-700 ${isConnected ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-white/10"}`} />
                    </div>
                    <button
                        className="text-[10px] rounded-full px-2 py-0.5 border border-white/5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                        onClick={() => window.open("/pulse/companion", "pulse_companion", "width=420,height=760")}
                    >
                        Pop out
                    </button>
                </div>

                {/* Context Reflection Line - Passive & Calm */}
                <div className="px-4 pb-2 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-emerald-400/60 font-medium">
                        {contextLabel}
                    </span>
                    {context?.hints?.length ? (
                        <span className="text-[10px] text-white/20">
                            {context.hints.length} hints available
                        </span>
                    ) : null}
                </div>
            </div>

            {/* Main Scroll Area */}
            <div className="p-4 space-y-3 flex-1 overflow-y-auto scrollbar-hide">

                {/* Debug context hidden/removed for users, or kept extremely subtle 
                    Replacing the old bulky Context card with just hints if they exist 
                */}
                {/* If there are hints, we can show them gently */}
                {context?.hints?.length ? (
                    <div className="flex flex-wrap gap-1.5 opacity-50 hover:opacity-100 transition-opacity">
                        {context.hints.slice(0, 3).map((h: string) => (
                            <span key={h} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-slate-400">
                                {h}
                            </span>
                        ))}
                    </div>
                ) : null}

                <QuickTalkButton
                    ownerUserId={props.ownerUserId}
                    context={context}
                    onRunId={(id) => {
                        setActiveRunId(id);
                        setLatestIntent(null);
                        setInsights([]);
                        setActiveProposal(null);
                    }}
                />

                <RunEventFeed
                    runId={activeRunId}
                    ownerUserId={props.ownerUserId}
                    onRunDoneExtractIntent={(intent) => setLatestIntent(intent)}
                    onRunDoneExtractInsights={(newInsights) => {
                        if (newInsights && newInsights.length > 0) {
                            setInsights(newInsights);
                            if (!activeProposal) {
                                triggerConsentProposal(newInsights[0]);
                            }
                        }
                    }}
                    onRunDoneExtractProposal={(prop) => setActiveProposal(prop)}
                />

                {activeProposal ? (
                    <ConsentCard
                        proposal={activeProposal}
                        onGrant={() => handleConsent(true)}
                        onDecline={() => handleConsent(false)}
                    />
                ) : null}

                {insights.map((insight, i) => (
                    <InsightCard
                        key={i}
                        insight={insight}
                        onDismiss={() => setInsights(prev => prev.filter((_, idx) => idx !== i))}
                    />
                ))}

                {latestIntent?.type === "PURCHASE_PREPARE" ? (
                    <PurchaseProposalCard
                        proposal={{
                            merchant_key: latestIntent.merchant_key,
                            category: latestIntent.category,
                            amount_cents: latestIntent.amount_cents
                        }}
                        onPay={executePurchase}
                        onDismiss={onDismissProposal}
                    />
                ) : latestIntent?.type === "COMMERCE_REQUEST" ? (
                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4 animate-pulse flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin"></div>
                        <div className="text-xs font-medium text-indigo-200">Processing commerce request...</div>
                    </div>
                ) : (
                    <IntentProposalCard
                        intent={latestIntent}
                        pageActions={pageActions}
                        onRunOracle={runOracle}
                        onNavigate={navigateTo}
                        onDismiss={onDismissProposal}
                    />
                )}

                <div className="flex flex-col gap-1 border-t border-white/5 pt-4 mt-4">
                    <LiveRunsPanel ownerUserId={props.ownerUserId} />
                    <PendingActionsQueue />
                    <AutonomyDashboard ownerUserId={props.ownerUserId} />
                </div>

                <PatternsPanel ownerUserId={props.ownerUserId} context={context} />
            </div>
        </div>
    );
}

<div className="text-[11px] opacity-70 text-slate-500">
    Pulse 9: Universal Commerce Executor
</div>
            </div >
        </div >
    );
}
// Maintain default export for compatibility
export default PulseCompanionShell;
