// components/system/PreviewAuthDisabledBanner.tsx
"use client";

export function PreviewAuthDisabledBanner() {
    return (
        <div
            style={{
                position: "sticky",
                top: 0,
                zIndex: 9999, // Ensure it sits above most things
                padding: "10px 12px",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(20,20,20,0.85)",
                backdropFilter: "blur(10px)",
                color: "#fff",
                fontFamily: "sans-serif",
            }}
        >
            <div style={{ maxWidth: 1100, margin: "0 auto", fontSize: 13, opacity: 0.95 }}>
                <strong>Preview Deployment:</strong> Auth Disabled (Clerk not initialized on this domain).
            </div>
        </div>
    );
}
