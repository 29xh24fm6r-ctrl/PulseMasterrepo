import { NextResponse } from "next/server";
import { getRuntimeAuthMode } from "@/lib/runtime/runtimeAuthPolicy";

export async function GET() {
    const res = NextResponse.json({
        const manifest = {
            name: "Pulse OS",
            short_name: "Pulse",
            start_url: "/",
            display: "standalone",
            background_color: "#000000",
            theme_color: "#000000",
            icons: [],
        };
        const res = NextResponse.json(manifest);
        res.headers.set("x-pulse-runtime-auth-mode", getRuntimeAuthMode());
        res.headers.set("x-pulse-src", "manifest_route");
        return res;
    }
