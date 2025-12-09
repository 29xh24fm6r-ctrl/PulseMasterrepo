interface IdentityInsightsProps {
  primaryRole?: string;
  clarity?: number;
  alignment?: number;
  loading?: boolean;
}

export default function IdentityInsights({
  primaryRole = "Unknown",
  clarity = 0,
  alignment = 0,
  loading = false
}: IdentityInsightsProps) {
  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Identity Insights</h2>
        <div className="text-center py-8">
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Identity Insights</h2>
      <div className="space-y-4">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Primary Role</p>
          <p className="text-base font-medium text-white">{primaryRole}</p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-500">Clarity</span>
            <span className="text-xs font-medium text-zinc-300">
              {Math.round(clarity * 100)}%
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div 
              className="h-2 rounded-full bg-violet-500"
              style={{ width: `${clarity * 100}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-500">Alignment</span>
            <span className="text-xs font-medium text-zinc-300">
              {Math.round(alignment * 100)}%
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div 
              className="h-2 rounded-full bg-emerald-500"
              style={{ width: `${alignment * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

