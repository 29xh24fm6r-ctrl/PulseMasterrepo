"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, Shield, Lock } from "lucide-react";

type AnalyticsData = {
  pageViews: { feature_id: string; feature_name: string; count: number }[];
  apiCalls: { feature_id: string; feature_name: string; count: number }[];
  gateBlocks: { feature_id: string; feature_name: string; count: number; reason: string }[];
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/ops/analytics", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-zinc-500 py-12">Failed to load analytics data.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-violet-500/20 to-pink-500/20 rounded-xl">
            <TrendingUp className="w-7 h-7 text-violet-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-zinc-400">Last 24 hours of product usage and gate blocks</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <div className="text-sm text-zinc-400 mb-1">Page Views</div>
            <div className="text-2xl font-bold">{data.pageViews.reduce((sum, x) => sum + x.count, 0)}</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <div className="text-sm text-zinc-400 mb-1">API Calls</div>
            <div className="text-2xl font-bold">{data.apiCalls.reduce((sum, x) => sum + x.count, 0)}</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <div className="text-sm text-zinc-400 mb-1">Gate Blocks</div>
            <div className="text-2xl font-bold">{data.gateBlocks.reduce((sum, x) => sum + x.count, 0)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Page Views */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold">Page Views (Last 24h)</h2>
            </div>
            <div className="space-y-2">
              {data.pageViews.length > 0 ? (
                data.pageViews.map((item) => (
                  <div key={item.feature_id} className="flex items-center justify-between p-2 bg-zinc-950/30 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">{item.feature_name || item.feature_id}</div>
                    </div>
                    <div className="text-sm text-zinc-400">{item.count}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-zinc-500 text-center py-4">No page views in last 24h</div>
              )}
            </div>
          </div>

          {/* API Calls */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold">API Calls (Last 24h)</h2>
            </div>
            <div className="space-y-2">
              {data.apiCalls.length > 0 ? (
                data.apiCalls.map((item) => (
                  <div key={item.feature_id} className="flex items-center justify-between p-2 bg-zinc-950/30 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">{item.feature_name || item.feature_id}</div>
                    </div>
                    <div className="text-sm text-zinc-400">{item.count}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-zinc-500 text-center py-4">No API calls in last 24h</div>
              )}
            </div>
          </div>
        </div>

        {/* Gate Blocks */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold">Gate Blocks (Last 24h)</h2>
          </div>
          <div className="space-y-2">
            {data.gateBlocks.length > 0 ? (
              data.gateBlocks.map((item) => (
                <div key={item.feature_id} className="flex items-center justify-between p-2 bg-zinc-950/30 rounded-lg">
                  <div>
                    <div className="text-sm font-medium">{item.feature_name || item.feature_id}</div>
                    <div className="text-xs text-zinc-500">{item.reason}</div>
                  </div>
                  <div className="text-sm text-amber-400">{item.count}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-500 text-center py-4">No gate blocks in last 24h</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

