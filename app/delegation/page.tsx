'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Send, 
  Mail,
  MessageSquare,
  FileText,
  Check,
  X,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Plus,
  Edit3,
  Copy,
  Trash2
} from 'lucide-react';

interface DelegatedDraft {
  id: string;
  type: 'email' | 'message' | 'note';
  target?: string;
  subject?: string;
  body: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = 'pending' | 'approved' | 'sent' | 'discarded' | 'all';

function getTypeConfig(type: string) {
  switch (type) {
    case 'email':
      return { 
        icon: Mail, 
        color: 'text-blue-400', 
        bg: 'bg-blue-500/10 border-blue-500/30',
        label: 'Email' 
      };
    case 'message':
      return { 
        icon: MessageSquare, 
        color: 'text-emerald-400', 
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        label: 'Message' 
      };
    case 'note':
      return { 
        icon: FileText, 
        color: 'text-amber-400', 
        bg: 'bg-amber-500/10 border-amber-500/30',
        label: 'Note' 
      };
    default:
      return { 
        icon: Send, 
        color: 'text-zinc-400', 
        bg: 'bg-zinc-500/10 border-zinc-500/30',
        label: type 
      };
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
    }
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
  });
}

function DelegationPageContent() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

  const [drafts, setDrafts] = useState<DelegatedDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [selectedDraft, setSelectedDraft] = useState<DelegatedDraft | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  const fetchDrafts = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const statusParam = filter === 'all' ? '' : `status=${filter}&`;
      const res = await fetch(`/api/delegation/drafts?${statusParam}limit=50`);
      const data = await res.json();
      if (data.drafts) {
        setDrafts(data.drafts);
        
        // Auto-select if ID in URL
        if (selectedId) {
          const found = data.drafts.find((d: DelegatedDraft) => d.id === selectedId);
          if (found) {
            setSelectedDraft(found);
            setEditSubject(found.subject || '');
            setEditBody(found.body);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, selectedId]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const selectDraft = (draft: DelegatedDraft) => {
    setSelectedDraft(draft);
    setEditSubject(draft.subject || '');
    setEditBody(draft.body);
    setEditMode(false);
  };

  const updateStatus = async (id: string, status: 'approved' | 'discarded' | 'sent') => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/delegation/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      if (res.ok) {
        setDrafts(prev => prev.map(d => 
          d.id === id ? { ...d, status } : d
        ));
        if (filter !== 'all' && filter !== status) {
          setDrafts(prev => prev.filter(d => d.id !== id));
        }
        if (selectedDraft?.id === id) {
          setSelectedDraft({ ...selectedDraft, status });
        }
      }
    } catch (error) {
      console.error('Failed to update draft:', error);
    } finally {
      setUpdating(null);
    }
  };

  const saveEdit = async () => {
    if (!selectedDraft) return;
    setUpdating(selectedDraft.id);
    
    try {
      const res = await fetch(`/api/delegation/drafts/${selectedDraft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subject: editSubject,
          body: editBody,
        }),
      });
      
      if (res.ok) {
        const updated = { 
          ...selectedDraft, 
          subject: editSubject, 
          body: editBody,
          status: 'edited' as const
        };
        setSelectedDraft(updated);
        setDrafts(prev => prev.map(d => 
          d.id === selectedDraft.id ? updated : d
        ));
        setEditMode(false);
      }
    } catch (error) {
      console.error('Failed to save edit:', error);
    } finally {
      setUpdating(null);
    }
  };

  const deleteDraft = async (id: string) => {
    if (!confirm('Delete this draft?')) return;
    setUpdating(id);
    
    try {
      const res = await fetch(`/api/delegation/drafts/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setDrafts(prev => prev.filter(d => d.id !== id));
        if (selectedDraft?.id === id) {
          setSelectedDraft(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete draft:', error);
    } finally {
      setUpdating(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  const tabs: { key: StatusFilter; label: string; emoji: string }[] = [
    { key: 'pending', label: 'Pending', emoji: '📝' },
    { key: 'approved', label: 'Approved', emoji: '✅' },
    { key: 'sent', label: 'Sent', emoji: '📤' },
    { key: 'discarded', label: 'Discarded', emoji: '🗑️' },
    { key: 'all', label: 'All', emoji: '📋' },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/life" 
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <Send className="w-6 h-6 text-blue-400" />
                <h1 className="text-xl font-bold">Delegation</h1>
              </div>
            </div>
            <button
              onClick={() => fetchDrafts(true)}
              disabled={refreshing}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                  filter === tab.key
                    ? 'border-blue-400 text-white'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                <span>{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Drafts List */}
            <div className="space-y-3">
              {drafts.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-4xl mb-4">📭</div>
                  <h2 className="text-xl font-semibold mb-2">
                    No {filter === 'all' ? '' : filter} drafts
                  </h2>
                  <p className="text-zinc-400">
                    Pulse will create drafts based on your insights and actions.
                  </p>
                </div>
              ) : (
                drafts.map(draft => {
                  const config = getTypeConfig(draft.type);
                  const Icon = config.icon;
                  const isSelected = selectedDraft?.id === draft.id;

                  return (
                    <button
                      key={draft.id}
                      onClick={() => selectDraft(draft)}
                      className={`w-full p-4 border rounded-xl text-left transition-all ${config.bg} ${
                        isSelected ? 'ring-2 ring-blue-500' : 'hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${config.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${config.color}`}>
                              {config.label}
                            </span>
                            {draft.target && (
                              <span className="text-xs text-zinc-500">
                                to {draft.target}
                              </span>
                            )}
                            <span className="text-xs text-zinc-500 ml-auto">
                              {formatDate(draft.createdAt)}
                            </span>
                          </div>
                          {draft.subject && (
                            <h4 className="font-medium text-sm text-white mb-1 truncate">
                              {draft.subject}
                            </h4>
                          )}
                          <p className="text-sm text-zinc-400 line-clamp-2">
                            {draft.body}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Draft Preview/Editor */}
            {selectedDraft && (
              <div className="lg:sticky lg:top-24 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-fit">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const config = getTypeConfig(selectedDraft.type);
                      const Icon = config.icon;
                      return (
                        <>
                          <Icon className={`w-5 h-5 ${config.color}`} />
                          <span className={`text-sm font-medium ${config.color}`}>
                            {config.label}
                          </span>
                        </>
                      );
                    })()}
                    {selectedDraft.target && (
                      <span className="text-sm text-zinc-400">
                        to {selectedDraft.target}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 capitalize px-2 py-1 bg-zinc-800 rounded">
                    {selectedDraft.status}
                  </span>
                </div>

                {editMode ? (
                  <div className="space-y-4">
                    {selectedDraft.type === 'email' && (
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Subject</label>
                        <input
                          type="text"
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Content</label>
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={12}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={updating === selectedDraft.id}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {updating === selectedDraft.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditMode(false);
                          setEditSubject(selectedDraft.subject || '');
                          setEditBody(selectedDraft.body);
                        }}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {selectedDraft.subject && (
                      <h3 className="text-lg font-semibold mb-3">
                        {selectedDraft.subject}
                      </h3>
                    )}
                    <div className="prose prose-invert prose-sm max-w-none mb-6">
                      <pre className="whitespace-pre-wrap font-sans text-zinc-300 bg-transparent p-0">
                        {selectedDraft.body}
                      </pre>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-zinc-800">
                      {selectedDraft.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateStatus(selectedDraft.id, 'approved')}
                            disabled={updating === selectedDraft.id}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => setEditMode(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium"
                          >
                            <Edit3 className="w-4 h-4" />
                            Edit
                          </button>
                        </>
                      )}
                      {(selectedDraft.status === 'approved' || selectedDraft.status === 'edited') && (
                        <button
                          onClick={() => updateStatus(selectedDraft.id, 'sent')}
                          disabled={updating === selectedDraft.id}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                          Mark Sent
                        </button>
                      )}
                      <button
                        onClick={() => copyToClipboard(selectedDraft.body)}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                      {selectedDraft.status !== 'sent' && (
                        <button
                          onClick={() => updateStatus(selectedDraft.id, 'discarded')}
                          disabled={updating === selectedDraft.id}
                          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          Discard
                        </button>
                      )}
                      <button
                        onClick={() => deleteDraft(selectedDraft.id)}
                        disabled={updating === selectedDraft.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium disabled:opacity-50 ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function DelegationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>}>
      <DelegationPageContent />
    </Suspense>
  );
}
