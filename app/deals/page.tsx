"use client";

import { useEffect, useState } from "react";
import { getDealsPipeline, updateDealStage, DealStage, Deal } from "@/lib/api/core";

export default function DealsPage() {
  const [stages, setStages] = useState<DealStage[]>([]);
  const [dealsByStage, setDealsByStage] = useState<Record<string, Deal[]>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const res = await getDealsPipeline();
      setStages(res.stages);
      setDealsByStage(res.dealsByStage);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function moveDeal(dealId: string, stage: string) {
    setErr(null);
    try {
      await updateDealStage({ id: dealId, stage });
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to move deal");
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Deals</h1>
        <p className="text-sm opacity-70">Real pipeline API + stage updates.</p>
      </div>

      {err && (
        <div className="border rounded-lg p-3 text-sm">
          <span className="font-medium">Error:</span> {err}
        </div>
      )}

      {loading ? (
        <div className="text-sm opacity-70">Loading…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {stages.map((s) => {
            const list = dealsByStage[s.key] ?? [];
            return (
              <div key={s.id} className="border rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{s.label}</div>
                  <div className="text-xs opacity-60">{list.length}</div>
                </div>

                <div className="space-y-2">
                  {list.length ? (
                    list.map((d) => (
                      <div key={d.id} className="border rounded-lg p-2 space-y-2">
                        <div className="text-sm font-medium">
                          {d.name ?? d.title ?? "Untitled deal"}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {stages
                            .filter((x) => x.key !== s.key)
                            .slice(0, 2)
                            .map((to) => (
                              <button
                                key={to.id}
                                className="border rounded-md px-2 py-1 text-xs"
                                onClick={() => moveDeal(d.id, to.key)}
                              >
                                Move → {to.label}
                              </button>
                            ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm opacity-60">Empty</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
