"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdvancementPage() {
  const [jobModel, setJobModel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'plan' | 'skills' | 'milestones'>('plan');
  const [timeframe, setTimeframe] = useState(12);
  const [plan, setPlan] = useState<any>(null);
  const [skills, setSkills] = useState<any>(null);
  const [milestones, setMilestones] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { loadJobModel(); }, []);

  async function loadJobModel() {
    const res = await fetch('/api/career/job-model');
    const data = await res.json();
    if (data.ok && data.jobModel) setJobModel(data.jobModel);
    setLoading(false);
  }

  async function generate(action: string) {
    setGenerating(true);
    const res = await fetch('/api/career/advancement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, jobModel, timeframe }),
    });
    const data = await res.json();
    if (action === 'plan') setPlan(data.plan);
    if (action === 'skills') setSkills(data.skills);
    if (action === 'milestones') setMilestones(data.milestones);
    setGenerating(false);
  }

  useEffect(() => {
    if (jobModel && !plan) generate('plan');
  }, [jobModel]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/career-coach" className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-white font-semibold">📈 Advancement Planning</h1>
              <p className="text-xs text-zinc-500">{jobModel?.seniorityName} → Next Level</p>
            </div>
          </div>
          
          <div className="flex gap-2 mb-4">
            {[6, 12, 18, 24].map((m) => (
              <button
                key={m}
                onClick={() => { setTimeframe(m); setPlan(null); setSkills(null); setMilestones(null); }}
                className={`px-3 py-1 rounded-lg text-sm ${timeframe === m ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}
              >
                {m}mo
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            {(['plan', 'skills', 'milestones'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  if (t === 'skills' && !skills) generate('skills');
                  if (t === 'milestones' && !milestones) generate('milestones');
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  tab === t ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {t === 'plan' ? '🎯 Plan' : t === 'skills' ? '📊 Skills' : '📅 Milestones'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {generating ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-zinc-400">Generating your {tab}...</p>
          </div>
        ) : tab === 'plan' && plan ? (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-300">{plan.summary}</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <h3 className="text-amber-400 font-medium mb-2">🎯 Key Skills to Build</h3>
              {plan.keySkills?.map((s: string, i: number) => <p key={i} className="text-zinc-300">• {s}</p>)}
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
              <h3 className="text-cyan-400 font-medium mb-2">💼 Experiences to Seek</h3>
              {plan.experiences?.map((e: string, i: number) => <p key={i} className="text-zinc-300">• {e}</p>)}
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <h3 className="text-green-400 font-medium mb-2">⚡ Quick Wins (30 days)</h3>
              {plan.quickWins?.map((w: string, i: number) => <p key={i} className="text-zinc-300">• {w}</p>)}
            </div>
            <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
              <h3 className="text-violet-400 font-medium mb-2">🤝 Relationships to Build</h3>
              {plan.relationships?.map((r: string, i: number) => <p key={i} className="text-zinc-300">• {r}</p>)}
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <h3 className="text-red-400 font-medium mb-2">⚠️ Risks to Watch</h3>
              {plan.risks?.map((r: string, i: number) => <p key={i} className="text-zinc-300">• {r}</p>)}
            </div>
          </div>
        ) : tab === 'skills' && skills ? (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <h3 className="text-green-400 font-medium mb-2">✓ Current Strengths</h3>
              {skills.current?.map((s: any, i: number) => (
                <div key={i} className="flex justify-between text-zinc-300 text-sm py-1">
                  <span>{s.skill}</span>
                  <span className={s.level === 'strong' ? 'text-green-400' : s.level === 'moderate' ? 'text-amber-400' : 'text-zinc-500'}>
                    {s.level}
                  </span>
                </div>
              ))}
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <h3 className="text-amber-400 font-medium mb-2">📈 Skill Gaps</h3>
              {skills.gaps?.map((g: any, i: number) => (
                <div key={i} className="py-2 border-b border-zinc-800 last:border-0">
                  <div className="flex justify-between">
                    <span className="text-white">{g.skill}</span>
                    <span className={g.importance === 'critical' ? 'text-red-400 text-xs' : g.importance === 'important' ? 'text-amber-400 text-xs' : 'text-zinc-500 text-xs'}>
                      {g.importance}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm">{g.howToAcquire}</p>
                </div>
              ))}
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
              <h3 className="text-cyan-400 font-medium mb-2">🎯 Priority Order</h3>
              {skills.priority?.map((p: string, i: number) => (
                <p key={i} className="text-zinc-300">
                  <span className="text-cyan-400 mr-2">{i + 1}.</span>{p}
                </p>
              ))}
            </div>
          </div>
        ) : tab === 'milestones' && milestones ? (
          <div className="space-y-4">
            {milestones.milestones?.map((m: any, i: number) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-amber-400 font-bold">{m.quarter}</span>
                  <span className="text-zinc-500 text-sm">{m.theme}</span>
                </div>
                {m.goals?.map((g: string, j: number) => <p key={j} className="text-zinc-300 text-sm">• {g}</p>)}
                <p className="text-cyan-400 text-xs mt-2 italic">Check: {m.checkpoint}</p>
              </div>
            ))}
            <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
              <h3 className="text-violet-400 font-medium mb-2">📆 Weekly Habits</h3>
              {milestones.weeklyHabits?.map((h: string, i: number) => <p key={i} className="text-zinc-300 text-sm">• {h}</p>)}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-zinc-500">Loading...</div>
        )}
      </main>
    </div>
  );
}
