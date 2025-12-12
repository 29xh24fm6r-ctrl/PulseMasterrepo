// Decision Theater - What-If Replay Component
// components/decision-theater/WhatIfReplay.tsx

'use client';

import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';

interface WhatIfReplayProps {
  sessionId: string;
  defaultRecommendation?: string;
}

export function WhatIfReplay({ sessionId, defaultRecommendation }: WhatIfReplayProps) {
  const [horizon, setHorizon] = useState('1_year');
  const [mode, setMode] = useState<'retro' | 'prospective'>('prospective');
  const [alternateAssumption, setAlternateAssumption] = useState(
    defaultRecommendation || 'Follow the council recommendation fully.'
  );
  const [baseAssumptionOverride, setBaseAssumptionOverride] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/what-if/from-council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          mode,
          horizon,
          alternateAssumption,
          baseAssumptionOverride: baseAssumptionOverride || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to simulate');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to simulate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 bg-white">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">What-If Replay</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Horizon
          </label>
          <select
            value={horizon}
            onChange={(e) => setHorizon(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="6_months">6 Months</option>
            <option value="1_year">1 Year</option>
            <option value="3_years">3 Years</option>
            <option value="5_years">5 Years</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mode
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'retro' | 'prospective')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="prospective">Going Forward</option>
            <option value="retro">Looking Back</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alternate Assumption *
          </label>
          <textarea
            value={alternateAssumption}
            onChange={(e) => setAlternateAssumption(e.target.value)}
            placeholder="What if I follow the council recommendation fully?"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Base Assumption (Optional)
          </label>
          <textarea
            value={baseAssumptionOverride}
            onChange={(e) => setBaseAssumptionOverride(e.target.value)}
            placeholder="What if I don't follow the council? (defaults to current plan)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <button
          onClick={handleSimulate}
          disabled={loading || !alternateAssumption.trim()}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Simulating...
            </>
          ) : (
            <>
              <Play size={16} />
              Simulate Timelines
            </>
          )}
        </button>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        {result && (
          <div className="mt-6 space-y-6">
            {/* Side-by-side comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Baseline */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-2">Baseline Path</h4>
                {result.narrativeBaseline && (
                  <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                    {result.narrativeBaseline}
                  </p>
                )}
                {result.metricsBaseline && (
                  <div className="text-xs text-gray-600">
                    <div className="font-semibold mb-1">Metrics:</div>
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(result.metricsBaseline, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Alternate */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <h4 className="font-semibold text-gray-900 mb-2">Alternate Path</h4>
                {result.narrativeAlternate && (
                  <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                    {result.narrativeAlternate}
                  </p>
                )}
                {result.metricsAlternate && (
                  <div className="text-xs text-gray-600">
                    <div className="font-semibold mb-1">Metrics:</div>
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(result.metricsAlternate, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Key Differences */}
            {result.highlightDifferences && result.highlightDifferences.length > 0 && (
              <div className="border rounded-lg p-4 bg-yellow-50">
                <h4 className="font-semibold text-gray-900 mb-3">Key Differences</h4>
                <ul className="space-y-2">
                  {result.highlightDifferences.map((diff: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-yellow-600 mt-1">•</span>
                      <span>{diff}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Deltas */}
            {result.deltas && (
              <div className="border rounded-lg p-4 bg-white">
                <h4 className="font-semibold text-gray-900 mb-3">Tradeoffs</h4>
                {result.deltas.betterDomains && result.deltas.betterDomains.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-semibold text-green-700 mb-1">Better Domains:</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {result.deltas.betterDomains.map((domain: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-500 mt-1">+</span>
                          <span>{domain}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.deltas.worseDomains && result.deltas.worseDomains.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-semibold text-red-700 mb-1">Worse Domains:</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {result.deltas.worseDomains.map((domain: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-red-500 mt-1">-</span>
                          <span>{domain}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.deltas.keyTradeoffs && result.deltas.keyTradeoffs.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-orange-700 mb-1">Key Tradeoffs:</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {result.deltas.keyTradeoffs.map((tradeoff: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-orange-500 mt-1">↔</span>
                          <span>{tradeoff}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


