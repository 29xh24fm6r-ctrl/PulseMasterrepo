"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Category { id: string; label: string; icon: string; description: string; }
interface Scenario { id: string; title: string; situation: string; otherPerson: string; otherPersonMood: string; yourGoal: string; difficulty: string; }
interface Message { role: 'user' | 'assistant'; content: string; }

export default function RolePlayPage() {
  const [jobModel, setJobModel] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [responding, setResponding] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadInitial(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadInitial() {
    const [jobRes, catRes] = await Promise.all([
      fetch('/api/career/job-model'),
      fetch('/api/career/roleplay?action=categories')
    ]);
    const jobData = await jobRes.json();
    const catData = await catRes.json();
    if (jobData.ok) setJobModel(jobData.jobModel);
    if (catData.ok) setCategories(catData.categories);
    setLoading(false);
  }

  async function selectCategory(category: Category) {
    setSelectedCategory(category);
    if (category.id === 'custom') return;
    
    setGenerating(true);
    const res = await fetch('/api/career/roleplay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate_scenarios', categoryId: category.id, jobModel }),
    });
    const data = await res.json();
    if (data.ok) setScenarios(data.scenarios);
    setGenerating(false);
  }

  async function createCustomScenario() {
    if (!customInput.trim()) return;
    setGenerating(true);
    const res = await fetch('/api/career/roleplay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'custom_scenario', customDescription: customInput, jobModel }),
    });
    const data = await res.json();
    if (data.ok) {
      setSelectedScenario(data.scenario);
      startScenario(data.scenario);
    }
    setGenerating(false);
  }

  async function startScenario(scenario: Scenario) {
    setSelectedScenario(scenario);
    setMessages([]);
    setFeedback(null);
    setResponding(true);
    const res = await fetch('/api/career/roleplay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', scenario }),
    });
    const data = await res.json();
    if (data.ok) setMessages([{ role: 'assistant', content: data.response }]);
    setResponding(false);
  }

  async function sendMessage() {
    if (!input.trim() || !selectedScenario || responding) return;
    const userMsg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user' as const, content: userMsg }];
    setMessages(newMessages);
    setResponding(true);

    const res = await fetch('/api/career/roleplay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'respond', scenario: selectedScenario, messages: newMessages }),
    });
    const data = await res.json();
    if (data.ok) setMessages([...newMessages, { role: 'assistant', content: data.response }]);
    setResponding(false);
  }

  async function getFeedback() {
    if (messages.length < 4) return;
    setResponding(true);
    const res = await fetch('/api/career/roleplay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'feedback', scenario: selectedScenario, messages, jobModel }),
    });
    const data = await res.json();
    if (data.ok) {
      setFeedback(data.feedback);
      // Track completed roleplay session
      fetch('/api/career/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'roleplay' }),
      }).catch(() => {}); // Fire and forget
    }
    setResponding(false);
  }

  function goBack() {
    if (feedback) {
      setFeedback(null);
      setMessages([]);
      setSelectedScenario(null);
    } else if (selectedScenario) {
      setSelectedScenario(null);
      setMessages([]);
    } else if (scenarios.length > 0 || selectedCategory?.id === 'custom') {
      setScenarios([]);
      setSelectedCategory(null);
      setCustomInput('');
    }
  }

  function getOtherPersonName(): string {
    if (!selectedScenario) return 'Other Person';
    return selectedScenario.otherPerson.split(',')[0] || 'Other Person';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Step 1: Category Selection
  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <header className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link href="/career-coach" className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-white font-semibold">🎭 Role-Play Practice</h1>
              <p className="text-xs text-zinc-500">Practice real conversations in a safe space</p>
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-zinc-400 mb-6">What type of conversation do you want to practice?</p>
          <div className="grid gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => selectCategory(cat)}
                className="w-full text-left p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-cyan-500/50 transition-all flex items-center gap-4"
              >
                <span className="text-3xl">{cat.icon}</span>
                <div>
                  <h3 className="text-white font-medium">{cat.label.replace(cat.icon, '').trim()}</h3>
                  <p className="text-sm text-zinc-400">{cat.description}</p>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Step 2: Scenario Selection (or Custom Input)
  if (!selectedScenario && !feedback) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <header className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={goBack} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-white font-semibold">{selectedCategory.icon} {selectedCategory.label.replace(selectedCategory.icon, '').trim()}</h1>
              <p className="text-xs text-zinc-500">Choose a scenario or describe your own</p>
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-6">
          {generating ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-zinc-400">Generating scenarios for your role...</p>
            </div>
          ) : selectedCategory.id === 'custom' ? (
            <div className="space-y-4">
              <p className="text-zinc-400">Describe the conversation you want to practice:</p>
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="E.g., 'I need to tell my biggest client that we're raising rates by 50bps' or 'My direct report keeps missing deadlines and I need to address it'"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 min-h-[120px]"
              />
              <button
                onClick={createCustomScenario}
                disabled={!customInput.trim()}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 text-white rounded-xl font-medium"
              >
                Create Scenario →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  onClick={() => startScenario(s)}
                  className="w-full text-left p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-cyan-500/50 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-white font-medium">{s.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      s.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                      s.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>{s.difficulty}</span>
                  </div>
                  <p className="text-sm text-zinc-400 mb-2">{s.situation}</p>
                  <p className="text-xs text-cyan-400">You'll talk to: {s.otherPerson}</p>
                </button>
              ))}
              <button
                onClick={() => setSelectedCategory({ ...selectedCategory, id: 'custom' })}
                className="w-full text-left p-4 bg-zinc-900/50 border border-dashed border-zinc-700 rounded-xl hover:border-zinc-500 transition-all"
              >
                <span className="text-zinc-400">✨ Or describe your own scenario...</span>
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Step 4: Feedback Screen
  if (feedback) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <header className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={goBack} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div>
              <h1 className="text-white font-semibold">Performance Review</h1>
              <p className="text-xs text-zinc-500">{selectedScenario?.title}</p>
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">{feedback.score >= 8 ? '🌟' : feedback.score >= 6 ? '👍' : '💪'}</div>
            <div className="text-4xl font-bold text-white mb-2">{feedback.score}/10</div>
            <div className={`inline-block px-3 py-1 rounded-full text-sm ${feedback.goalAchieved ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {feedback.goalAchieved ? '✓ Goal Achieved' : '→ Goal Partially Met'}
            </div>
            <p className="text-zinc-400 mt-4">{feedback.summary}</p>
          </div>
          
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
            <h3 className="text-violet-400 font-medium mb-2">🎯 Key Moment</h3>
            <p className="text-zinc-300">{feedback.keyMoment}</p>
          </div>
          
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <h3 className="text-green-400 font-medium mb-2">✓ What Worked</h3>
            {feedback.whatWorked?.map((w: string, i: number) => (
              <p key={i} className="text-zinc-300 text-sm">• {w}</p>
            ))}
          </div>
          
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <h3 className="text-amber-400 font-medium mb-2">→ To Improve</h3>
            {feedback.toImprove?.map((t: string, i: number) => (
              <p key={i} className="text-zinc-300 text-sm">• {t}</p>
            ))}
          </div>
          
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
            <h3 className="text-cyan-400 font-medium mb-2">💬 Try This Phrase</h3>
            <p className="text-white italic">"{feedback.alternativePhrase}"</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => { setFeedback(null); setMessages([]); startScenario(selectedScenario!); }}
              className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium"
            >
              Try Again
            </button>
            <button
              onClick={() => { setFeedback(null); setSelectedScenario(null); setMessages([]); }}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium"
            >
              New Scenario
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Step 3: Active Roleplay
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={goBack} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-white font-semibold text-sm">{selectedScenario?.title}</h1>
              <p className="text-xs text-zinc-500">Your goal: {selectedScenario?.yourGoal}</p>
            </div>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
              <span className="text-zinc-400">You ({jobModel?.roleName || 'Yourself'})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-zinc-600"></span>
              <span className="text-zinc-400">{getOtherPersonName()}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                m.role === 'user' 
                  ? 'bg-cyan-600 text-white' 
                  : 'bg-zinc-800 text-zinc-100'
              }`}>
                {m.role === 'assistant' && (
                  <p className="text-xs text-zinc-400 mb-1 font-medium">{getOtherPersonName()}</p>
                )}
                {m.role === 'user' && (
                  <p className="text-xs text-cyan-200 mb-1 font-medium">You</p>
                )}
                <p>{m.content}</p>
              </div>
            </div>
          ))}
          {responding && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                  <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="What do you say?"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
            disabled={responding}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || responding}
            className="px-4 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 text-white rounded-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        
        {messages.length >= 4 && (
          <button
            onClick={getFeedback}
            disabled={responding}
            className="mt-3 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm"
          >
            End & Get Feedback →
          </button>
        )}
      </main>
    </div>
  );
}
