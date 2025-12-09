import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  exchangeCodeForTokens,
  decodeIdToken,
  saveCalendarAccount,
  syncCalendarEvents,
} from "@/lib/calendar/googleClient";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("[Calendar Callback] OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/settings?calendar_error=${encodeURIComponent(error)}`, req.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(new URL("/settings?calendar_error=no_code", req.url));
    }

    const tokens = await exchangeCodeForTokens(code);
    if (!tokens) {
      return NextResponse.redirect(new URL("/settings?calendar_error=token_exchange_failed", req.url));
    }

    let providerAccountId = "unknown";
    if (tokens.idToken) {
      const decoded = decodeIdToken(tokens.idToken);
      if (decoded) providerAccountId = decoded.sub;
    }

    const saved = await saveCalendarAccount(userId, {
      providerAccountId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });

    if (!saved) {
      return NextResponse.redirect(new URL("/settings?calendar_error=save_failed", req.url));
    }

    // Initial sync
    const syncStart = new Date();
    syncStart.setDate(syncStart.getDate() - 7);
    const syncEnd = new Date();
    syncEnd.setDate(syncEnd.getDate() + 14);

    await syncCalendarEvents(userId, { timeMin: syncStart, timeMax: syncEnd });

    return NextResponse.redirect(new URL("/settings?calendar_connected=true", req.url));
  } catch (error: any) {
    console.error("[Calendar Callback] Error:", error);
    return NextResponse.redirect(
      new URL(`/settings?calendar_error=${encodeURIComponent(error.message)}`, req.url)
    );
  }
}
