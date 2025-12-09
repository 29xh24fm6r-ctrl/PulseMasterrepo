interface MemoryHighlightsProps {
  daySummary?: string;
  keyMoments?: string[];
  emotionalTrend?: string | null;
  loading?: boolean;
}

export default function MemoryHighlights({
  daySummary = "",
  keyMoments = [],
  emotionalTrend = null,
  loading = false
}: MemoryHighlightsProps) {
  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Memory Highlights</h2>
        <div className="text-center py-8">
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Memory Highlights</h2>
      <div className="space-y-4">
        {daySummary && (
          <div>
            <p className="text-xs text-zinc-500 mb-2">Today's Summary</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{daySummary}</p>
          </div>
        )}
        {keyMoments.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 mb-2">Key Moments</p>
            <ul className="space-y-1">
              {keyMoments.map((moment, idx) => (
                <li key={idx} className="text-sm text-zinc-400 flex items-start">
                  <span className="text-violet-400 mr-2">•</span>
                  <span>{moment}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {emotionalTrend && (
          <div className="pt-2 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 mb-1">Emotional Trend</p>
            <p className="text-sm text-zinc-300">{emotionalTrend}</p>
          </div>
        )}
      </div>
    </div>
  );
}

