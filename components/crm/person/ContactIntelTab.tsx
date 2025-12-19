"use client";

import { useState, useEffect } from "react";
import { Brain, CheckCircle, AlertCircle, FileText, Clock, ExternalLink, X, Check } from "lucide-react";

interface IntelData {
  sources: {
    verified: Array<{
      id: string;
      source_type: string;
      url: string;
      title: string | null;
      snippet: string | null;
      match_confidence: number;
      match_status: string;
      published_at: string | null;
      created_at: string;
    }>;
    uncertain: Array<{
      id: string;
      source_type: string;
      url: string;
      title: string | null;
      snippet: string | null;
      match_confidence: number;
      match_status: string;
      published_at: string | null;
      created_at: string;
    }>;
  };
  claims: Array<{
    id: string;
    category: string;
    claim: string;
    source_url: string;
    confidence: number;
    created_at: string;
  }>;
  runs: Array<{
    id: string;
    started_at: string;
    completed_at: string | null;
    status: string;
    sources_added: number;
    claims_added: number;
  }>;
}

interface ContactIntelTabProps {
  contactId: string;
}

export function ContactIntelTab({ contactId }: ContactIntelTabProps) {
  const [data, setData] = useState<IntelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadIntel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/intel/contact/${contactId}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error || "Failed to load intel");
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || "Failed to load intel data");
      console.error("Failed to load intel:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntel();
  }, [contactId]);

  const handleConfirmSource = async (sourceId: string) => {
    try {
      const res = await fetch(`/api/intel/source/${sourceId}/confirm`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to confirm source");
      setNotification({ type: "success", message: "Source confirmed" });
      setTimeout(() => setNotification(null), 3000);
      loadIntel();
    } catch (e: any) {
      setNotification({ type: "error", message: e.message || "Failed to confirm source" });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleRejectSource = async (sourceId: string) => {
    try {
      const res = await fetch(`/api/intel/source/${sourceId}/reject`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reject source");
      setNotification({ type: "success", message: "Source rejected" });
      setTimeout(() => setNotification(null), 3000);
      loadIntel();
    } catch (e: any) {
      setNotification({ type: "error", message: e.message || "Failed to reject source" });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-purple-400 animate-pulse" />
          <p className="text-gray-400">Loading intelligence data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg">
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold">Error</span>
        </div>
        <p className="text-sm text-gray-400">{error}</p>
        <button
          onClick={loadIntel}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>No intelligence data available</p>
      </div>
    );
  }

  const allEmpty =
    data.sources.verified.length === 0 &&
    data.sources.uncertain.length === 0 &&
    data.claims.length === 0 &&
    data.runs.length === 0;

  if (allEmpty) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="mb-2">No intelligence data yet</p>
        <p className="text-sm text-gray-600">Run intelligence gathering to discover sources and claims</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-lg border ${
          notification.type === "success"
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Verified Sources */}
      {data.sources.verified.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h3 className="text-sm font-semibold text-gray-300">Verified Sources</h3>
            <span className="text-xs text-gray-500">({data.sources.verified.length})</span>
          </div>
          <div className="space-y-3">
            {data.sources.verified.map((source) => (
              <div key={source.id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-white hover:text-purple-400 transition-colors flex-1"
                  >
                    {source.title || source.url}
                    <ExternalLink className="w-3 h-3 inline ml-1" />
                  </a>
                  <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                    {source.match_confidence}% match
                  </span>
                </div>
                {source.snippet && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{source.snippet}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="capitalize">{source.source_type}</span>
                  {source.published_at && (
                    <>
                      <span>•</span>
                      <span>{new Date(source.published_at).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uncertain Sources */}
      {data.sources.uncertain.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <h3 className="text-sm font-semibold text-gray-300">Uncertain Sources (Needs Review)</h3>
            <span className="text-xs text-gray-500">({data.sources.uncertain.length})</span>
          </div>
          <div className="space-y-3">
            {data.sources.uncertain.map((source) => (
              <div key={source.id} className="p-3 bg-slate-900/50 rounded-lg border border-yellow-500/20">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-white hover:text-purple-400 transition-colors flex-1"
                  >
                    {source.title || source.url}
                    <ExternalLink className="w-3 h-3 inline ml-1" />
                  </a>
                  <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                    {source.match_confidence}% match
                  </span>
                </div>
                {source.snippet && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{source.snippet}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleConfirmSource(source.id)}
                    className="text-xs px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Confirm
                  </button>
                  <button
                    onClick={() => handleRejectSource(source.id)}
                    className="text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claims */}
      {data.claims.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-300">Claims</h3>
            <span className="text-xs text-gray-500">({data.claims.length})</span>
          </div>
          <div className="space-y-3">
            {data.claims.map((claim) => (
              <div key={claim.id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <div className="text-sm text-white">{claim.claim}</div>
                    <div className="text-xs text-gray-500 mt-1 capitalize">{claim.category}</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                    {claim.confidence}% confidence
                  </span>
                </div>
                <a
                  href={claim.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-1 mt-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  View source
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Runs */}
      {data.runs.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-semibold text-gray-300">Recent Runs</h3>
            <span className="text-xs text-gray-500">({data.runs.length})</span>
          </div>
          <div className="space-y-2">
            {data.runs.map((run) => (
              <div key={run.id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white">
                    {new Date(run.started_at).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{run.sources_added} sources</span>
                    <span>•</span>
                    <span>{run.claims_added} claims</span>
                    <span className={`px-2 py-0.5 rounded ${
                      run.status === "completed" ? "bg-green-500/20 text-green-400" :
                      run.status === "failed" ? "bg-red-500/20 text-red-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {run.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

