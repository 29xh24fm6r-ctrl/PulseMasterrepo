'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Send, 
  ChevronRight, 
  Mail,
  MessageSquare,
  FileText,
  Check,
  X,
  Loader2,
  Eye
} from 'lucide-react';

interface DelegatedDraft {
  id: string;
  type: 'email' | 'message' | 'note';
  target?: string;
  subject?: string;
  body: string;
  status: string;
  createdAt: string;
}

function getTypeConfig(type: string) {
  switch (type) {
    case 'email':
      return { icon: Mail, color: 'text-blue-400', label: 'Email' };
    case 'message':
      return { icon: MessageSquare, color: 'text-emerald-400', label: 'Message' };
    case 'note':
      return { icon: FileText, color: 'text-amber-400', label: 'Note' };
    default:
      return { icon: Send, color: 'text-zinc-400', label: type };
  }
}

function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

export default function DelegationWidget() {
  const [drafts, setDrafts] = useState<DelegatedDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    try {
      const res = await fetch('/api/delegation/drafts?status=pending&limit=3');
      const data = await res.json();
      if (data.drafts) {
        setDrafts(data.drafts);
      }
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const updateStatus = async (id: string, status: 'approved' | 'discarded') => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/delegation/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      if (res.ok) {
        setDrafts(prev => prev.filter(d => d.id !== id));
      }
    } catch (error) {
      console.error('Failed to update draft:', error);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">Pending Drafts</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">Pending Drafts</h3>
          {drafts.length > 0 && (
            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
              {drafts.length}
            </span>
          )}
        </div>
        <Link 
          href="/delegation" 
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {drafts.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-2xl mb-2">✉️</div>
          <p className="text-sm text-zinc-400">
            No pending drafts to review
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map(draft => {
            const config = getTypeConfig(draft.type);
            const Icon = config.icon;
            const isUpdating = updating === draft.id;

            return (
              <div 
                key={draft.id} 
                className="p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${config.color}`}>
                    <Icon className="w-4 h-4" />
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
                    </div>
                    {draft.subject && (
                      <h4 className="font-medium text-sm text-white mb-1">
                        {draft.subject}
                      </h4>
                    )}
                    <p className="text-xs text-zinc-400 line-clamp-2">
                      {truncate(draft.body, 100)}
                    </p>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-3 ml-7">
                  <Link
                    href={`/delegation?id=${draft.id}`}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-700/50 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    Review
                  </Link>
                  <button
                    onClick={() => updateStatus(draft.id, 'approved')}
                    disabled={isUpdating}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(draft.id, 'discarded')}
                    disabled={isUpdating}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-700/50 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
