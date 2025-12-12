// Decision Theater - Session View Page
// app/decision-theater/session/[sessionId]/page.tsx

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCouncilSession, useCreateDossier } from '@/lib/hooks/decisionTheater';
import { CouncilMemberCard } from '@/components/decision-theater/CouncilMemberCard';
import { ConsensusSummaryCard } from '@/components/decision-theater/ConsensusSummaryCard';
import { RiskProfileChart } from '@/components/decision-theater/RiskProfileChart';
import { DecisionCaptureDialog } from '@/components/decision-theater/DecisionCaptureDialog';
import { WhatIfReplay } from '@/components/decision-theater/WhatIfReplay';

export default function DecisionTheaterSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const { session, consensus, opinions, loading, error } = useCouncilSession(sessionId);
  const { createDossier, pending: savingDossier } = useCreateDossier();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogChoice, setDialogChoice] = useState<'follow' | 'other' | 'undecided'>('follow');

  const handleSaveDecision = async (params: {
    decisionLabel: string;
    userChoice: string;
    userNotes?: string;
  }) => {
    if (!sessionId) return;
    await createDossier({
      sessionId,
      decisionLabel: params.decisionLabel,
      userChoice: params.userChoice,
      userNotes: params.userNotes,
    });
    router.push('/decision-theater/dossiers');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading council session...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Failed to load session: {error || 'Session not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Decision Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/decision-theater')}
            className="text-blue-600 hover:text-blue-800 mb-4 text-sm"
          >
            ← Back to Decision Theater
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{session.topic}</h1>
          <p className="text-lg text-gray-700 mb-4">{session.question}</p>
          <div className="flex gap-3">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              {session.timescale || 'quarter'}
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
              {Math.round((session.importance || 0.5) * 100)}% importance
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              {new Date(session.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Main Content: Council & Consensus */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left: Council Table */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Council Table</h2>
            <div className="space-y-4">
              {opinions.map((opinion) => (
                <CouncilMemberCard
                  key={opinion.memberRoleId}
                  roleId={opinion.memberRoleId}
                  displayName={opinion.displayName}
                  stance={opinion.stance}
                  confidence={opinion.confidence}
                  recommendation={opinion.recommendation}
                  rationale={opinion.rationale}
                  suggestedConditions={opinion.suggestedConditions}
                />
              ))}
            </div>
          </div>

          {/* Right: Decision Synthesis */}
          <div className="space-y-6">
            {consensus && (
              <>
                <ConsensusSummaryCard
                  recommendation={consensus.consensus_recommendation}
                  summary={consensus.summary || {}}
                  overallConfidence={consensus.overall_confidence}
                  votingBreakdown={consensus.voting_breakdown || {}}
                />

                {consensus.risk_profile && (
                  <RiskProfileChart
                    shortTerm={consensus.risk_profile.shortTerm || 'low'}
                    longTerm={consensus.risk_profile.longTerm || 'low'}
                    relational={consensus.risk_profile.relational || 'low'}
                    financial={consensus.risk_profile.financial || 'low'}
                    health={consensus.risk_profile.health || 'low'}
                  />
                )}

                <div className="border rounded-lg p-4 bg-white">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Your Decision</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setDialogChoice('follow');
                        setDialogOpen(true);
                      }}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      I Will Follow This
                    </button>
                    <button
                      onClick={() => {
                        setDialogChoice('other');
                        setDialogOpen(true);
                      }}
                      className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                    >
                      I Will Do Something Else
                    </button>
                    <button
                      onClick={() => {
                        setDialogChoice('undecided');
                        setDialogOpen(true);
                      }}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Still Deciding
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* What-If Replay Section */}
        <div className="mt-6">
          <WhatIfReplay
            sessionId={sessionId}
            defaultRecommendation={consensus?.consensus_recommendation}
          />
        </div>

        {/* Context & Notes Panel */}
        {session.context && Object.keys(session.context).length > 0 && (
          <div className="border rounded-lg p-4 bg-white mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Context & Notes</h3>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap">
              {JSON.stringify(session.context, null, 2)}
            </pre>
          </div>
        )}

        <DecisionCaptureDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleSaveDecision}
          defaultRecommendation={consensus?.consensus_recommendation}
          choiceType={dialogChoice}
        />
      </div>
    </div>
  );
}

