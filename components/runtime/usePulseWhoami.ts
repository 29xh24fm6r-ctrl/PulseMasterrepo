"use client";

import { useEffect, useState } from "react";

type WhoamiState = {
    ready: boolean;
    authed: boolean;
};

export function usePulseWhoami(): WhoamiState {
    const [state, setState] = useState<WhoamiState>({ ready: false, authed: false });

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                const res = await fetch("/api/runtime/whoami", { cache: "no-store", headers: { 'pragma': 'no-cache' } });
                const json = await res.json();
                if (!alive) return;

                // TREAT "authed" as strictly derived from whoami response
                const authed = Boolean(json?.authed);
                setState({ ready: true, authed });
            } catch {
                if (!alive) return;
                setState({ ready: true, authed: false });
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

    return state;
}
