'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Check,
  Plus,
  Edit3,
  Trash2,
  Sparkles,
  MessageSquare,
  Volume2,
  Loader2,
  ChevronRight,
} from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  description?: string;
  tone: string;
  verbosity: string;
  traits: string[];
  systemPrompt: string;
  isDefault: boolean;
  isActive: boolean;
}

interface PersonaTemplate {
  id: string;
  name: string;
  description: string;
  tone: string;
  verbosity: string;
  traits: string[];
}

const TONE_LABELS: Record<string, { label: string; color: string }> = {
  formal: { label: '📋 Formal', color: 'bg-slate-600' },
  casual: { label: '😊 Casual', color: 'bg-green-600' },
  friendly: { label: '👋 Friendly', color: 'bg-blue-600' },
  professional: { label: '💼 Professional', color: 'bg-violet-600' },
  motivational: { label: '🔥 Motivational', color: 'bg-orange-600' },
};

const VERBOSITY_LABELS: Record<string, string> = {
  concise: 'Brief & Direct',
  balanced: 'Balanced',
  detailed: 'Thorough & Detailed',
};

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [templates, setTemplates] = useState<PersonaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [personasRes, templatesRes] = await Promise.all([
        fetch('/api/personas'),
        fetch('/api/personas?mode=templates'),
      ]);
      const personasData = await personasRes.json();
      const templatesData = await templatesRes.json();
      setPersonas(personasData.personas || []);
      setTemplates(templatesData.templates || []);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }

  async function activatePersona(personaId: string) {
    setActivating(personaId);
    try {
      await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', personaId }),
      });
      loadData();
    } catch (err) {
      console.error('Failed to activate:', err);
    } finally {
      setActivating(null);
    }
  }

  async function deletePersona(personaId: string) {
    if (!confirm('Delete this persona?')) return;
    try {
      await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', personaId }),
      });
      loadData();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }

  async function createFromTemplate(templateId: string) {
    try {
      await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });
      setShowCreate(false);
      loadData();
    } catch (err) {
      console.error('Failed to create:', err);
    }
  }

  const activePersona = personas.find((p) => p.isActive);

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
              <div className="p-2 bg-violet-600 rounded-lg">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Butler Personas</h1>
                <p className="text-sm text-slate-400">Customize how Pulse communicates</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg font-medium flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Add Persona
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Active Persona */}
        {activePersona && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              Active Persona
            </h2>
            <div className="p-6 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/30 rounded-xl">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1">{activePersona.name}</h3>
                  <p className="text-slate-400 mb-4">{activePersona.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${TONE_LABELS[activePersona.tone]?.color || 'bg-slate-700'}`}>
                      {TONE_LABELS[activePersona.tone]?.label || activePersona.tone}
                    </span>
                    <span className="px-3 py-1 bg-slate-700 rounded-full text-sm">
                      {VERBOSITY_LABELS[activePersona.verbosity] || activePersona.verbosity}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm">
                  <Check className="w-4 h-4" /> Active
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="text-sm text-slate-400 mb-2">Traits</div>
                <div className="flex flex-wrap gap-2">
                  {activePersona.traits.map((trait) => (
                    <span key={trait} className="px-2 py-1 bg-slate-800 rounded text-sm">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* All Personas */}
        <section>
          <h2 className="text-lg font-semibold mb-4">All Personas</h2>
          <div className="grid gap-4">
            {personas.map((persona) => (
              <div
                key={persona.id}
                className={`p-4 bg-slate-900 border rounded-xl transition ${
                  persona.isActive ? 'border-violet-500/50' : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{persona.name}</h3>
                      {persona.isDefault && (
                        <span className="px-2 py-0.5 text-xs bg-slate-700 rounded">Default</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mb-3">{persona.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${TONE_LABELS[persona.tone]?.color || 'bg-slate-700'}`}>
                        {persona.tone}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-700 rounded text-xs">
                        {persona.verbosity}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!persona.isActive && (
                      <button
                        onClick={() => activatePersona(persona.id)}
                        disabled={activating === persona.id}
                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium transition flex items-center gap-1"
                      >
                        {activating === persona.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Activate'
                        )}
                      </button>
                    )}
                    {persona.isActive && (
                      <span className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm">
                        Active
                      </span>
                    )}
                    {!persona.isDefault && (
                      <button
                        onClick={() => deletePersona(persona.id)}
                        className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Preview */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            Preview
          </h2>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-sm text-slate-400 mb-3">How Pulse will respond:</div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-slate-300">
                {activePersona?.verbosity === 'concise' && (
                  "Got it. Here's your schedule: 3 meetings, 2 focus blocks. Top priority: Q4 report."
                )}
                {activePersona?.verbosity === 'balanced' && (
                  "Good morning! You have a busy day ahead with 3 meetings and 2 focus blocks scheduled. Your top priority is completing the Q4 report. Would you like me to walk through the details?"
                )}
                {activePersona?.verbosity === 'detailed' && (
                  "Good morning! I've reviewed your calendar and tasks for today. Here's a comprehensive overview: You have 3 meetings scheduled (9am team sync, 11am client call, 2pm planning session), along with 2 protected focus blocks (10am-11am and 3pm-4pm). Based on your weekly goals, I'd recommend prioritizing the Q4 report during your morning focus block. Shall I break down each commitment in detail?"
                )}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Add Persona</h2>
            <p className="text-slate-400 mb-4">Choose a template to start with:</p>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => createFromTemplate(template.id)}
                  className="p-4 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{template.name}</h3>
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{template.description}</p>
                  <div className="flex gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${TONE_LABELS[template.tone]?.color || 'bg-slate-700'}`}>
                      {template.tone}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-700 rounded text-xs">
                      {template.verbosity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowCreate(false)}
              className="w-full mt-4 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}