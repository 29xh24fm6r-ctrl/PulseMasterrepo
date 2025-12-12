// Decision Theater - Council Member Card Component
// components/decision-theater/CouncilMemberCard.tsx

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CouncilMemberCardProps {
  roleId: string;
  displayName: string;
  stance: string;
  confidence: number;
  recommendation: string;
  rationale: {
    upside?: string[];
    risks?: string[];
    keyFactors?: string[];
  };
  suggestedConditions?: string[];
}

const STANCE_COLORS: Record<string, string> = {
  strong_support: 'bg-green-100 text-green-800 border-green-300',
  support: 'bg-green-50 text-green-700 border-green-200',
  neutral: 'bg-gray-100 text-gray-700 border-gray-300',
  concerned: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  oppose: 'bg-orange-50 text-orange-700 border-orange-200',
  block: 'bg-red-100 text-red-800 border-red-300',
};

const STANCE_LABELS: Record<string, string> = {
  strong_support: 'Strong Support',
  support: 'Support',
  neutral: 'Neutral',
  concerned: 'Concerned',
  oppose: 'Oppose',
  block: 'Block',
};

const ROLE_ICONS: Record<string, string> = {
  strategist: '🎯',
  ethnographer: '🌍',
  relational: '💝',
  financial: '💰',
  health: '🏥',
  identity: '🪞',
  destiny: '🔮',
  ethics: '⚖️',
};

export function CouncilMemberCard({
  roleId,
  displayName,
  stance,
  confidence,
  recommendation,
  rationale,
  suggestedConditions,
}: CouncilMemberCardProps) {
  const [expanded, setExpanded] = useState(false);

  const stanceColor = STANCE_COLORS[stance] || STANCE_COLORS.neutral;
  const stanceLabel = STANCE_LABELS[stance] || stance;
  const roleIcon = ROLE_ICONS[roleId] || '👤';

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{roleIcon}</span>
          <div>
            <h3 className="font-semibold text-sm">{displayName}</h3>
            <span className={`text-xs px-2 py-1 rounded border ${stanceColor}`}>
              {stanceLabel}
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600"
        >
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      <p className="text-sm text-gray-700 mb-3">{recommendation}</p>

      <div className="mb-2">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Confidence</span>
          <span>{Math.round(confidence * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-4">
          {rationale.upside && rationale.upside.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-green-700 mb-2">Upside</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                {rationale.upside.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">+</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rationale.risks && rationale.risks.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-red-700 mb-2">Risks</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                {rationale.risks.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">⚠</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rationale.keyFactors && rationale.keyFactors.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-blue-700 mb-2">Key Factors</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                {rationale.keyFactors.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {suggestedConditions && suggestedConditions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-purple-700 mb-2">Conditions</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                {suggestedConditions.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-purple-500 mt-1">→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


