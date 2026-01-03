"use client";

import * as React from "react";

/**
 * Auto-animate list changes using the Web Animations API.
 * - Animates newly added children (fade+slide)
 * - Animates removed children by relying on parent refresh + optimistic UI patterns
 *
 * Works best when list items have stable keys and are inserted/removed at the top.
 */
export function useAutoAnimateList<T extends HTMLElement>() {
    const ref = React.useRef<T | null>(null);

    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // Animate children entering
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                m.addedNodes.forEach((node) => {
                    if (!(node instanceof HTMLElement)) return;

                    node.animate(
                        [
                            { opacity: 0, transform: "translateY(-6px)" },
                            { opacity: 1, transform: "translateY(0px)" },
                        ],
                        { duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
                    );
                });
            }
        });

        observer.observe(el, { childList: true });

        return () => observer.disconnect();
    }, []);

    return ref;
}
