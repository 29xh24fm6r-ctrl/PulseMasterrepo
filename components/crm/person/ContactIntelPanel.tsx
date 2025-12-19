"use client";

import { Brain, Lightbulb, AlertTriangle } from "lucide-react";

interface ContactIntelPanelProps {
  ai: any;
  facts: any[];
  sources?: Array<{
    id: string;
    title: string;
    source_url: string;
    source_type: string;
    match_score: number;
    match_evidence: any;
    published_at?: string;
  }>;
}

export function ContactIntelPanel({ ai, facts, sources = [] }: ContactIntelPanelProps) {
  return (
    <div className="space-y-6">
      {/* AI Summary */}
      {ai.summary && (
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-semibold text-gray-300">AI Summary</h3>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{ai.summary}</p>
        </div>
      )}

      {/* Key Facts */}
      {facts.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-gray-300">Key Facts</h3>
          </div>
          <div className="space-y-2">
            {facts.map((fact, i) => (
              <div key={i} className="text-sm text-gray-300">
                <span className="text-gray-500">•</span> {fact.fact}
                {fact.category && (
                  <span className="ml-2 text-xs text-gray-500">({fact.category})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Actions */}
      {ai.suggestedActions && ai.suggestedActions.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-300">Suggested Actions</h3>
          </div>
          <div className="space-y-2">
            {ai.suggestedActions.map((action: any, i: number) => (
              <div key={i} className="text-sm text-gray-300">
                <div className="font-medium">{action.action || action}</div>
                {action.reason && (
                  <div className="text-xs text-gray-500 mt-1">{action.reason}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Intel Sources */}
      {sources.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-gray-300">Discovered Sources</h3>
            <span className="text-xs text-gray-500">({sources.length})</span>
          </div>
          <div className="space-y-3">
            {sources.map((source) => {
              const confidence = source.match_score >= 80 ? 'verified' :
                                source.match_score >= 60 ? 'probable' : 'unverified';
              const confidenceColor = confidence === 'verified' ? 'text-green-400' :
                                     confidence === 'probable' ? 'text-yellow-400' : 'text-gray-400';
              
              return (
                <div key={source.id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <a
                      href={source.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-white hover:text-purple-400 transition-colors flex-1"
                    >
                      {source.title}
                    </a>
                    <span className={`text-xs px-2 py-0.5 rounded ${confidenceColor} bg-slate-800`}>
                      {source.match_score}% match
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="capitalize">{source.source_type}</span>
                    {source.published_at && (
                      <>
                        <span>•</span>
                        <span>{new Date(source.published_at).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                  {source.match_evidence?.reasons && source.match_evidence.reasons.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      <span className="font-medium">Match evidence:</span> {source.match_evidence.reasons.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!ai.summary && facts.length === 0 && (!ai.suggestedActions || ai.suggestedActions.length === 0) && sources.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No intelligence data yet</p>
        </div>
      )}
    </div>
  );
}

