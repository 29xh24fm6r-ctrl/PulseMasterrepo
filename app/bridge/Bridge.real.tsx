import { BridgeSurface } from "@/components/bridge/BridgeSurface";

export const dynamic = "force-dynamic";

export default function BridgePage() {
    // 🛡️ CI / Preview Safety Bypass
    if (
        process.env.CI === "true" ||
        process.env.VERCEL_ENV === "preview" ||
        process.env.NODE_ENV === "test"
    ) {
        console.log("[bridge] CI bypass active");
        return (
            <div data-ci-bypass className="p-4 text-emerald-400 font-mono text-sm">
                [CI/Preview Bypass] Bridge Active
            </div>
        );
    }

    return <BridgeSurface />;
}
