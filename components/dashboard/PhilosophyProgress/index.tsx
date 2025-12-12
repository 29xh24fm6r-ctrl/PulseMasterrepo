interface PhilosophyProgressProps {
  activePath?: string;
  currentBelt?: string;
  practicesCompleted?: number;
  practicesTotal?: number;
  loading?: boolean;
}

export default function PhilosophyProgress({
  activePath = "None",
  currentBelt = "White",
  practicesCompleted = 0,
  practicesTotal = 0,
  loading = false
}: PhilosophyProgressProps) {
  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Philosophy Progress</h2>
        <div className="text-center py-8">
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const progress = practicesTotal > 0 ? (practicesCompleted / practicesTotal) * 100 : 0;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Philosophy Progress</h2>
      <div className="space-y-4">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Active Path</p>
          <p className="text-base font-medium text-white">{activePath}</p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500">Current Belt</span>
            <span className="text-xs px-2 py-1 bg-zinc-800 text-zinc-300 rounded-full">
              {currentBelt}
            </span>
          </div>
        </div>
        {practicesTotal > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-500">Practices This Week</span>
              <span className="text-xs font-medium text-zinc-300">
                {practicesCompleted} / {practicesTotal}
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-violet-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}





