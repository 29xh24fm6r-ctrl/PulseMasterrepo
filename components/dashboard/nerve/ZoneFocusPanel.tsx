'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PulseSystemId, PulseSystemState } from '@/lib/nerve/types';
import { SYSTEM_COLORS } from '@/components/dashboard/PulseColorMap';
import { VISUAL_TUNING } from './visualTuning';
import { X, ArrowRight, Activity, AlertCircle } from 'lucide-react';

interface ZoneFocusPanelProps {
    isOpen: boolean;
    systemId: PulseSystemId | null;
    systemState: PulseSystemState | null;
    onClose: () => void;
}

export const ZoneFocusPanel: React.FC<ZoneFocusPanelProps> = ({
    isOpen,
    systemId,
    systemState,
    onClose
}) => {

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!systemId || !systemState) return null;

    const colors = SYSTEM_COLORS[systemId];
    const tuning = VISUAL_TUNING[systemState.level];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        className={`
              fixed top-4 right-4 bottom-4 w-[400px] 
              bg-[#0a0a0a]/90 backdrop-blur-2xl 
              border border-white/10 rounded-2xl 
              shadow-2xl overflow-hidden z-50
              flex flex-col
            `}
                        initial={{ x: 420, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 420, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    >
                        {/* Header with System Identity */}
                        <div className={`
              relative p-6 pt-12 overflow-hidden
              bg-gradient-to-br ${colors.gradient}
            `}>
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2 opacity-80">
                                    <Activity size={16} />
                                    <span className="text-xs font-mono uppercase tracking-widest">{systemState.level} STATE</span>
                                </div>
                                <h2 className="text-3xl font-bold text-white tracking-tight leading-none mb-1">
                                    {colors.label.split(' &')[0]}
                                </h2>
                                <div className="flex gap-2 items-center text-sm font-medium text-white/80">
                                    <span>Score: {systemState.score}</span>
                                    <div className="h-1 w-24 bg-black/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white transition-all duration-500" style={{ width: `${systemState.score}%` }} />
                                    </div>
                                </div>
                            </div>

                            {/* Decorative Background Glow */}
                            <div className={`absolute -bottom-20 -right-20 w-64 h-64 bg-white/20 blur-3xl rounded-full mix-blend-overlay`} />
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">

                            {/* Primary Signals / Reasons */}
                            <section>
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Driving Signals</h3>
                                <div className="space-y-3">
                                    {systemState.reasons.length > 0 ? (
                                        systemState.reasons.map((reason, idx) => (
                                            <div key={idx} className="flex gap-3 items-start text-sm text-slate-300">
                                                <AlertCircle size={16} className={`shrink-0 mt-0.5 ${reason.severity === 'high' ? 'text-red-400' : 'text-blue-400'}`} />
                                                <span>{reason.label}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-slate-500 italic">Systems nominal. No active alerts.</div>
                                    )}
                                </div>
                            </section>

                            {/* Action Plan */}
                            <section>
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Recommended Actions</h3>
                                <div className="grid gap-3">
                                    {systemState.recommended_actions.length > 0 ? (
                                        systemState.recommended_actions.map((action, idx) => (
                                            <button
                                                key={idx}
                                                className={`
                           flex items-center justify-between p-4 rounded-xl
                           bg-white/5 border border-white/5 
                           hover:bg-white/10 hover:border-white/10
                           transition-all group text-left
                         `}
                                            >
                                                <span className="text-sm font-medium text-slate-200 group-hover:text-white">
                                                    {action.label}
                                                </span>
                                                <ArrowRight size={16} className="text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-4 rounded-xl border border-dashed border-white/10 text-center">
                                            <span className="text-sm text-slate-500">No immediate actions required.</span>
                                        </div>
                                    )}
                                </div>
                            </section>

                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-black/20">
                            <button
                                className={`
                  w-full py-3 rounded-xl 
                  bg-white text-black font-semibold text-sm
                  hover:bg-slate-200 transition-colors
                  flex justify-center items-center gap-2
                `}
                            >
                                Open Full View <ArrowRight size={16} />
                            </button>
                        </div>

                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
