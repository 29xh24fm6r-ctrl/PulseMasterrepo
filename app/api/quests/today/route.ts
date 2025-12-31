import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import OpenAI from "openai";
import { jsonError, rateLimitOrThrow, withTimeout } from "@/lib/api/guards";
import { withJourney } from "@/lib/observability/journey";
import { withPerf } from "@/lib/observability/perf";
import { setObsContext } from "@/lib/observability/context";
import { supabaseSpan } from "@/lib/observability/supabaseSpan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const ALGO_VERSION = "v1";

function utcDay(): string {
    const now = new Date();
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return d.toISOString().slice(0, 10);
}

function isoDayStart(day: string) {
    return new Date(day + "T00:00:00.000Z").toISOString();
}

function isoDayEnd(day: string) {
    return new Date(new Date(isoDayStart(day)).getTime() + 24 * 3600 * 1000).toISOString();
}

type CatalogQuest = {
    quest_key: string;
    title: string;
    description: string;
    base_target: number;
    base_reward_xp: number;
    meta: any;
    tags: string[];
};

type Seed = {
    quest_key: string;
    title: string;
    description: string;
    target: number;
    reward_xp: number;
    meta: any;
};

function clamp(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, n));
}

function fmt(template: string, vars: Record<string, any>) {
    return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

function scoreCatalog(c: CatalogQuest, signals: any) {
    // Deterministic scoring: stable, debuggable, bulletproof.
    // Higher score => more likely to be chosen.
    const overdue = signals.overdue_open;
    const dueSoon = signals.due_24h_open;
    const hiPri = signals.high_priority_open;
    const focusRecent = signals.focus_completions_7d;
    const ctxWork = signals.ctx_open_work;
    const ctxPersonal = signals.ctx_open_personal;

    let s = 0;

    if (c.quest_key === "clear_overdue") s += overdue >= 3 ? 100 : overdue > 0 ? 60 : -50;
    if (c.quest_key === "due_soon") s += dueSoon >= 3 ? 90 : dueSoon > 0 ? 50 : -20;
    if (c.quest_key === "complete_high_priority") s += hiPri >= 2 ? 85 : hiPri > 0 ? 45 : -25;
    if (c.quest_key === "focus_finish") s += focusRecent === 0 ? 55 : 25; // encourage focus if unused
    if (c.quest_key === "complete_n_tasks") s += 40; // always solid baseline

    if (c.quest_key === "touch_context_work") {
        s += ctxWork > ctxPersonal ? 25 : ctxWork === 0 ? 20 : 10;
    }
    if (c.quest_key === "touch_context_personal") {
        s += ctxPersonal > ctxWork ? 25 : ctxPersonal === 0 ? 20 : 10;
    }

    // light penalty if already extremely overloaded (avoid impossible quests)
    if (signals.open_total > 40 && c.quest_key === "complete_n_tasks") s -= 10;

    // keep stable tie-break behavior via quest_key hash-ish
    s += (c.quest_key.charCodeAt(0) % 7);

    return s;
}

function buildSeedsFromTop(catalog: CatalogQuest[], signals: any): Seed[] {
    // Score + pick top 3 with simple diversity rule.
    const scored = catalog
        .map((c) => ({ c, score: scoreCatalog(c, signals) }))
        .sort((a, b) => b.score - a.score);

    const chosen: CatalogQuest[] = [];
    const usedTags = new Set<string>();

    for (const row of scored) {
        if (chosen.length >= 3) break;
        const tags = row.c.tags ?? [];

        // diversity: avoid 3 of the same tag
        const overlap = tags.filter((t) => usedTags.has(t)).length;
        if (chosen.length >= 1 && overlap >= 2) continue;

        chosen.push(row.c);
        tags.forEach((t) => usedTags.add(t));
    }

    // Fallback if diversity filtered too hard
    while (chosen.length < 3 && scored[chosen.length]) chosen.push(scored[chosen.length].c);

    // Parametrize targets based on signals
    return chosen.map((q) => {
        let n = q.base_target;

        if (q.quest_key === "complete_n_tasks") {
            n = clamp(Math.ceil(signals.open_total / 10), 2, 6); // 2..6 depending on backlog
        }
        if (q.quest_key === "clear_overdue") {
            n = clamp(signals.overdue_open >= 5 ? 2 : 1, 1, 2);
        }
        if (q.quest_key === "due_soon") {
            n = clamp(signals.due_24h_open >= 5 ? 2 : 1, 1, 2);
        }

        const title = fmt(q.title, { n });
        const desc = fmt(q.description, { n });

        return {
            quest_key: q.quest_key,
            title,
            description: desc,
            target: n,
            reward_xp: q.base_reward_xp,
            meta: {
                ...(q.meta ?? {}),
                algo: ALGO_VERSION,
                why: signals.why_map?.[q.quest_key] ?? null,
                evidence: signals.evidence ?? {},
                params: { n },
            },
        };
    });
}

async function maybeAiRerank(seeds: Seed[], signals: any): Promise<Seed[]> {
    if (!openai) return seeds;

    // Very small, safe rerank: keep same 3, just reorder (no hallucinated new quests)
    try {
        const system = [
            "You are Pulse quest strategist.",
            "Reorder the 3 quests to maximize likelihood of completion and impact today.",
            "Return STRICT JSON: { order: [quest_key1, quest_key2, quest_key3], rationale: string }",
            "Do not introduce new keys or quests.",
        ].join("\n");

        const user = JSON.stringify({ signals, quests: seeds.map((s) => ({ quest_key: s.quest_key, title: s.title })) });

        const resp = await withTimeout(
            openai.chat.completions.create({
                model: "gpt-4o-mini",
                temperature: 0.2,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user },
                ],
                response_format: { type: "json_object" },
            }),
            6000,
            "openai_timeout"
        );

        const raw = resp.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(raw);
        const order: string[] = Array.isArray(parsed.order) ? parsed.order : [];

        const map = new Map(seeds.map((s) => [s.quest_key, s]));
        const reranked: Seed[] = [];
        for (const k of order) {
            const item = map.get(k);
            if (item) reranked.push(item);
        }
        // append any missing
        for (const s of seeds) if (!reranked.find((x) => x.quest_key === s.quest_key)) reranked.push(s);

        // stamp rationale into meta
        reranked[0] = {
            ...reranked[0],
            meta: { ...(reranked[0].meta ?? {}), ai_rationale: typeof parsed.rationale === "string" ? parsed.rationale : null },
        };

        return reranked.slice(0, 3);
    } catch {
        return seeds;
    }
}

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    try {
        await rateLimitOrThrow(userId, "quests.today");
    } catch (e: any) {
        return jsonError(429, "rate_limited", "Too many quest refreshes", { retry_in_ms: e?.retry_in_ms ?? 0 });
    }

    const day = utcDay();
    const dayStart = isoDayStart(day);
    const dayEnd = isoDayEnd(day);

    // ---- Signals from canonical sources (tasks/xp/user_prefs) ----
    const nowIso = new Date().toISOString();
    const next24Iso = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const [
        { data: openTasks, error: openErr },
        { data: completedToday, error: compErr },
        { data: focus7d, error: focusErr },
        { data: catalog, error: catErr },
    ] = await Promise.all([
        supabaseAdmin
            .from("tasks")
            .select("id,status,priority,context,due_at,defer_until")
            .eq("user_id", userId)
            .in("status", ["pending", "active", "blocked"]),

        supabaseAdmin
            .from("tasks")
            .select("id,completed_at,due_at")
            .eq("user_id", userId)
            .eq("status", "completed")
            .gte("completed_at", dayStart)
            .lt("completed_at", dayEnd),

        supabaseAdmin
            .from("xp_events")
            .select("id,occurred_at,event_type")
            .eq("user_id", userId)
            .eq("event_type", "focus_complete")
            .gte("occurred_at", sevenDaysAgoIso),

        supabaseAdmin
            .from("quest_catalog")
            .select("quest_key,title,description,base_target,base_reward_xp,meta,tags,is_active")
            .eq("is_active", true),
    ]);

    if (openErr) return NextResponse.json({ error: "signals_failed", detail: openErr.message }, { status: 500 });
    if (compErr) return NextResponse.json({ error: "signals_failed", detail: compErr.message }, { status: 500 });
    if (focusErr) return NextResponse.json({ error: "signals_failed", detail: focusErr.message }, { status: 500 });
    if (catErr) return NextResponse.json({ error: "catalog_failed", detail: catErr.message }, { status: 500 });

    const open = openTasks ?? [];
    const overdue_open = open.filter((t: any) => t.due_at && t.due_at <= nowIso).length;
    const due_24h_open = open.filter((t: any) => t.due_at && t.due_at > nowIso && t.due_at <= next24Iso).length;
    const high_priority_open = open.filter((t: any) => typeof t.priority === "number" && t.priority >= 5).length;

    const ctx_open_work = open.filter((t: any) => (t.context ?? "").toLowerCase() === "work").length;
    const ctx_open_personal = open.filter((t: any) => (t.context ?? "").toLowerCase() === "personal").length;

    const open_total = open.length;
    const completed_today = (completedToday ?? []).length;
    const focus_completions_7d = (focus7d ?? []).length;

    const signals = {
        open_total,
        overdue_open,
        due_24h_open,
        high_priority_open,
        ctx_open_work,
        ctx_open_personal,
        completed_today,
        focus_completions_7d,
        evidence: {
            open_total,
            overdue_open,
            due_24h_open,
            high_priority_open,
            ctx_open_work,
            ctx_open_personal,
        },
        why_map: {
            clear_overdue: overdue_open > 0 ? `You have ${overdue_open} overdue open task(s).` : "Overdue pressure is low today.",
            due_soon: due_24h_open > 0 ? `You have ${due_24h_open} task(s) due within 24h.` : "No urgent due dates detected.",
            complete_high_priority: high_priority_open > 0 ? `You have ${high_priority_open} high-priority open task(s).` : "No high-priority backlog detected.",
            focus_finish: focus_completions_7d === 0 ? "You haven’t completed a Focus task recently." : "Keep Focus momentum going.",
            complete_n_tasks: `You have ${open_total} open task(s) — convert inventory into wins.`,
            touch_context_work: `Work open: ${ctx_open_work}.`,
            touch_context_personal: `Personal open: ${ctx_open_personal}.`,
        },
    };

    const activeCatalog: CatalogQuest[] = (catalog ?? []).map((c: any) => ({
        quest_key: c.quest_key,
        title: c.title,
        description: c.description,
        base_target: c.base_target,
        base_reward_xp: c.base_reward_xp,
        meta: c.meta ?? {},
        tags: c.tags ?? [],
    }));

    // ---- Build personalized seeds (deterministic) + optional AI reorder ----
    let seeds = buildSeedsFromTop(activeCatalog, signals);
    seeds = await maybeAiRerank(seeds, signals);

    // ---- Upsert quests for today (idempotent) ----
    const upserts = seeds.map((s) => ({
        user_id: userId,
        quest_date: day,
        quest_key: s.quest_key,
        title: s.title,
        description: s.description,
        target: s.target,
        reward_xp: s.reward_xp,
        meta: s.meta ?? {},
    }));

    const { error: upsertErr } = await supabaseAdmin
        .from("daily_quests")
        .upsert(upserts, { onConflict: "user_id,quest_date,quest_key" });

    if (upsertErr) return NextResponse.json({ error: "quest_seed_failed", detail: upsertErr.message }, { status: 500 });

    // Audit run (best effort; don’t fail the endpoint if audit insert fails)
    await supabaseAdmin.from("daily_quest_generation_runs").insert({
        user_id: userId,
        quest_date: day,
        algo_version: ALGO_VERSION,
        signals,
        selections: seeds.map((s) => ({ quest_key: s.quest_key, target: s.target, reward_xp: s.reward_xp })),
    });

    // ---- Power Move: Canonical Evaluation via RPC ----
    const { data: evaluated, error: evalErr } = await supabaseAdmin.rpc("evaluate_daily_quests", {
        p_user_id: userId,
        p_quest_date: day,
    });

    if (evalErr) {
        return NextResponse.json({ error: "quest_eval_failed", detail: evalErr.message }, { status: 500 });
    }

    return NextResponse.json({ day, algo: ALGO_VERSION, quests: evaluated ?? [], signals });
}

