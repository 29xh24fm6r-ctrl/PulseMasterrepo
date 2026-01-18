"use client";

// components/companion/PendingActionsQueue.tsx
export function PendingActionsQueue() {
    // Placeholder: This would consume from the 'Pulse Context' or a specific 'Pending' endpoint

    // to show items waiting for approval (L0 proposals).

    return (
        <div className="flex flex-col gap-2 p-2 border-t border-white/10 bg-black/20">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Pending Approval</h3>
            <div className="text-xs text-white/30 italic py-2">Inbox zero. No actions pending.</div>
        </div>
    );
}
