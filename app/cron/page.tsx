"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Clock, Sun, Calendar, BarChart3, Play, CheckCircle, 
  XCircle, Loader2, RefreshCw, ArrowLeft 
} from "lucide-react";

type CronJob = {
  id: string;
  name: string;
  description: string;
  schedule: string;
  endpoint: string;
  icon: React.ReactNode;
};

const CRON_JOBS: CronJob[] = [
  {
    id: "morning",
    name: "Morning Briefing",
    description: "Generate AI-powered daily briefing with tasks, deals, and priorities",
    schedule: "7:00 AM daily",
    endpoint: "/api/cron/morning",
    icon: <Sun className="w-5 h-5 text-amber-400" />,
  },
  {
    id: "daily-noon",
    name: "Midday Scan",
    description: "Check for overdue tasks, streak risks, stale deals, cold relationships",
    schedule: "12:00 PM daily",
    endpoint: "/api/cron/daily",
    icon: <Clock className="w-5 h-5 text-blue-400" />,
  },
  {
    id: "daily-evening",
    name: "Evening Scan",
    description: "Final check for streak risks before end of day",
    schedule: "6:00 PM daily",
    endpoint: "/api/cron/daily",
    icon: <Clock className="w-5 h-5 text-purple-400" />,
  },
  {
    id: "weekly",
    name: "Weekly Review",
    description: "Generate weekly summary with XP, tasks, deals, and habits analysis",
    schedule: "Sunday 6:00 PM",
    endpoint: "/api/cron/weekly",
    icon: <Calendar className="w-5 h-5 text-green-400" />,
  },
];

export default function CronPage() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function runCronJob(job: CronJob) {
    setLoading((prev) => ({ ...prev, [job.id]: true }));
    setResults((prev) => ({ ...prev, [job.id]: null }));

    try {
      const res = await fetch(job.endpoint);
      const data = await res.json();
      setResults((prev) => ({ ...prev, [job.id]: { ok: data.ok !== false, data } }));
    } catch (err: any) {
      setResults((prev) => ({ ...prev, [job.id]: { ok: false, error: err.message } }));
    } finally {
      setLoading((prev) => ({ ...prev, [job.id]: false }));
    }
  }

  async function runAllJobs() {
    for (const job of CRON_JOBS) {
      await runCronJob(job);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Clock className="w-6 h-6 text-purple-400" />
                Cron Jobs
              </h1>
              <p className="text-sm text-slate-400">Automated background tasks</p>
            </div>
          </div>
          
          <button
            onClick={runAllJobs}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
          >
            <Play className="w-4 h-4" />
            Run All
          </button>
        </header>

        {/* Info Card */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <h3 className="font-semibold text-blue-400 mb-2">How Cron Jobs Work</h3>
          <p className="text-sm text-slate-300">
            These jobs run automatically on Vercel at the scheduled times. You can also trigger them 
            manually here for testing. When deployed, they'll run in the background without any action needed.
          </p>
        </div>

        {/* Cron Jobs List */}
        <div className="space-y-4">
          {CRON_JOBS.map((job) => (
            <div
              key={job.id}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-700/50">
                    {job.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{job.name}</h3>
                    <p className="text-sm text-slate-400">{job.description}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => runCronJob(job)}
                  disabled={loading[job.id]}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading[job.id] ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Run Now
                </button>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-4 h-4" />
                  {job.schedule}
                </div>
                <div className="text-slate-600">
                  {job.endpoint}
                </div>
              </div>

              {/* Results */}
              {results[job.id] && (
                <div className={`mt-4 p-3 rounded-lg ${
                  results[job.id].ok 
                    ? "bg-green-500/10 border border-green-500/30" 
                    : "bg-red-500/10 border border-red-500/30"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {results[job.id].ok ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className={results[job.id].ok ? "text-green-400" : "text-red-400"}>
                      {results[job.id].ok ? "Success" : "Failed"}
                    </span>
                  </div>
                  
                  {results[job.id].ok && results[job.id].data && (
                    <div className="text-sm text-slate-300 space-y-1">
                      {/* Morning Brief */}
                      {results[job.id].data.aiBrief && (
                        <p className="italic">"{results[job.id].data.aiBrief}"</p>
                      )}
                      
                      {/* Daily Scan Summary */}
                      {results[job.id].data.summary && !results[job.id].data.stats && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <div className="bg-slate-800 rounded p-2 text-center">
                            <div className="text-lg font-bold text-red-400">
                              {results[job.id].data.summary.high}
                            </div>
                            <div className="text-xs text-slate-500">High Priority</div>
                          </div>
                          <div className="bg-slate-800 rounded p-2 text-center">
                            <div className="text-lg font-bold text-yellow-400">
                              {results[job.id].data.summary.medium}
                            </div>
                            <div className="text-xs text-slate-500">Medium</div>
                          </div>
                          <div className="bg-slate-800 rounded p-2 text-center">
                            <div className="text-lg font-bold text-green-400">
                              {results[job.id].data.summary.low}
                            </div>
                            <div className="text-xs text-slate-500">Low</div>
                          </div>
                        </div>
                      )}

                      {/* Weekly Review Stats */}
                      {results[job.id].data.stats && (
                        <>
                          {results[job.id].data.aiSummary && (
                            <p className="italic mb-2">"{results[job.id].data.aiSummary}"</p>
                          )}
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            <div className="bg-slate-800 rounded p-2 text-center">
                              <div className="text-lg font-bold text-blue-400">
                                {results[job.id].data.stats.tasksCompleted}
                              </div>
                              <div className="text-xs text-slate-500">Tasks Done</div>
                            </div>
                            <div className="bg-slate-800 rounded p-2 text-center">
                              <div className="text-lg font-bold text-green-400">
                                {results[job.id].data.stats.dealsWon}
                              </div>
                              <div className="text-xs text-slate-500">Deals Won</div>
                            </div>
                            <div className="bg-slate-800 rounded p-2 text-center">
                              <div className="text-lg font-bold text-purple-400">
                                {results[job.id].data.stats.totalXP}
                              </div>
                              <div className="text-xs text-slate-500">XP Earned</div>
                            </div>
                            <div className="bg-slate-800 rounded p-2 text-center">
                              <div className="text-lg font-bold text-amber-400">
                                {results[job.id].data.stats.journalEntries}
                              </div>
                              <div className="text-xs text-slate-500">Journal</div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  
                  {results[job.id].error && (
                    <p className="text-sm text-red-300">{results[job.id].error}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Setup Instructions */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Vercel Deployment Setup
          </h3>
          
          <div className="space-y-3 text-sm text-slate-300">
            <p>
              <strong>1.</strong> Add <code className="bg-slate-700 px-1 rounded">vercel.json</code> to your project root
            </p>
            <p>
              <strong>2.</strong> Add <code className="bg-slate-700 px-1 rounded">CRON_SECRET</code> environment variable in Vercel dashboard
            </p>
            <p>
              <strong>3.</strong> Deploy to Vercel - cron jobs will run automatically at scheduled times
            </p>
            <p className="text-slate-500 mt-2">
              Note: Vercel cron jobs are available on Pro and Enterprise plans. On Hobby plan, 
              you can trigger these endpoints manually or via an external scheduler.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
