// Decision Theater - Risk Profile Chart Component
// components/decision-theater/RiskProfileChart.tsx

'use client';

interface RiskProfileProps {
  shortTerm: 'low' | 'medium' | 'high';
  longTerm: 'low' | 'medium' | 'high';
  relational: 'low' | 'medium' | 'high';
  financial: 'low' | 'medium' | 'high';
  health: 'low' | 'medium' | 'high';
}

const RISK_VALUES: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

const RISK_LABELS: Record<string, string> = {
  shortTerm: 'Short-Term',
  longTerm: 'Long-Term',
  relational: 'Relationships',
  financial: 'Financial',
  health: 'Health',
};

export function RiskProfileChart({
  shortTerm,
  longTerm,
  relational,
  financial,
  health,
}: RiskProfileProps) {
  const risks = [
    { label: RISK_LABELS.shortTerm, value: shortTerm },
    { label: RISK_LABELS.longTerm, value: longTerm },
    { label: RISK_LABELS.relational, value: relational },
    { label: RISK_LABELS.financial, value: financial },
    { label: RISK_LABELS.health, value: health },
  ];

  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Risk Profile</h3>
      <div className="space-y-3">
        {risks.map((risk) => {
          const riskValue = RISK_VALUES[risk.value];
          const riskColor = RISK_COLORS[risk.value];
          const widthPercent = (riskValue / 3) * 100;

          return (
            <div key={risk.label}>
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>{risk.label}</span>
                <span className="font-medium capitalize">{risk.value}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${riskColor} h-2 rounded-full transition-all`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


