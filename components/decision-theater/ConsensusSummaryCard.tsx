// Decision Theater - Consensus Summary Card Component
// components/decision-theater/ConsensusSummaryCard.tsx

'use client';

interface ConsensusSummaryProps {
  recommendation: string;
  summary: {
    mainArgumentsFor: string[];
    mainArgumentsAgainst: string[];
    keyTradeoffs: string[];
  };
  overallConfidence: number;
  votingBreakdown: Record<string, { stance: string; confidence: number }>;
}

const STANCE_COLORS: Record<string, string> = {
  strong_support: 'bg-green-100 text-green-800',
  support: 'bg-green-50 text-green-700',
  neutral: 'bg-gray-100 text-gray-700',
  concerned: 'bg-yellow-50 text-yellow-700',
  oppose: 'bg-orange-50 text-orange-700',
  block: 'bg-red-100 text-red-800',
};

const STANCE_LABELS: Record<string, string> = {
  strong_support: 'Strong Support',
  support: 'Support',
  neutral: 'Neutral',
  concerned: 'Concerned',
  oppose: 'Oppose',
  block: 'Block',
};

export function ConsensusSummaryCard({
  recommendation,
  summary,
  overallConfidence,
  votingBreakdown,
}: ConsensusSummaryProps) {
  return (
    <div className="border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Council Suggests</h2>
        <p className="text-lg text-gray-800 font-medium">{recommendation}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-500">Confidence:</span>
          <span className="text-sm font-semibold text-blue-700">
            {Math.round(overallConfidence * 100)}%
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {summary.mainArgumentsFor && summary.mainArgumentsFor.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-green-700 mb-2">Arguments For</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {summary.mainArgumentsFor.map((arg, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>{arg}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.mainArgumentsAgainst && summary.mainArgumentsAgainst.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-red-700 mb-2">Arguments Against</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {summary.mainArgumentsAgainst.map((arg, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>{arg}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.keyTradeoffs && summary.keyTradeoffs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-orange-700 mb-2">Key Tradeoffs</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {summary.keyTradeoffs.map((tradeoff, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">↔</span>
                  <span>{tradeoff}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {Object.keys(votingBreakdown).length > 0 && (
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Council Votes</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(votingBreakdown).map(([role, vote]) => {
                const stanceColor = STANCE_COLORS[vote.stance] || STANCE_COLORS.neutral;
                const stanceLabel = STANCE_LABELS[vote.stance] || vote.stance;
                return (
                  <span
                    key={role}
                    className={`text-xs px-2 py-1 rounded ${stanceColor}`}
                    title={`${role}: ${Math.round(vote.confidence * 100)}% confidence`}
                  >
                    {role}: {stanceLabel}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


