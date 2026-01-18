"use client";

export function ConsentCard(props: {
    proposal: {
        consent_type: string;
        summary: string;
    };
    onGrant: () => void;
    onDecline: () => void;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs opacity-70">Pulse is asking</div>

            <div className="mt-2 text-sm">{props.proposal.summary}</div>

            <div className="mt-3 flex gap-2">
                <button
                    onClick={props.onGrant}
                    className="px-3 py-1 text-xs rounded-md bg-white/10 hover:bg-white/20"
                >
                    Yes, help me
                </button>

                <button
                    onClick={props.onDecline}
                    className="px-3 py-1 text-xs rounded-md bg-white/5 hover:bg-white/10"
                >
                    Not now
                </button>
            </div>
        </div>
    );
}
