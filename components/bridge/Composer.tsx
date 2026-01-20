import { SendHorizontal, Mic } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { TOKENS } from "@/lib/ui/tokens";

interface ComposerProps {
    onSend: (text: string) => void;
    isProcessing: boolean;
}

export function Composer({ onSend, isProcessing }: ComposerProps) {
    const [input, setInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isProcessing) return;

        onSend(input);
        setInput("");
    };

    return (
        <div className={`border-t ${TOKENS.COLORS.glass.border} ${TOKENS.COLORS.glass.bg} ${TOKENS.BLUR.xl} p-4 shrink-0 shadow-[0_-1px_20px_rgba(0,0,0,0.2)]`}>
            <form
                onSubmit={handleSubmit}
                className="max-w-4xl mx-auto relative flex items-center gap-3"
            >
                <div className="relative flex-1 group">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isProcessing}
                        placeholder={isProcessing ? "Pulse is thinking..." : "Say something to Pulse..."}
                        className={cn(
                            "w-full bg-white/5 border border-white/5 focus:border-violet-500/50 focus:bg-zinc-900/50 rounded-full px-6 py-4 text-sm transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed text-zinc-100 placeholder:text-zinc-600 shadow-inner",
                            TOKENS.BLUR.sm
                        )}
                    />
                    {isProcessing && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="flex space-x-1">
                                <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={!input.trim() || isProcessing}
                    className={`
                        p-4 ${TOKENS.COLORS.primary.bg} hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 
                        ${TOKENS.COLORS.primary.text} rounded-full transition-all duration-300 transform active:scale-95 disabled:shadow-none
                        shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]
                    `}
                >
                    <SendHorizontal className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
}
