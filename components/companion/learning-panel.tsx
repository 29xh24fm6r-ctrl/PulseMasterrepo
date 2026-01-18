'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, TrendingUp, TrendingDown, AlertTriangle, ShieldAlert } from 'lucide-react';
import { getPendingLearningArtifacts, acceptLearningSuggestion, rejectLearningSuggestion, type LearningArtifact } from '@/lib/learning/actions';

export default function LearningPanel() {
    const [artifacts, setArtifacts] = useState<LearningArtifact[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadArtifacts();
    }, []);

    const loadArtifacts = async () => {
        setLoading(true);
        try {
            const data = await getPendingLearningArtifacts();
            setArtifacts(data);
        } catch (err) {
            console.error("Failed to load learning artifacts", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (artifact: LearningArtifact) => {
        try {
            // Assuming intent_type is in metadata or we deduce it. 
            // For this implementation, we expect metadata_json to have `intent`.
            const intent = artifact.metadata_json?.intent;
            if (!intent) {
                alert("Cannot apply: Missing intent in artifact metadata.");
                return;
            }

            await acceptLearningSuggestion(artifact.id, intent);
            setArtifacts(prev => prev.filter(a => a.id !== artifact.id));
        } catch (err) {
            alert("Failed to apply suggestion");
            console.error(err);
        }
    };

    const handleReject = async (id: string) => {
        try {
            await rejectLearningSuggestion(id);
            setArtifacts(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="p-4 text-sm text-zinc-400">Loading insights...</div>;
    if (artifacts.length === 0) return <div className="p-4 text-sm text-zinc-500">No active learning suggestions.</div>;

    return (
        <div className="space-y-4 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pulse Learning</h3>
            <div className="flex flex-col gap-3">
                <AnimatePresence>
                    {artifacts.map((artifact) => (
                        <motion.div
                            key={artifact.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 flex flex-col gap-2 shadow-sm"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <SignalIcon type={artifact.signal_type} />
                                    <span className="text-sm font-medium text-zinc-200">
                                        {artifact.metadata_json?.summary || "Pulse observed an outcome"}
                                    </span>
                                </div>
                                <div className={`text-xs font-mono font-bold ${artifact.confidence_delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {artifact.confidence_delta > 0 ? '+' : ''}{artifact.confidence_delta}
                                </div>
                            </div>

                            <p className="text-xs text-zinc-400 leading-relaxed">
                                {artifact.metadata_json?.reasoning || "Adjustment suggested based on recent activity."}
                            </p>

                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => handleAccept(artifact)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-200 transition-colors"
                                >
                                    <Check className="w-3 h-3" />
                                    Accept
                                </button>
                                <button
                                    onClick={() => handleReject(artifact.id)}
                                    className="px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-800 rounded text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

function SignalIcon({ type }: { type: string }) {
    switch (type) {
        case 'success': return <TrendingUp className="w-4 h-4 text-emerald-500" />;
        case 'failure': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
        case 'interruption': return <ShieldAlert className="w-4 h-4 text-rose-500" />;
        case 'override': return <TrendingDown className="w-4 h-4 text-zinc-500" />;
        default: return <div className="w-4 h-4 rounded-full bg-zinc-700" />;
    }
}
