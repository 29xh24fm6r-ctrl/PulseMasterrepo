import React, { useEffect, useRef } from 'react';
import { ArrowRight, Clock, RefreshCw, Zap } from 'lucide-react';

// --- Layout Atoms ---

export function NowCard({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
        </div>
    );
}

export function AmbiguityState({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center space-y-8 w-full animate-in fade-in duration-1000">
            {/* Pulse Orb placeholder */}
            <div className="w-4 h-4 rounded-full bg-cyan-500/50 animate-pulse shadow-[0_0_20px_rgba(6,182,212,0.5)]" />
            {children}
        </div>
    );
}

export function DeferredState({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center space-y-6 text-slate-500 animate-in zoom-in-95 duration-700">
            <Clock className="w-12 h-12 opacity-20" />
            {children}
        </div>
    );
}

// --- Content Atoms ---

export function IdentityBadge({ tags }: { tags: string[] }) {
    if (!tags?.length) return null;
    return (
        <div className="flex gap-2">
            {tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800/50 text-slate-400 border border-slate-800 uppercase tracking-wider">
                    {tag}
                </span>
            ))}
        </div>
    );
}

export function PrimaryFocusTitle({ children }: { children: React.ReactNode }) {
    return (
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400 tracking-tight leading-tight">
            {children}
        </h1>
    );
}

export function ReasonStack({ reasons }: { reasons: string[] }) {
    if (!reasons?.length) return null;
    return (
        <ul className="space-y-2">
            {reasons.map((r, i) => (
                <li key={i} className="text-sm md:text-base text-slate-400 font-medium opacity-80 flex items-center gap-2 justify-center">
                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                    {r}
                </li>
            ))}
        </ul>
    );
}

export function StatusText({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-xl text-slate-400 font-light tracking-wide">
            {children}
        </p>
    );
}

export function CooldownIndicator({ until }: { until: number | string }) {
    // Simple formatter for now
    const timeStr = typeof until === 'number' ? new Date(until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : String(until);
    return (
        <p className="text-lg font-medium tracking-wide">
            Deferred until <span className="text-slate-300">{timeStr}</span>
        </p>
    );
}


// --- Action Atoms ---

export function ActionButton({ label, onClick, hotkey, primary }: { label: string, onClick: () => void, hotkey?: string, primary?: boolean }) {
    return (
        <button
            onClick={onClick}
            className={`
        group relative px-8 py-4 rounded-full text-lg font-semibold tracking-wide transition-all duration-300
        ${primary
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)] hover:shadow-[0_0_40px_-5px_rgba(37,99,235,0.6)] hover:scale-105 active:scale-95'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }
      `}
        >
            <span className="flex items-center gap-3">
                {label}
                {primary && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </span>
            {hotkey && (
                <div className="absolute -right-12 top-1/2 -translate-y-1/2 hidden lg:flex items-center text-xs font-mono text-slate-600 opacity-50 group-hover:opacity-100 transition-opacity">
                    <span className="border border-slate-700 px-1.5 py-0.5 rounded ml-2">↵ {hotkey}</span>
                </div>
            )}
        </button>
    );
}

export function SecondaryActions({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex gap-4 pt-4 opacity-50 hover:opacity-100 transition-opacity">
            {children}
        </div>
    );
}

export function SecondaryButton({ onClick, children }: { onClick: () => void, children: React.ReactNode }) {
    return (
        <button onClick={onClick} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
            {children}
        </button>
    );
}

export function TertiaryButton({ onClick, children }: { onClick: () => void, children: React.ReactNode }) {
    return (
        <button onClick={onClick} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-2">
            <RefreshCw className="w-3 h-3" />
            {children}
        </button>
    );
}

export function IntentInput({ autoFocus, placeholder }: { autoFocus?: boolean, placeholder?: string }) {
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (autoFocus) inputRef.current?.focus();
    }, [autoFocus]);

    return (
        <div className="w-full max-w-lg relative group">
            <input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-6 py-4 text-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-light"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-50 transition-opacity pointer-events-none">
                <span className="text-xs font-mono text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">↵ Enter</span>
            </div>
        </div>
    )
}
