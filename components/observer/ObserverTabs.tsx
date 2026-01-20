import { cn } from "@/lib/utils";
import { TOKENS } from "@/lib/ui/tokens";

export type ObserverTabValue = 'runtime' | 'autonomy' | 'effects' | 'ipp' | 'background';

interface ObserverTabsProps {
    activeTab: ObserverTabValue;
    onTabChange: (tab: ObserverTabValue) => void;
}

const TABS: { value: ObserverTabValue; label: string }[] = [
    { value: 'runtime', label: 'Runtime' },
    { value: 'autonomy', label: 'Autonomy' },
    { value: 'effects', label: 'Effects' },
    { value: 'ipp', label: 'IPP' },
    { value: 'background', label: 'Background' },
];

export function ObserverTabs({ activeTab, onTabChange }: ObserverTabsProps) {
    return (
        <div className={`flex items-center gap-2 mb-8 overflow-x-auto scrollbar-hide py-1`}>
            {TABS.map((tab) => (
                <button
                    key={tab.value}
                    onClick={() => onTabChange(tab.value)}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-full transition-all border",
                        activeTab === tab.value
                            ? `${TOKENS.COLORS.primary.bg} ${TOKENS.COLORS.primary.text} border-transparent shadow-sm`
                            : `${TOKENS.COLORS.glass.bg} border-transparent ${TOKENS.COLORS.text.dim} hover:text-white hover:bg-white/10`
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
