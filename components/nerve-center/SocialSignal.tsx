"use client";

interface PersonSignal {
    id: string;
    name: string;
    status: string; // e.g., "No reply (3 days)", "Birthday"
    urgency: "HIGH" | "MEDIUM" | "LOW";
}

interface SocialSignalProps {
    signals: PersonSignal[];
}

export const SocialSignal = ({ signals }: SocialSignalProps) => {
    if (signals.length === 0) {
        return <div className="text-zinc-600 text-sm italic">All channels clear.</div>;
    }

    return (
        <div className="flex flex-col gap-3">
            {signals.map((signal) => (
                <div key={signal.id} className="flex justify-between items-center group">
                    <div>
                        <div className="text-lg text-zinc-200 group-hover:text-white transition-colors">
                            {signal.name}
                        </div>
                        <div className={`text-sm ${signal.urgency === "HIGH" ? "text-amber-500" : "text-zinc-500"
                            }`}>
                            {signal.status}
                        </div>
                    </div>
                    {signal.urgency === "HIGH" && (
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    )}
                </div>
            ))}
        </div>
    );
};
