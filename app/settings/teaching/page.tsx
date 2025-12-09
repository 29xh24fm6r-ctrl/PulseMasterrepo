'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Brain,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Lightbulb,
  AlertCircle,
  Zap,
  BookOpen,
  MessageSquare,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface Teaching {
  id: string;
  type: string;
  category: string;
  trigger?: string;
  instruction: string;
  priority: number;
  isActive: boolean;
  usageCount: number;
}

interface Feedback {
  id: string;
  rating: string;
  category?: string;
  comment?: string;
  correction?: string;
  createdAt: string;
}

interface Analytics {
  totalTeachings: number;
  byType: Record<string, number>;
  mostUsed: Teaching[];
  feedbackSummary: { positive: number; negative: number; neutral: number };
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; description: string }> = {
  preference: { label: 'Preference', icon: ThumbsUp, color: 'bg-blue-500/20 text-blue-400', description: 'I prefer X over Y' },
  correction: { label: 'Correction', icon: AlertCircle, color: 'bg-red-500/20 text-red-400', description: "Don't do X, do Y instead" },
  shortcut: { label: 'Shortcut', icon: Zap, color: 'bg-yellow-500/20 text-yellow-400', description: 'When I say X, I mean Y' },
  rule: { label: 'Rule', icon: BookOpen, color: 'bg-green-500/20 text-green-400', description: 'Always/Never do X' },
  context: { label: 'Context', icon: Lightbulb, color: 'bg-purple-500/20 text-purple-400', description: 'In situation X, do Y' },
  template: { label: 'Template', icon: MessageSquare, color: 'bg-orange-500/20 text-orange-400', description: 'Use this format for...' },
};

const CATEGORIES = ['communication', 'formatting', 'tone', 'content', 'behavior', 'general'];

