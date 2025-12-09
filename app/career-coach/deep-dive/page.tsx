"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Question { id: string; question: string; options: { id: string; label: string; icon?: string }[]; category: string; }

export default function DeepDivePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const jobRes = await fetch('/api/career/job-model');
      const jobData = await jobRes.json();
      if (!jobData.ok || !jobData.jobModel) { router.push('/career-coach'); return; }
      const qRes = await fetch(`/api/career/deep-dive?function=${jobData.jobModel.functionId || 'default'}`);
      const qData = await qRes.json();
      if (qData.ok) setQuestions(qData.questions);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function select(optionId: string) {
    const q = questions[currentIndex];
    if (!q) return;
    setSelected(optionId);
    const newAnswers = { ...answers, [q.id]: optionId };
    setAnswers(newAnswers);
    setTimeout(() => {
      if (currentIndex < questions.length - 1) { setCurrentIndex(currentIndex + 1); setSelected(null); }
      else { finish(newAnswers); }
    }, 250);
  }

  async function finish(finalAnswers: Record<string, string>) {
    setSaving(true);
    try {
      const res = await fetch('/api/career/deep-dive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', answers: finalAnswers }) });
      const data = await res.json();
      if (data.ok) {
        await fetch('/api/career/job-model', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', updates: { deepDiveInsights: data.insights, deepDiveAnswers: finalAnswers, dataSource: { intake: true, deepDive: true, secondBrain: false, userCorrections: 0 }, confidenceScore: 0.95 } }) });
        router.push('/career-coach');
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  if (loading || saving) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="text-center"><div className="animate-spin h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" /><p className="text-zinc-400">{saving ? 'Saving...' : 'Loading...'}</p></div></div>;

  const q = questions[currentIndex];
  const progress = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {currentIndex > 0 ? <button onClick={() => { setCurrentIndex(currentIndex - 1); setSelected(null); }} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button> : <Link href="/career-coach" className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></Link>}
              <span className="text-zinc-400 text-sm">{currentIndex + 1} of {questions.length}</span>
            </div>
            <span className="text-xs px-2 py-1 bg-zinc-800 text-zinc-400 rounded-full">{q?.category}</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-300" style={{ width: `${progress}%` }} /></div>
        </div>
      </header>
      <main className="flex-1 flex flex-col justify-center px-4 py-8">
        <div className="max-w-lg mx-auto w-full">
          {q && (<><h1 className="text-2xl font-bold text-white text-center mb-8">{q.question}</h1><div className="space-y-3">{q.options.map((o) => (<button key={o.id} onClick={() => select(o.id)} className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${selected === o.id ? 'bg-violet-500/20 border-violet-500 scale-[1.02]' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800'}`}>{o.icon && <span className="text-2xl">{o.icon}</span>}<span className={`text-lg ${selected === o.id ? 'text-white' : 'text-zinc-300'}`}>{o.label}</span>{selected === o.id && <span className="ml-auto text-violet-400"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></span>}</button>))}</div></>)}
        </div>
      </main>
      {currentIndex >= 3 && <footer className="border-t border-zinc-800 bg-zinc-900/50 py-4"><div className="max-w-lg mx-auto px-4 text-center"><button onClick={() => finish(answers)} className="text-zinc-500 hover:text-zinc-300 text-sm">Skip remaining →</button></div></footer>}
    </div>
  );
}
