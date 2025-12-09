interface Recommendation {
  id: string;
  text: string;
  priority?: "high" | "medium" | "low";
  category?: string;
  actionUrl?: string;
}

interface ButlerRecommendationsProps {
  recommendations?: Recommendation[];
  loading?: boolean;
}

export default function ButlerRecommendations({
  recommendations = [],
  loading = false
}: ButlerRecommendationsProps) {
  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Butler Recommendations</h2>
        <div className="text-center py-8">
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Butler Recommendations</h2>
        <span className="text-xs text-zinc-500">AI Suggestions</span>
      </div>
      {recommendations.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-zinc-500 text-sm">No recommendations at this time</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recommendations.map((recommendation) => (
            <div 
              key={recommendation.id}
              className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 flex items-start gap-3"
            >
              <span className="text-amber-400 mt-0.5">💡</span>
              <div className="flex-1">
                <p className="text-sm text-zinc-300">{recommendation.text}</p>
                {recommendation.priority && (
                  <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded ${
                    recommendation.priority === "high" ? "bg-red-500/20 text-red-400" :
                    recommendation.priority === "medium" ? "bg-amber-500/20 text-amber-400" :
                    "bg-zinc-700 text-zinc-400"
                  }`}>
                    {recommendation.priority}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

