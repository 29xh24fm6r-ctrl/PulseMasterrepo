import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, Target } from 'lucide-react';
import {
    NowCard as BridgeCard,
    StatusText,
    SecondaryButton
} from '../atoms';

interface BridgeFirstRunProps {
    onExit: (intent?: string) => void;
}

export default function BridgeFirstRun({ onExit }: BridgeFirstRunProps) {
    return (
        <BridgeCard>
            <div className="flex flex-col items-center text-center space-y-6 max-w-lg mx-auto py-8">

                {/* Hero Icon */}
                <div className="p-4 rounded-full bg-blue-500/10 backdrop-blur-md border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                    <Sparkles className="w-8 h-8 text-blue-400" />
                </div>

                {/* Copy */}
                <div className="space-y-2">
                    <h2 className="text-2xl font-light text-slate-100 tracking-tight">
                        What would you like to focus on?
                    </h2>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                        Pulse helps you choose one meaningful thing to work on,
                        even if you're not sure where to start.
                    </p>
                </div>

                {/* Intent Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full px-4">
                    <button
                        onClick={() => onExit("Quick Win")}
                        className="group relative flex items-center justify-between p-4 rounded-xl
                                 bg-slate-800/40 hover:bg-slate-800/60 
                                 border border-slate-700/50 hover:border-blue-500/30
                                 transition-all duration-300 text-left"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-slate-200">Get a quick win</div>
                                <div className="text-xs text-slate-500 group-hover:text-emerald-400/80 transition-colors">
                                    Short, easy tasks
                                </div>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => onExit("Make Progress")}
                        className="group relative flex items-center justify-between p-4 rounded-xl
                                 bg-slate-800/40 hover:bg-slate-800/60 
                                 border border-slate-700/50 hover:border-blue-500/30
                                 transition-all duration-300 text-left"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                                <Target className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-slate-200">Make progress</div>
                                <div className="text-xs text-slate-500 group-hover:text-blue-400/80 transition-colors">
                                    Important projects
                                </div>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Skip Action */}
                <button
                    onClick={() => onExit()}
                    className="text-xs text-slate-500 hover:text-slate-400 transition-colors pt-4"
                >
                    Skip for now
                </button>

            </div>
        </BridgeCard>
    );
}
