import Link from "next/link";
import { ArrowRight, MessageSquare, ClipboardList } from "lucide-react";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { TOKENS } from "@/lib/ui/tokens";

export function HomeActions() {
    return (
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-sm mx-auto">
            <Link href="/bridge" className="w-full">
                <PrimaryButton className="w-full flex items-center justify-center gap-2 py-4 text-base group shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                    <MessageSquare className="w-4 h-4" />
                    <span>Talk to Pulse</span>
                    <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </PrimaryButton>
            </Link>

            <Link href="/plan" className="w-full">
                <button
                    className={`
                        flex items-center justify-center gap-2 w-full px-8 py-4 
                        ${TOKENS.COLORS.glass.bg} hover:bg-white/10 border border-white/10
                        ${TOKENS.COLORS.text.body} hover:text-white
                        rounded-full font-medium transition-colors duration-300
                    `}
                >
                    <ClipboardList className="w-4 h-4 opacity-70" />
                    <span>View Plan</span>
                </button>
            </Link>
        </div>
    );
}
