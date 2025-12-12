"use client";

/**
 * Leak Test Tool (Dev Only)
 * Tests if queries properly filter by owner_user_id
 * app/admin/leak-test/page.tsx
 */

import { useState } from "react";

interface TestResult {
  table: string;
  status: "pass" | "fail" | "error";
  message: string;
  rowCount?: number;
}

export default function LeakTestPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  async function runLeakTest() {
    setRunning(true);
    setResults([]);

    const tables = [
      "crm_contacts",
      "crm_organizations",
      "crm_deals",
      "crm_interactions",
      "crm_tasks",
      "tb_nodes",
      "tb_edges",
      "tb_memory_fragments",
      "call_sessions",
      "call_segments",
      "calendar_events_cache",
      "email_threads",
    ];

    const testResults: TestResult[] = [];

    for (const table of tables) {
      try {
        // Attempt to query WITHOUT owner filter (should be blocked by RLS or return 0)
        const res = await fetch(`/api/admin/leak-test?table=${table}`);
        const data = await res.json();

        if (data.ok) {
          const count = data.count || 0;
          // If RLS is working, this should return 0 or be blocked
          // For now, we check if it returns > 0 without owner filter = potential leak
          if (count > 0 && !data.hasOwnerFilter) {
            testResults.push({
              table,
              status: "fail",
              message: `⚠️ Query returned ${count} rows without owner_user_id filter`,
              rowCount: count,
            });
          } else {
            testResults.push({
              table,
              status: "pass",
              message: `✅ Protected (RLS or code filter working)`,
              rowCount: count,
            });
          }
        } else {
          testResults.push({
            table,
            status: "error",
            message: `❌ Error: ${data.error || "Unknown"}`,
          });
        }
      } catch (err: any) {
        testResults.push({
          table,
          status: "error",
          message: `❌ Exception: ${err.message}`,
        });
      }
    }

    setResults(testResults);
    setRunning(false);
  }

  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🔒 Leak Test Tool</h1>
        <p className="text-zinc-400 mb-6">Dev-only tool to verify owner_user_id filtering and RLS</p>

        <button
          onClick={runLeakTest}
          disabled={running}
          className="px-6 py-3 bg-violet-600 hover:bg-violet-700 rounded-lg font-semibold disabled:opacity-50 mb-6"
        >
          {running ? "Running tests..." : "Run Leak Test"}
        </button>

        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex gap-4 text-sm">
              <div className="text-emerald-400">✅ Pass: {passCount}</div>
              <div className="text-red-400">⚠️ Fail: {failCount}</div>
              <div className="text-yellow-400">❌ Error: {errorCount}</div>
            </div>

            <div className="space-y-2">
              {results.map((result) => (
                <div
                  key={result.table}
                  className={`p-4 rounded-lg border ${
                    result.status === "pass"
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : result.status === "fail"
                      ? "border-red-500/30 bg-red-500/10"
                      : "border-yellow-500/30 bg-yellow-500/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-sm">{result.table}</div>
                    <div className="text-xs text-zinc-400">{result.message}</div>
                  </div>
                  {result.rowCount !== undefined && (
                    <div className="text-xs text-zinc-500 mt-1">Row count: {result.rowCount}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

