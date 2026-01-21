import { NextResponse } from "next/server";

export async function GET() {
    return Response.json({
        name: "Pulse OS",
        short_name: "Pulse",
        start_url: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [],
    });
}

