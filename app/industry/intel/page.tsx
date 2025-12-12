// Industry Intelligence Page
// app/industry/intel/page.tsx

"use client";

import { useState, useEffect } from "react";
import { Building2, TrendingUp, AlertTriangle, Target, Wrench } from "lucide-react";

export default function IndustryIntelPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIntel();
  }, []);

  async function loadIntel() {
    try {
      const res = await fetch("/api/industry/overview");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load intel:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading industry intelligence...</div>
      </div>
    );
  }

  if (!data || !data.intel) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-4xl mx-auto text-center text-zinc-400">
          Industry intelligence not available. Please set your industry in settings.
        </div>
      </div>
    );
  }

  const intel = data.intel;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Industry Intelligence</h1>
            <p className="text-sm text-zinc-400">{data.industryName}</p>
          </div>
        </div>

        {/* Summary */}
        {intel.summary && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Overview</h2>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{intel.summary}</p>
          </div>
        )}

        {/* Key Roles */}
        {intel.key_roles && Array.isArray(intel.key_roles) && intel.key_roles.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-white">Key Roles</h2>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {intel.key_roles.map((role: string, idx: number) => (
                <div key={idx} className="px-3 py-2 bg-zinc-800 rounded-lg text-sm text-zinc-300">
                  {role}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Patterns */}
        {intel.success_patterns && Array.isArray(intel.success_patterns) && intel.success_patterns.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold text-white">Success Patterns</h2>
            </div>
            <ul className="space-y-2">
              {intel.success_patterns.map((pattern: string, idx: number) => (
                <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">•</span>
                  <span>{pattern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risk Patterns */}
        {intel.risk_patterns && Array.isArray(intel.risk_patterns) && intel.risk_patterns.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-semibold text-white">Risk Patterns</h2>
            </div>
            <ul className="space-y-2">
              {intel.risk_patterns.map((risk: string, idx: number) => (
                <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* KPIs */}
        {intel.kpi_definitions && Object.keys(intel.kpi_definitions).length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Key Performance Indicators</h2>
            <div className="space-y-3">
              {Object.entries(intel.kpi_definitions).map(([kpi, desc]: [string, any]) => (
                <div key={kpi} className="border-l-2 border-violet-500 pl-4">
                  <div className="font-medium text-white mb-1">{kpi}</div>
                  <div className="text-sm text-zinc-400">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tool Stack */}
        {intel.tool_stack && Array.isArray(intel.tool_stack) && intel.tool_stack.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Common Tools</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {intel.tool_stack.map((tool: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-zinc-800 rounded-lg text-sm text-zinc-300"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




