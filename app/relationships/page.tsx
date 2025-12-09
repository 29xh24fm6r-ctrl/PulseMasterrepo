'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Heart,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Phone,
  Mail,
  Building2,
  Loader2,
  TrendingUp,
  TrendingDown,
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
  tags: string[];
}

interface Insight {
  relationshipId: string;
  name: string;
  type: string;
  message: string;
  suggestedAction?: string;
  priority: string;
}

const IMPORTANCE_COLORS: Record<string, string> = {
  vip: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  key: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  normal: 'bg-slate-700 text-slate-300 border-slate-600',
  low: 'bg-slate-800 text-slate-400 border-slate-700',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  colleague: '👔 Colleague',
  client: '💼 Client',
  prospect: '🎯 Prospect',
  vendor: '🏢 Vendor',
  personal: '👋 Personal',
  mentor: '🎓 Mentor',
  mentee: '📚 Mentee',
};

export default function RelationshipsPage() {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [relRes, insightRes] = await Promise.all([
        fetch('/api/relationships'),
        fetch('/api/relationships?mode=insights'),
      ]);
      const relData = await relRes.json();
      const insightData = await insightRes.json();
      setRelationships(relData.relationships || []);
      setInsights(insightData.insights || []);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }

  async function recalculateHealth() {
    await fetch('/api/relationships?mode=recalculate');
    loadData();
  }

  const filteredRelationships = relationships.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'needs-attention' && r.healthScore >= 50) return false;
    if (filter === 'vip' && r.importance !== 'vip') return false;
    if (filter === 'key' && r.importance !== 'key') return false;
    return true;
  });

  const stats = {
    total: relationships.length,
    healthy: relationships.filter((r) => r.healthScore >= 70).length,
    needsAttention: relationships.filter((r) => r.healthScore < 50).length,
    vip: relationships.filter((r) => r.importance === 'vip').length,
  };

  function getHealthColor(score: number): string {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 30) return 'text-orange-400';
    return 'text-red-400';
  }

  function getHealthBg(score: number): string {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  }

  function daysSince(dateStr?: string): number | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
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
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/life" className="p-2 hover:bg-slate-800 rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Relationships</h1>
                <p className="text-sm text-slate-400">{stats.total} connections</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg font-medium flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-slate-400">Total</div>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-2xl font-bold text-green-400">{stats.healthy}</div>
            <div className="text-sm text-slate-400">Healthy</div>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-2xl font-bold text-orange-400">{stats.needsAttention}</div>
            <div className="text-sm text-slate-400">Need Attention</div>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-2xl font-bold text-yellow-400">{stats.vip}</div>
            <div className="text-sm text-slate-400">VIP</div>
          </div>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Needs Attention
            </h2>
            <div className="space-y-2">
              {insights.slice(0, 5).map((insight) => (
                <Link
                  key={insight.relationshipId}
                  href={`/relationships/${insight.relationshipId}`}
                  className="p-4 bg-slate-900 border border-orange-500/20 rounded-xl flex items-center justify-between hover:border-orange-500/40 transition"
                >
                  <div>
                    <div className="font-medium">{insight.name}</div>
                    <div className="text-sm text-slate-400">{insight.message}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Search & Filter */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search relationships..."
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-violet-500"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'needs-attention', 'vip', 'key'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f === 'all' ? null : f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  (f === 'all' && !filter) || filter === f
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {f === 'all' ? 'All' : f === 'needs-attention' ? '⚠️ Attention' : f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Relationships List */}
        <div className="space-y-2">
          {filteredRelationships.map((rel) => (
            <Link
              key={rel.id}
              href={`/relationships/${rel.id}`}
              className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-4 hover:border-slate-700 transition"
            >
              {/* Health Score */}
              <div className="relative w-12 h-12 flex-shrink-0">
                <svg className="w-12 h-12 -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-slate-800"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={`${rel.healthScore * 1.26} 126`}
                    className={getHealthColor(rel.healthScore)}
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${getHealthColor(rel.healthScore)}`}>
                  {rel.healthScore}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{rel.name}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full border ${IMPORTANCE_COLORS[rel.importance]}`}>
                    {rel.importance.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-slate-400 flex items-center gap-3 mt-1">
                  {rel.company && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {rel.company}
                    </span>
                  )}
                  <span>{RELATIONSHIP_LABELS[rel.relationship] || rel.relationship}</span>
                </div>
              </div>

              {/* Last Contact */}
              <div className="text-right flex-shrink-0">
                <div className="text-sm">
                  {daysSince(rel.lastContactAt) !== null ? (
                    <span className={daysSince(rel.lastContactAt)! > 30 ? 'text-orange-400' : 'text-slate-400'}>
                      {daysSince(rel.lastContactAt)}d ago
                    </span>
                  ) : (
                    <span className="text-slate-500">Never</span>
                  )}
                </div>
                <div className="text-xs text-slate-500">{rel.interactionCount} interactions</div>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-600 flex-shrink-0" />
            </Link>
          ))}

          {filteredRelationships.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No relationships found
            </div>
          )}
        </div>
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <AddRelationshipModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function AddRelationshipModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    relationship: 'colleague',
    importance: 'normal',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    try {
      await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      onSaved();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Add Relationship</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
            />
            <input
              type="text"
              placeholder="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <select
              value={form.relationship}
              onChange={(e) => setForm({ ...form, relationship: e.target.value })}
              className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
            >
              <option value="colleague">Colleague</option>
              <option value="client">Client</option>
              <option value="prospect">Prospect</option>
              <option value="vendor">Vendor</option>
              <option value="personal">Personal</option>
              <option value="mentor">Mentor</option>
              <option value="mentee">Mentee</option>
            </select>
            <select
              value={form.importance}
              onChange={(e) => setForm({ ...form, importance: e.target.value })}
              className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="key">Key</option>
              <option value="vip">VIP</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-medium transition flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}