export default function TeachingPage() {
  const [teachings, setTeachings] = useState<Teaching[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<'teachings' | 'feedback' | 'analytics'>('teachings');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [teachRes, feedbackRes, analyticsRes] = await Promise.all([
        fetch('/api/teaching?all=true'),
        fetch('/api/teaching?mode=feedback'),
        fetch('/api/teaching?mode=analytics'),
      ]);
      const teachData = await teachRes.json();
      const feedbackData = await feedbackRes.json();
      const analyticsData = await analyticsRes.json();
      setTeachings(teachData.teachings || []);
      setFeedback(feedbackData.feedback || []);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleTeaching(teachingId: string, isActive: boolean) {
    try {
      await fetch('/api/teaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', teachingId, updates: { isActive: !isActive } }),
      });
      loadData();
    } catch (err) {
      console.error('Failed to toggle:', err);
    }
  }

  async function deleteTeaching(teachingId: string) {
    if (!confirm('Delete this teaching?')) return;
    try {
      await fetch('/api/teaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', teachingId }),
      });
      loadData();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }

  async function createTeaching(data: any) {
    try {
      await fetch('/api/teaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setShowAdd(false);
      loadData();
    } catch (err) {
      console.error('Failed to create:', err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/settings" className="p-2 hover:bg-slate-800 rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Teach Pulse</h1>
                <p className="text-sm text-slate-400">Train your AI to work better for you</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg font-medium flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Add Teaching
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1">
            {(['teachings', 'feedback', 'analytics'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab
                    ? 'border-violet-500 text-violet-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Teachings Tab */}
        {activeTab === 'teachings' && (
          <div className="space-y-4">
            {Object.entries(TYPE_CONFIG).map(([type, config]) => {
              const typeTeachings = teachings.filter((t) => t.type === type);
              if (typeTeachings.length === 0) return null;

              return (
                <section key={type}>
                  <h2 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                    <config.icon className="w-4 h-4" />
                    {config.label}s ({typeTeachings.length})
                  </h2>
                  <div className="space-y-2">
                    {typeTeachings.map((teaching) => (
                      <div
                        key={teaching.id}
                        className={`p-4 bg-slate-900 border rounded-xl transition ${
                          teaching.isActive ? 'border-slate-800' : 'border-slate-800/50 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {teaching.trigger && (
                              <div className="text-sm text-slate-500 mb-1">
                                When I say: "{teaching.trigger}"
                              </div>
                            )}
                            <p className="text-slate-200">{teaching.instruction}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                              <span className={`px-2 py-0.5 rounded ${config.color}`}>
                                {config.label}
                              </span>
                              <span>{teaching.category}</span>
                              <span>Used {teaching.usageCount}x</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleTeaching(teaching.id, teaching.isActive)}
                              className="p-1.5 hover:bg-slate-800 rounded-lg transition"
                            >
                              {teaching.isActive ? (
                                <ToggleRight className="w-5 h-5 text-green-400" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-slate-500" />
                              )}
                            </button>
                            <button
                              onClick={() => deleteTeaching(teaching.id)}
                              className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-500 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            {teachings.length === 0 && (
              <div className="text-center py-16">
                <Brain className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No teachings yet</h3>
                <p className="text-slate-400 mb-4">Teach Pulse your preferences and shortcuts</p>
                <button
                  onClick={() => setShowAdd(true)}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg font-medium transition"
                >
                  Add Your First Teaching
                </button>
              </div>
            )}
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <div className="space-y-4">
            {feedback.length > 0 ? (
              feedback.map((f) => (
                <div key={f.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    {f.rating === 'positive' && <ThumbsUp className="w-5 h-5 text-green-400" />}
                    {f.rating === 'negative' && <ThumbsDown className="w-5 h-5 text-red-400" />}
                    <div className="flex-1">
                      {f.comment && <p className="text-slate-300 mb-2">{f.comment}</p>}
                      {f.correction && (
                        <div className="p-2 bg-slate-800/50 rounded text-sm">
                          <span className="text-slate-500">Correction:</span> {f.correction}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-2">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-slate-500">
                No feedback recorded yet
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-2xl font-bold">{analytics.totalTeachings}</div>
                <div className="text-sm text-slate-400">Total Teachings</div>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-2xl font-bold text-green-400">{analytics.feedbackSummary.positive}</div>
                <div className="text-sm text-slate-400">Positive Feedback</div>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-2xl font-bold text-red-400">{analytics.feedbackSummary.negative}</div>
                <div className="text-sm text-slate-400">Negative Feedback</div>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-2xl font-bold text-slate-400">{analytics.feedbackSummary.neutral}</div>
                <div className="text-sm text-slate-400">Neutral</div>
              </div>
            </div>

            {/* By Type */}
            <section>
              <h3 className="font-semibold mb-3">Teachings by Type</h3>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(analytics.byType).map(([type, count]) => (
                  <div key={type} className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <div className="text-lg font-bold">{count}</div>
                    <div className="text-sm text-slate-400 capitalize">{type}s</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Most Used */}
            {analytics.mostUsed.length > 0 && (
              <section>
                <h3 className="font-semibold mb-3">Most Used</h3>
                <div className="space-y-2">
                  {analytics.mostUsed.map((t) => (
                    <div key={t.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                      <span className="text-slate-300 truncate">{t.instruction}</span>
                      <span className="text-sm text-slate-500 ml-4">{t.usageCount}x</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Add Teaching Modal */}
      {showAdd && (
        <AddTeachingModal
          onClose={() => setShowAdd(false)}
          onCreate={createTeaching}
        />
      )}
    </div>
  );
}

function AddTeachingModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: any) => void;
}) {
  const [form, setForm] = useState({
    type: 'preference',
    category: 'general',
    trigger: '',
    instruction: '',
    priority: 5,
  });
  const [creating, setCreating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [naturalInput, setNaturalInput] = useState('');

  async function handleExtract() {
    if (!naturalInput.trim()) return;
    setExtracting(true);
    try {
      const res = await fetch('/api/teaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract', text: naturalInput }),
      });
      const data = await res.json();
      if (data.teaching) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to extract:', err);
    } finally {
      setExtracting(false);
    }
  }

  async function handleCreate() {
    if (!form.instruction.trim()) return;
    setCreating(true);
    await onCreate(form);
    setCreating(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Teach Pulse</h2>

        {/* Natural Language Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Quick Add (Natural Language)</label>
          <textarea
            value={naturalInput}
            onChange={(e) => setNaturalInput(e.target.value)}
            placeholder="e.g., 'Always use bullet points for lists' or 'When I say ASAP, I mean within 2 hours'"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500 h-20 resize-none"
          />
          <button
            onClick={handleExtract}
            disabled={extracting || !naturalInput.trim()}
            className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
          >
            {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
            Extract Teaching
          </button>
        </div>

        <div className="text-center text-slate-500 text-sm mb-6">— or add manually —</div>

        {/* Manual Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
              >
                {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {form.type === 'shortcut' && (
            <div>
              <label className="block text-sm font-medium mb-2">Trigger Phrase</label>
              <input
                type="text"
                value={form.trigger}
                onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                placeholder="When I say..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Instruction</label>
            <textarea
              value={form.instruction}
              onChange={(e) => setForm({ ...form, instruction: e.target.value })}
              placeholder={TYPE_CONFIG[form.type]?.description || 'Enter instruction...'}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500 h-24 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !form.instruction.trim()}
            className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Teaching'}
          </button>
        </div>
      </div>
    </div>
  );
}