"use client";

import { useEffect, useState } from "react";
import { chefClient } from "@/lib/chef/client";

export default function ChefGoTimeChip() {
    const [go, setGo] = useState(false);
    const [planId, setPlanId] = useState<string | null>(null);
    const [hasUnreadGo, setHasUnreadGo] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function tick() {
            try {
                const [nextRes, notifRes] = await Promise.all([
                    chefClient.next(),
                    chefClient.notifications(true, 10),
                ]);

                if (!mounted) return;

                // go-time state
                if (nextRes.ok && nextRes.mode === "plan") {
                    setGo(Boolean(nextRes.go_time));
                    setPlanId(nextRes.plan?.id ?? null);
                } else {
                    setGo(false);
                    setPlanId(null);
                }

                // unread go-time notification dot
                if (notifRes.ok) {
                    const has = (notifRes.notifications || []).some(
                        (n: any) => n.type === "go_time" && !n.is_read
                    );
                    setHasUnreadGo(has);
                } else {
                    setHasUnreadGo(false);
                }
            } catch {
                setGo(false);
                setPlanId(null);
                setHasUnreadGo(false);
            }
        }

        tick();
        const t = setInterval(tick, 15000);
        return () => {
            mounted = false;
            clearInterval(t);
        };
    }, []);

    // Only show when actually go-time OR when there’s an unread go-time notification
    if (!go && !hasUnreadGo) return null;

    return (
        <button
            className="relative rounded-full bg-white text-black px-3 py-1 text-xs font-semibold hover:bg-white/90"
            onClick={() => {
                if (planId) chefClient.start(planId);
            }}
            title="Chef status"
        >
            Chef: GO
            {hasUnreadGo ? (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
            ) : null}
        </button>
    );
}
