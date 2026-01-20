// app/auth-disabled/page.tsx
export default function AuthDisabledPage() {
    return (
        <main style={{ padding: 24, maxWidth: 760, margin: "0 auto", fontFamily: "sans-serif" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
                Preview Deployment: Auth Disabled
            </h1>

            <p style={{ marginBottom: 12, lineHeight: 1.5 }}>
                This is a Vercel Preview build. Authentication is intentionally disabled here to prevent
                production Clerk keys from being used on non-canonical domains.
            </p>

            <p style={{ marginBottom: 12, lineHeight: 1.5 }}>
                To test sign-in, use the canonical domain:
                <strong> app.pulselifeos.com</strong>
            </p>

            <p style={{ opacity: 0.8, lineHeight: 1.5 }}>
                You can still review most UI in this preview. Routes that require authentication will redirect here.
            </p>
        </main>
    );
}
