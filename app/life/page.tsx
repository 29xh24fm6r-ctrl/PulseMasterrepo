"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Brain, Heart, Target, Sparkles, TrendingUp, BookOpen, Zap, Shield, ChevronRight, Loader2, Play, Calendar, BarChart3 } from "lucide-react";

export default function LifeIntelligencePage() {
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "simulation" | "longitudinal" | "identity">("overview");
  const [whatIfQuestion, setWhatIfQuestion] = useState("");
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);
  const [currentChapter, setCurrentChapter] = useState<any>(null);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [emotionState, setEmotionState] = useState<any>(null);

  useEffect(() => { loadData(); }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    try {
      const chapterRes = await fetch("/api/longitudinal?type=chapter");
      const chapterData = await chapterRes.json();
      if (chapterData.chapter) setCurrentChapter(chapterData.chapter);
    } catch (e) { console.error(e); }
  };

  const runWhatIf = async () => {
    if (!whatIfQuestion.trim()) return;
    setSimulating(true);
    try {
      const res = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "what-if", question: whatIfQuestion })
      });
      const data = await res.json();
      if (data.analysis) setWhatIfResult(data.analysis);
    } catch (e) { console.error(e); }
    setSimulating(false);
  };

  const startNewChapter = async () => {
    if (!newChapterTitle.trim()) return;
    try {
      const res = await fetch("/api/longitudinal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start-chapter", title: newChapterTitle })
      });
      const data = await res.json();
      if (data.chapter) { setCurrentChapter(data.chapter); setNewChapterTitle(""); }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">Life Intelligence</h1>
          <p className="text-slate-400 mt-2">Deep insights into your life patterns, decisions, and growth</p>
        </div>

        <div className="flex gap-2 mb-8 bg-slate-800/50 p-1 rounded-xl w-fit">
          {[{ id: "overview", label: "Overview", icon: BarChart3 }, { id: "simulation", label: "Simulation", icon: Sparkles }, { id: "longitudinal", label: "Life Story", icon: BookOpen }, { id: "identity", label: "Identity", icon: Target }].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === tab.id ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white" : "text-slate-400 hover:text-white"}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-purple-500/20 rounded-lg"><BookOpen className="w-5 h-5 text-purple-400" /></div><h3 className="font-semibold">Life Chapter</h3></div>
              {currentChapter ? <p className="text-xl font-bold text-purple-300">{currentChapter.chapter_title}</p> : <button onClick={() => setActiveTab("longitudinal")} className="text-purple-400">Start your story →</button>}
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-orange-500/20 rounded-lg"><Sparkles className="w-5 h-5 text-orange-400" /></div><h3 className="font-semibold">Quick Simulation</h3></div>
              <button onClick={() => setActiveTab("simulation")} className="w-full py-3 bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-lg text-orange-300">Ask "What If..." →</button>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-blue-500/20 rounded-lg"><Shield className="w-5 h-5 text-blue-400" /></div><h3 className="font-semibold">Secure Vault</h3></div>
              <p className="text-slate-400 text-sm">End-to-end encrypted storage</p>
            </div>
          </div>
        )}

        {activeTab === "simulation" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-orange-400" />What If...?</h3>
              <textarea value={whatIfQuestion} onChange={(e) => setWhatIfQuestion(e.target.value)} placeholder="What if I quit my job?" className="w-full h-32 bg-slate-900/50 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-500 resize-none" />
              <button onClick={runWhatIf} disabled={simulating || !whatIfQuestion.trim()} className="mt-4 w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {simulating ? <><Loader2 className="w-4 h-4 animate-spin" />Simulating...</> : <><Play className="w-4 h-4" />Run Simulation</>}
              </button>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-bold mb-4">Results</h3>
              {whatIfResult ? (
                <div className="space-y-4">
                  <div className="bg-slate-900/50 rounded-lg p-4"><span className="text-xs text-purple-400 uppercase">Category</span><p className="font-semibold capitalize">{whatIfResult.category}</p></div>
                  <div className="bg-slate-900/50 rounded-lg p-4"><span className="text-xs text-blue-400 uppercase">Key Factors</span><ul className="mt-2">{whatIfResult.key_factors?.map((f: string, i: number) => <li key={i} className="text-sm flex gap-2"><ChevronRight className="w-4 h-4 text-blue-400" />{f}</li>)}</ul></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-500/10 rounded-lg p-4"><span className="text-xs text-red-400 uppercase">Risks</span><ul className="mt-2">{whatIfResult.risks?.map((r: string, i: number) => <li key={i} className="text-sm text-red-300">{r}</li>)}</ul></div>
                    <div className="bg-green-500/10 rounded-lg p-4"><span className="text-xs text-green-400 uppercase">Benefits</span><ul className="mt-2">{whatIfResult.benefits?.map((b: string, i: number) => <li key={i} className="text-sm text-green-300">{b}</li>)}</ul></div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-4"><span className="text-xs text-purple-300 uppercase">Recommendation</span><p className="mt-2">{whatIfResult.recommendation}</p></div>
                </div>
              ) : <div className="h-64 flex items-center justify-center text-slate-500"><Sparkles className="w-12 h-12 opacity-30" /></div>}
            </div>
          </div>
        )}

        {activeTab === "longitudinal" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5 text-purple-400" />Your Life Story</h3>
              {currentChapter ? (
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20">
                  <span className="text-xs text-purple-400 uppercase">Current Chapter</span>
                  <h4 className="text-2xl font-bold mt-1">{currentChapter.chapter_title}</h4>
                  <p className="text-slate-400 mt-2">Focus: {currentChapter.primary_focus || "General"}</p>
                </div>
              ) : (
                <div className="bg-slate-900/50 rounded-xl p-6">
                  <p className="text-slate-400 mb-4">Start a new chapter</p>
                  <input type="text" value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} placeholder="Chapter title..." className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white" />
                  <button onClick={startNewChapter} disabled={!newChapterTitle.trim()} className="mt-3 px-4 py-2 bg-purple-500 rounded-lg disabled:opacity-50">Start Chapter</button>
                </div>
              )}
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h4 className="font-semibold mb-4">Quick Actions</h4>
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-3 bg-slate-900/50 rounded-lg hover:bg-slate-700/50 flex items-center gap-3"><Target className="w-4 h-4 text-green-400" />Record Milestone</button>
                <button className="w-full text-left px-4 py-3 bg-slate-900/50 rounded-lg hover:bg-slate-700/50 flex items-center gap-3"><TrendingUp className="w-4 h-4 text-blue-400" />Update Progress</button>
                <button className="w-full text-left px-4 py-3 bg-slate-900/50 rounded-lg hover:bg-slate-700/50 flex items-center gap-3"><Calendar className="w-4 h-4 text-orange-400" />Generate Snapshot</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "identity" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50"><h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-cyan-400" />Core Values</h3><p className="text-slate-400">Your values guide your decisions.</p></div>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50"><h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" />Strengths</h3><p className="text-slate-400">Understanding your strengths.</p></div>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50"><h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Brain className="w-5 h-5 text-pink-400" />Beliefs</h3><p className="text-slate-400">Your beliefs shape reality.</p></div>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50"><h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-400" />Aspirations</h3><p className="text-slate-400">Who do you want to become?</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
