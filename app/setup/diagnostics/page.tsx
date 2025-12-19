"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

interface Diagnostic {
  name: string;
  category: string;
  status: "pass" | "fail" | "warning" | "checking";
  message: string;
  details?: string;
}

export default function DiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runDiagnostics();
  }, []);

  async function runDiagnostics() {
    setLoading(true);
    const results: Diagnostic[] = [];

    try {
      // 1. Auth Check
      const authRes = await fetch("/api/health/db");
      if (authRes.ok) {
        results.push({
          name: "Authentication",
          category: "Auth",
          status: "pass",
          message: "Clerk user authenticated and Supabase user_id mapped",
        });
      } else {
        results.push({
          name: "Authentication",
          category: "Auth",
          status: "fail",
          message: "Failed to authenticate or resolve user",
          details: await authRes.text(),
        });
      }

      // 2. DB Tables Check
      const dbRes = await fetch("/api/health/db");
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        const requiredTables = ["contacts", "tasks", "deals", "habits", "journal_entries", "job_queue"];
        const missing = requiredTables.filter((t) => !dbData.tables?.[t]?.ok);
        if (missing.length === 0) {
          results.push({
            name: "Database Tables",
            category: "Database",
            status: "pass",
            message: `All required tables accessible: ${requiredTables.join(", ")}`,
          });
        } else {
          results.push({
            name: "Database Tables",
            category: "Database",
            status: "fail",
            message: `Missing or inaccessible tables: ${missing.join(", ")}`,
          });
        }
      } else {
        results.push({
          name: "Database Tables",
          category: "Database",
          status: "warning",
          message: "Could not verify database tables",
        });
      }

      // 3. RLS Check
      const rlsRes = await fetch("/api/health/rls");
      if (rlsRes.ok) {
        const rlsData = await rlsRes.json();
        if (rlsData.ok) {
          results.push({
            name: "Row Level Security",
            category: "Security",
            status: "pass",
            message: "RLS policies present and configured",
          });
        } else {
          results.push({
            name: "Row Level Security",
            category: "Security",
            status: "warning",
            message: "RLS verification skipped or incomplete",
          });
        }
      }

      // 4. Job Queue Check
      const jobRes = await fetch("/api/ops/reliability?scope=system");
      if (jobRes.ok) {
        results.push({
          name: "Job Queue",
          category: "Infrastructure",
          status: "pass",
          message: "Job queue system operational",
        });
      } else {
        results.push({
          name: "Job Queue",
          category: "Infrastructure",
          status: "warning",
          message: "Job queue health check unavailable",
        });
      }

      // 5. Integrations Check
      const integrationsRes = await fetch("/api/integrations/health");
      if (integrationsRes.ok) {
        const integrationsData = await integrationsRes.json();
        const integrations = integrationsData?.integrations || [];
        
        for (const integration of integrations) {
          const status =
            integration.status === "connected"
              ? "pass"
              : integration.status === "needs_reconnect"
              ? "warning"
              : "fail";
          
          results.push({
            name: `${integration.provider.charAt(0).toUpperCase() + integration.provider.slice(1)} Integration`,
            category: "Integrations",
            status,
            message:
              integration.status === "connected"
                ? `Connected${integration.lastSync ? ` (last sync: ${new Date(integration.lastSync).toLocaleString()})` : ""}`
                : integration.status === "needs_reconnect"
                ? "Needs reconnection"
                : "Not configured",
            details: integration.details ? JSON.stringify(integration.details, null, 2) : undefined,
          });
        }
      } else {
        results.push({
          name: "Integrations Health",
          category: "Integrations",
          status: "warning",
          message: "Could not check integration status",
        });
      }
    } catch (err) {
      results.push({
        name: "Diagnostics Runtime",
        category: "System",
        status: "fail",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setDiagnostics(results);
      setLoading(false);
    }
  }

  const byCategory = diagnostics.reduce((acc, d) => {
    if (!acc[d.category]) acc[d.category] = [];
    acc[d.category].push(d);
    return acc;
  }, {} as Record<string, Diagnostic[]>);

  function statusIcon(status: Diagnostic["status"]) {
    if (status === "pass") return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    if (status === "fail") return <XCircle className="w-5 h-5 text-red-400" />;
    if (status === "warning") return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    return <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">System Diagnostics</h1>
            <p className="text-sm text-zinc-400 mt-1">Comprehensive health check for Pulse OS</p>
          </div>
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-800 text-white rounded-lg transition-colors"
          >
            {loading ? "Running..." : "Run Diagnostics"}
          </button>
        </div>

        {/* Results */}
        {loading && diagnostics.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">Running diagnostics...</div>
        ) : (
          Object.entries(byCategory).map(([category, checks]) => (
            <div key={category} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">{category}</h2>
              <div className="space-y-4">
                {checks.map((check, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    {statusIcon(check.status)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-medium">{check.name}</h3>
                        <span className="text-xs text-zinc-500 uppercase">{check.status}</span>
                      </div>
                      <p className="text-sm text-zinc-400 mt-1">{check.message}</p>
                      {check.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-zinc-500 cursor-pointer">Details</summary>
                          <pre className="mt-2 p-2 bg-zinc-950 text-xs text-zinc-300 rounded overflow-auto">
                            {check.details}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Links */}
        <div className="flex gap-4">
          <Link
            href="/admin/scheduler"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            Scheduler Admin
          </Link>
          <Link
            href="/ops/jobs"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            Ops: Jobs
          </Link>
          <Link
            href="/pulse"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            Pulse Hub
          </Link>
        </div>
      </div>
    </div>
  );
}

