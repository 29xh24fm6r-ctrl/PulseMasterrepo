// src/app/api/ops/incidents/actions/replay/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeOpsEvent } from "@/lib/ops/incidents/writeEvent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireWarRoomToken(req: Request) {
  const got = req.headers.get("x-war-room-token") || "";
  const want = process.env.WAR_ROOM_ADMIN_TOKEN || "";
  if (!want || got !== want) {
    const err = new Error("unauthorized");
    (err as any).status = 401;
    throw err;
  }
}

function takeUnique(arr: string[], max = 10) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    if (!x) continue;
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
    if (out.length >= max) break;
  }
  return out;
}

function safeApiUrl(origin: string, path: string) {
  const p = path.split("?")[0];
  if (!p.startsWith("/api/")) return null;
  return `${origin}${p}`;
}

async function fetchProbe(url: string, timeoutMs = 10_000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal, cache: "no-store" });
    const ms = Date.now() - started;
    return { ok: res.ok, status: res.status, ms, url };
  } catch (e: any) {
    const ms = Date.now() - started;
    return { ok: false, status: null, ms, url, error: e?.name || "Error", message: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

export async function POST(req: Request) {
  try {
    requireWarRoomToken(req);

    const sb = supabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const maxPaths = Math.max(1, Math.min(10, Number(body?.maxPaths ?? 6)));
    const alsoRunSmoke = body?.alsoRunSmoke !== false; // default true

    // Pull latest events to find breadcrumbs + optional smoke URL
    const { data: events, error } = await sb
      .from("ops_incident_events")
      .select("created_at, event_type, payload, link")
      .order("created_at", { ascending: false })
      .limit(250);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const evts = events ?? [];

    // Find newest breadcrumbs in app/server error payload.meta.breadcrumbs
    let breadcrumbs: any[] = [];
    for (const e of evts) {
      if (e.event_type !== "app_error" && e.event_type !== "server_error") continue;
      const b = (e as any)?.payload?.meta?.breadcrumbs ?? (e as any)?.payload?.breadcrumbs ?? null;
      if (Array.isArray(b) && b.length) {
        breadcrumbs = b;
        break;
      }
    }

    const apiPaths: string[] = [];
    for (const b of breadcrumbs) {
      const data = b?.data || {};
      const url = data?.url || data?.path || null;
      if (typeof url === "string") {
        if (url.startsWith("/api/")) apiPaths.push(url.split("?")[0]);
        else if (url.startsWith("http://") || url.startsWith("https://")) {
          try {
            const u = new URL(url);
            if (u.pathname.startsWith("/api/")) apiPaths.push(u.pathname);
          } catch {}
        }
      }
    }

    const topPaths = takeUnique(apiPaths, maxPaths);

    const origin = new URL(req.url).origin;
    const probeUrls = topPaths.map((p) => safeApiUrl(origin, p)).filter(Boolean) as string[];

    await writeOpsEvent({
      source: "app",
      event_type: "incident_replay_started",
      level: "info",
      summary: `Incident replay started (${probeUrls.length} api probe(s))`,
      payload: { maxPaths, alsoRunSmoke, probePaths: topPaths },
    });

    const probes = [];
    for (const u of probeUrls) {
      probes.push(await fetchProbe(u));
    }

    // Optional: re-run smoke by calling your existing smoke action endpoint (server-to-server)
    // We do it by hitting the same action route the UI calls.
    let smokeResult: any = null;
    if (alsoRunSmoke) {
      const smokeUrl = `${origin}/api/ops/incidents/actions/smoke`;
      smokeResult = await fetchProbe(smokeUrl, 25_000);
    }

    await writeOpsEvent({
      source: "app",
      event_type: "incident_replay_completed",
      level: probes.every((p: any) => p.ok) ? "success" : "warn",
      summary: `Incident replay completed (probes: ${probes.filter((p: any) => p.ok).length}/${probes.length} ok)`,
      payload: { probes, smokeResult },
    });

    return NextResponse.json({ ok: true, probes, smokeResult });
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status });
  }
}

