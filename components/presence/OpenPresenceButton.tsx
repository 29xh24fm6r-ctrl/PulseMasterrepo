"use client";

export default function OpenPresenceButton() {
    const open = () => {
        if (typeof window === "undefined") return;

        const w = 420;
        const h = 900;

        // Center-ish on screen
        const left = Math.max(0, (window.screen.width - w) / 2);
        const top = Math.max(0, (window.screen.height - h) / 2);

        window.open(
            "/presence",
            "pulse_presence",
            `popup=yes,width=${w},height=${h},left=${left},top=${top}`
        );
    };

    return (
        <button
            onClick={open}
            className="rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
        >
            Open Presence
        </button>
    );
}
