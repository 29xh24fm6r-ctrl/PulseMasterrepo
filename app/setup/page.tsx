'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, RefreshCw, Check, Loader2, Zap, AlertCircle } from 'lucide-react';

export default function SetupPage() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function installPack() {
    setLoading('pack');
    try {
      const res = await fetch('/api/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install', packId: 'commercial-lending' }),
      });
      const data = await res.json();
      setResults((r) => ({ ...r, pack: data }));
    } catch (err: any) {
      setResults((r) => ({ ...r, pack: { error: err.message } }));
    } finally {
      setLoading(null);
    }
  }

  async function runCronJob(job: string) {
    setLoading(job);
    try {
      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job }),
      });
      const data = await res.json();
      setResults((r) => ({ ...r, [job]: data }));
    } catch (err: any) {
      setResults((r) => ({ ...r, [job]: { error: err.message } }));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/life" className="p-2 hover:bg-slate-800 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Butler Setup</h1>
            <p className="text-sm text-slate-400">One-click setup actions</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Install Commercial Lending Pack */}
        <section className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-violet-600 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-1">Commercial Lending Pack</h2>
              <p className="text-sm text-slate-400 mb-4">
                Install the Commercial Loan Officer pack with pre-configured workflows, KPIs, and AI teachings for your role.
              </p>
              <button
                onClick={installPack}
                disabled={loading === 'pack'}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg font-medium flex items-center gap-2 transition disabled:opacity-50"
              >
                {loading === 'pack' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : results.pack?.userPack ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Package className="w-4 h-4" />
                )}
                {results.pack?.userPack ? 'Installed!' : 'Install Pack'}
              </button>
              {results.pack && (
                <pre className="mt-3 p-3 bg-slate-800 rounded-lg text-xs overflow-auto max-h-32">
                  {JSON.stringify(results.pack, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </section>

        {/* Cron Jobs */}
        <section className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-orange-600 rounded-lg">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-1">Test Cron Jobs</h2>
              <p className="text-sm text-slate-400">
                Manually trigger scheduled tasks to verify they work.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {[
              { job: 'daily-all', label: 'Run All Daily Jobs', desc: 'Campaigns, notifications, health scores' },
              { job: 'morning-digest', label: 'Morning Digest', desc: 'Send morning briefing' },
              { job: 'evening-digest', label: 'Evening Digest', desc: 'Send evening wrap-up' },
              { job: 'process-campaigns', label: 'Process Campaigns', desc: 'Execute due campaign steps' },
              { job: 'process-notifications', label: 'Process Notifications', desc: 'Batch notification queue' },
              { job: 'relationship-health', label: 'Relationship Health', desc: 'Recalculate health scores' },
              { job: 'detect-patterns', label: 'Detect Patterns', desc: 'AI pattern detection in memory' },
              { job: 'cleanup', label: 'Cleanup', desc: 'Remove expired data' },
            ].map(({ job, label, desc }) => (
              <div key={job} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-slate-500">{desc}</div>
                </div>
                <button
                  onClick={() => runCronJob(job)}
                  disabled={loading === job}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm flex items-center gap-2 transition disabled:opacity-50"
                >
                  {loading === job ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : results[job]?.success ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : results[job]?.error ? (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Run
                </button>
              </div>
            ))}
          </div>

          {Object.keys(results).filter(k => k !== 'pack').length > 0 && (
            <div className="mt-4 p-3 bg-slate-800 rounded-lg">
              <div className="text-xs text-slate-400 mb-2">Results:</div>
              <pre className="text-xs overflow-auto max-h-48">
                {JSON.stringify(
                  Object.fromEntries(Object.entries(results).filter(([k]) => k !== 'pack')),
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </section>

        {/* Quick Links */}
        <section className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/packs" className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-center transition">
              All Packs
            </Link>
            <Link href="/settings/personas" className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-center transition">
              Personas
            </Link>
            <Link href="/settings/teaching" className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-center transition">
              Teach AI
            </Link>
            <Link href="/weekly-plan" className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-center transition">
              Weekly Plan
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}