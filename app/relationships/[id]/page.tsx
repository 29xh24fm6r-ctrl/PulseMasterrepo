'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  MessageSquare,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  Heart,
  Clock,
  TrendingUp,
  TrendingDown,
  Send,
  Video,
  Coffee,
  FileText,
  Sparkles,
} from 'lucide-react';

interface Relationship {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  relationship: string;
  importance: string;
  healthScore: number;
  lastContactAt?: string;
  nextFollowupAt?: string;
  followupCadenceDays: number;
  interactionCount: number;
  notes?: string;
  tags: string[];
}

interface Interaction {
  id: string;
  type: string;
  direction: string;
  subject?: string;
  summary?: string;
  sentiment: string;
  occurredAt: string;
}

const INTERACTION_ICONS: Record<string, any> = {
  email: Mail,
  call: Phone,
  meeting: Video,
  message: MessageSquare,
  note: FileText,
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'text-green-400',
  neutral: 'text-slate-400',
  negative: 'text-red-400',
};

export default function RelationshipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogInteraction, setShowLogInteraction] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [relRes, intRes] = await Promise.all([
        fetch(`/api/relationships/${id}`),
        fetch(`/api/relationships/${id}?mode=interactions`),
      ]);
      const relData = await relRes.json();
      const intData = await intRes.json();
      setRelationship(relData.relationship);
      setInteractions(intData.interactions || []);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }

  async function generateSummary() {
    setGeneratingSummary(true);
    try {
      const res = await fetch(`/api/relationships/${id}?mode=summary`);
      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      console.error('Failed to generate:', err);
    } finally {
      setGeneratingSummary(false);
    }
  }

  async function logInteraction(data: any) {
    try {
      await fetch(`/api/relationships/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setShowLogInteraction(false);
      loadData();
    } catch (err) {
      console.error('Failed to log:', err);
    }
  }

  function getHealthColor(score: number): string {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 30) return 'text-orange-400';
    return 'text-red-400';
  }

  function daysSince(dateStr?: string): number | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!relationship) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500">Relationship not found</p>
      </div>
    );
  }

  const emailLink = relationship.email ? `mailto:${relationship.email}` : null;
  const phoneLink = relationship.phone ? `tel:${relationship.phone}` : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/relationships" className="p-2 hover:bg-slate-800 rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">{relationship.name}</h1>
              <p className="text-sm text-slate-400">
                {relationship.role && `${relationship.role} at `}
                {relationship.company || relationship.relationship}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowLogInteraction(true)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg font-medium flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Log Interaction
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="relative w-20 h-20 mx-auto mb-2">
              <svg className="w-20 h-20 -rotate-90">
                <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-800" />
                <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="6" strokeDasharray={`${relationship.healthScore * 2.2} 220`} className={getHealthColor(relationship.healthScore)} />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${getHealthColor(relationship.healthScore)}`}>
                {relationship.healthScore}
              </span>
            </div>
            <div className="text-center text-sm text-slate-400">Health Score</div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <Clock className="w-6 h-6 text-slate-500 mb-2" />
            <div className="text-xl font-bold">
              {daysSince(relationship.lastContactAt) !== null ? `${daysSince(relationship.lastContactAt)}d` : 'Never'}
            </div>
            <div className="text-sm text-slate-400">Since Contact</div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <MessageSquare className="w-6 h-6 text-slate-500 mb-2" />
            <div className="text-xl font-bold">{relationship.interactionCount}</div>
            <div className="text-sm text-slate-400">Interactions</div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <Calendar className="w-6 h-6 text-slate-500 mb-2" />
            <div className="text-xl font-bold">{relationship.followupCadenceDays}d</div>
            <div className="text-sm text-slate-400">Follow-up Cadence</div>
          </div>
        </div>

        <section className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <h2 className="font-semibold mb-4">Contact Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {emailLink && (
              <a href={emailLink} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition">
                <Mail className="w-5 h-5 text-blue-400" />
                <span>{relationship.email}</span>
              </a>
            )}
            {phoneLink && (
              <a href={phoneLink} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition">
                <Phone className="w-5 h-5 text-green-400" />
                <span>{relationship.phone}</span>
              </a>
            )}
            {relationship.company && (
              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                <Building2 className="w-5 h-5 text-slate-400" />
                <span>{relationship.company}</span>
              </div>
            )}
          </div>
        </section>

        <section className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              AI Relationship Summary
            </h2>
            <button
              onClick={generateSummary}
              disabled={generatingSummary}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium transition flex items-center gap-1"
            >
              {generatingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}
            </button>
          </div>
          {summary ? (
            <p className="text-slate-300">{summary}</p>
          ) : (
            <p className="text-slate-500">Click generate to create an AI summary of this relationship.</p>
          )}
        </section>

        {relationship.notes && (
          <section className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <h2 className="font-semibold mb-2">Notes</h2>
            <p className="text-slate-300">{relationship.notes}</p>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-4">Interaction History</h2>
          {interactions.length > 0 ? (
            <div className="space-y-3">
              {interactions.map((interaction) => {
                const Icon = INTERACTION_ICONS[interaction.type] || MessageSquare;
                return (
                  <div key={interaction.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${interaction.direction === 'outbound' ? 'bg-blue-500/20' : 'bg-slate-800'}`}>
                      <Icon className={`w-5 h-5 ${interaction.direction === 'outbound' ? 'text-blue-400' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium capitalize">{interaction.type}</span>
                        <span className="text-xs text-slate-500">
                          {interaction.direction === 'outbound' ? '→ Sent' : '← Received'}
                        </span>
                        <span className={`text-xs ${SENTIMENT_COLORS[interaction.sentiment]}`}>
                          {interaction.sentiment}
                        </span>
                      </div>
                      {interaction.subject && <p className="text-slate-300 mb-1">{interaction.subject}</p>}
                      {interaction.summary && <p className="text-sm text-slate-400">{interaction.summary}</p>}
                      <div className="text-xs text-slate-500 mt-2">{formatDate(interaction.occurredAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No interactions logged yet</p>
              <button
                onClick={() => setShowLogInteraction(true)}
                className="mt-3 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium transition"
              >
                Log First Interaction
              </button>
            </div>
          )}
        </section>

        <section className="grid grid-cols-4 gap-3">
          {emailLink && (
            <a href={emailLink} className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center hover:border-slate-700 transition">
              <Mail className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <span className="text-sm">Email</span>
            </a>
          )}
          {phoneLink && (
            <a href={phoneLink} className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center hover:border-slate-700 transition">
              <Phone className="w-6 h-6 mx-auto mb-2 text-green-400" />
              <span className="text-sm">Call</span>
            </a>
          )}
          <button
            onClick={() => setShowLogInteraction(true)}
            className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center hover:border-slate-700 transition"
          >
            <Coffee className="w-6 h-6 mx-auto mb-2 text-orange-400" />
            <span className="text-sm">Log Meeting</span>
          </button>
          <button
            onClick={() => setShowLogInteraction(true)}
            className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center hover:border-slate-700 transition"
          >
            <FileText className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            <span className="text-sm">Add Note</span>
          </button>
        </section>
      </main>

      {showLogInteraction && (
        <LogInteractionModal onClose={() => setShowLogInteraction(false)} onSave={logInteraction} />
      )}
    </div>
  );
}

function LogInteractionModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => void }) {
  const [form, setForm] = useState({
    type: 'email',
    direction: 'outbound',
    subject: '',
    summary: '',
    sentiment: 'neutral',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Log Interaction</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
              >
                <option value="email">Email</option>
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
                <option value="message">Message</option>
                <option value="note">Note</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Direction</label>
              <select
                value={form.direction}
                onChange={(e) => setForm({ ...form, direction: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
              >
                <option value="outbound">Outbound (I sent)</option>
                <option value="inbound">Inbound (They sent)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Brief subject..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Summary</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="What was discussed..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500 h-24 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Sentiment</label>
            <div className="flex gap-2">
              {['positive', 'neutral', 'negative'].map((s) => (
                <button
                  key={s}
                  onClick={() => setForm({ ...form, sentiment: s })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    form.sentiment === s
                      ? s === 'positive'
                        ? 'bg-green-600 text-white'
                        : s === 'negative'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-medium transition flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
